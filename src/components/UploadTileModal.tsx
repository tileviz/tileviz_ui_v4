// ============================================================
//  UploadTileModal — Tile upload with camera, gallery, and
//  inline image editing (crop/rotate) before upload.
//  Uses toast notifications instead of blocking alerts.
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
  ScrollView, Image, Platform, ActivityIndicator,
} from 'react-native';
import { Colors, Radii, Shadows } from '../config/theme';
import { FormInput } from './FormInput';
import { Button } from './Button';
import { useAuthStore } from '../store/auth.store';
import { uploadTile } from '../api/tiles';
import { ROOM_TYPES } from '../config';
import { showAlert } from '../utils/alert';

interface Props { visible: boolean; onClose: () => void; onUploaded?: () => void; }

const CATS = ['marble', 'ceramic', 'stone', 'mosaic', 'wood'] as const;

export function UploadTileModal({ visible, onClose, onUploaded }: Props) {
  const { user } = useAuthStore();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [originalUri, setOriginalUri] = useState<string | null>(null);
  const [tileName, setTileName] = useState('');
  const [category, setCategory] = useState('marble');
  const [roomType, setRoomType] = useState('bathroom');
  const [sizeW, setSizeW] = useState('12');
  const [sizeH, setSizeH] = useState('12');
  const [mfr, setMfr] = useState('');
  const [price, setPrice] = useState('0');
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rotation, setRotation] = useState(0);

  // ── Image picking ──────────────────────────────────────────

  async function pickFromGallery() {
    try {
      const IP = require('expo-image-picker');
      const { status } = await IP.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Needed', 'Allow photo library access to select tile images.');
        return;
      }
      const res = await IP.launchImageLibraryAsync({
        mediaTypes: IP.MediaTypeOptions.Images,
        allowsEditing: false, // We handle editing ourselves
        quality: 0.9,
      });
      if (!res.canceled && res.assets[0]) {
        setOriginalUri(res.assets[0].uri);
        setImageUri(res.assets[0].uri);
        setShowEditPanel(true);
        setRotation(0);
      }
    } catch (e) {
      showAlert('Not Available', 'Image picker is not available on this platform.');
    }
  }

  async function takePhoto() {
    try {
      const IP = require('expo-image-picker');
      const { status } = await IP.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Needed', 'Allow camera access to take tile photos.');
        return;
      }
      const res = await IP.launchCameraAsync({
        mediaTypes: IP.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });
      if (!res.canceled && res.assets[0]) {
        setOriginalUri(res.assets[0].uri);
        setImageUri(res.assets[0].uri);
        setShowEditPanel(true);
        setRotation(0);
      }
    } catch (e) {
      showAlert('Not Available', 'Camera is not available on this platform.');
    }
  }

  // ── Image editing ──────────────────────────────────────────

  async function handleRotate() {
    if (!originalUri) return;
    setEditing(true);
    try {
      const IM = require('expo-image-manipulator');
      const newRotation = (rotation + 90) % 360;
      const result = await IM.manipulateAsync(
        originalUri,
        [{ rotate: newRotation }],
        { compress: 0.9, format: IM.SaveFormat.JPEG }
      );
      setImageUri(result.uri);
      setRotation(newRotation);
    } catch (e) {
      console.warn('Rotate failed:', e);
    } finally {
      setEditing(false);
    }
  }

  async function handleCropSquare() {
    if (!imageUri) return;
    setEditing(true);
    try {
      const IM = require('expo-image-manipulator');
      // Get image dimensions to crop to center square
      const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
        Image.getSize(imageUri, (w, h) => resolve({ width: w, height: h }), () => resolve({ width: 500, height: 500 }));
      });
      const size = Math.min(width, height);
      const originX = Math.floor((width - size) / 2);
      const originY = Math.floor((height - size) / 2);

      const result = await IM.manipulateAsync(
        imageUri,
        [{ crop: { originX, originY, width: size, height: size } }],
        { compress: 0.9, format: IM.SaveFormat.JPEG }
      );
      setImageUri(result.uri);
      setOriginalUri(result.uri); // Update original to cropped version
    } catch (e) {
      console.warn('Crop failed:', e);
    } finally {
      setEditing(false);
    }
  }

  async function handleResetImage() {
    if (!originalUri) return;
    setImageUri(originalUri);
    setRotation(0);
  }

  function confirmImage() {
    setShowEditPanel(false);
  }

  // ── Validation & Submit ────────────────────────────────────

  function validate(): string | null {
    if (!tileName.trim()) return 'Tile name is required';
    if (isNaN(parseFloat(sizeW)) || parseFloat(sizeW) <= 0) return 'Invalid width';
    if (isNaN(parseFloat(sizeH)) || parseFloat(sizeH) <= 0) return 'Invalid height';
    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) return 'Invalid price';
    return null;
  }

  async function handleSubmit() {
    const ve = validate();
    if (ve) { setErr(ve); return; }
    setUploading(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('name', tileName.trim());
      fd.append('category', category);
      fd.append('roomType', roomType);
      fd.append('sizeWidth', sizeW);
      fd.append('sizeHeight', sizeH);
      fd.append('manufacturer', mfr);
      fd.append('pricePerSqFt', price);
      fd.append('pattern', 'solid');
      fd.append('color', '#cccccc');

      if (imageUri) {
        if (Platform.OS === 'web') {
          // On web, React Native's { uri, name, type } object is not understood
          // by the browser's FormData. We must fetch the image as a Blob first.
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
          fd.append('image', blob, `tile.${ext}`);
        } else {
          // On native (iOS / Android), React Native's fetch / axios handles
          // the { uri, name, type } file descriptor natively.
          const ext = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
          fd.append('image', {
            uri: imageUri,
            name: `tile.${ext}`,
            type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          } as any);
        }
      }

      await uploadTile(fd);
      const msg = user?.role === 'sales_person'
        ? 'Tile submitted for approval.'
        : 'Tile uploaded to catalog.';
      showAlert('✅ Success', msg);
      onUploaded?.();
      handleClose();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function handleClose() {
    setImageUri(null); setOriginalUri(null); setTileName(''); setCategory('marble'); setRoomType('bathroom');
    setSizeW('12'); setSizeH('12'); setMfr(''); setPrice('0'); setErr('');
    setShowEditPanel(false); setRotation(0);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={s.overlay} onPress={handleClose}>
        <Pressable style={s.card} onPress={() => {}}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTxt}>📷 Upload New Tile</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={{ fontSize: 16, color: Colors.text3, paddingHorizontal: 4 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 18 }} showsVerticalScrollIndicator={false}>
            {user?.role === 'sales_person' && (
              <View style={s.spNotice}>
                <Text style={{ fontSize: 12, color: '#60A5FA' }}>
                  ⏳ Your upload will be sent for Shop Owner approval.
                </Text>
              </View>
            )}

            {/* ── Image Section ── */}
            {!imageUri || showEditPanel ? (
              <>
                {/* Image picker — two options: Camera + Gallery */}
                {!imageUri ? (
                  <View style={s.uploadZone}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>📷</Text>
                    <Text style={{ fontSize: 13, color: Colors.text2, marginBottom: 12, textAlign: 'center' }}>
                      Choose how to add your tile photo
                    </Text>
                    <View style={s.pickerButtons}>
                      <TouchableOpacity style={s.pickerBtn} onPress={takePhoto} activeOpacity={0.7}>
                        <Text style={s.pickerBtnIcon}>📸</Text>
                        <Text style={s.pickerBtnLabel}>Camera</Text>
                        <Text style={s.pickerBtnHint}>Take a photo</Text>
                      </TouchableOpacity>
                      <View style={s.pickerDivider} />
                      <TouchableOpacity style={s.pickerBtn} onPress={pickFromGallery} activeOpacity={0.7}>
                        <Text style={s.pickerBtnIcon}>🖼️</Text>
                        <Text style={s.pickerBtnLabel}>Gallery</Text>
                        <Text style={s.pickerBtnHint}>Choose existing</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 11, color: Colors.text3, marginTop: 8 }}>JPG / PNG · Max 5 MB</Text>
                  </View>
                ) : (
                  /* ── Image Edit Panel ── */
                  <View style={s.editPanel}>
                    <View style={s.editPreviewWrap}>
                      <Image source={{ uri: imageUri }} style={s.editPreviewImg} resizeMode="contain" />
                      {editing && (
                        <View style={s.editingOverlay}>
                          <ActivityIndicator color="#fff" size="small" />
                          <Text style={{ color: '#fff', fontSize: 11, marginTop: 4 }}>Processing...</Text>
                        </View>
                      )}
                    </View>

                    {/* Edit controls */}
                    <View style={s.editControls}>
                      <TouchableOpacity style={s.editBtn} onPress={handleRotate} disabled={editing}>
                        <Text style={s.editBtnIcon}>🔄</Text>
                        <Text style={s.editBtnLabel}>Rotate 90°</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.editBtn} onPress={handleCropSquare} disabled={editing}>
                        <Text style={s.editBtnIcon}>⬜</Text>
                        <Text style={s.editBtnLabel}>Crop Square</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.editBtn} onPress={handleResetImage} disabled={editing}>
                        <Text style={s.editBtnIcon}>↩️</Text>
                        <Text style={s.editBtnLabel}>Reset</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Confirm / Retake */}
                    <View style={s.editActions}>
                      <TouchableOpacity
                        style={s.retakeBtn}
                        onPress={() => { setImageUri(null); setOriginalUri(null); setShowEditPanel(false); }}
                      >
                        <Text style={s.retakeBtnTx}>📷 Retake</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.confirmBtn} onPress={confirmImage} disabled={editing}>
                        <Text style={s.confirmBtnTx}>✓ Use This Image</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            ) : (
              /* ── Confirmed image preview ── */
              <TouchableOpacity
                style={[s.uploadZone, s.uploadZoneWithImg]}
                onPress={() => setShowEditPanel(true)}
                activeOpacity={0.8}
              >
                <View style={s.previewWrap}>
                  <Image source={{ uri: imageUri }} style={s.previewImg} resizeMode="cover" />
                  <View style={s.previewOverlay}>
                    <Text style={s.previewChangeTxt}>✏️  Tap to edit image</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            <FormInput
              label="Tile Name *"
              placeholder="e.g. Carrara Marble"
              value={tileName}
              onChangeText={setTileName}
            />

            <Text style={s.fieldLabel}>Room Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {ROOM_TYPES.map(r => (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => setRoomType(r.key)}
                  style={[s.chip, roomType === r.key && s.chipActive]}
                >
                  <Text style={[
                    { fontSize: 12, fontWeight: '500', color: Colors.text2 },
                    roomType === r.key && { color: Colors.accent },
                  ]}>
                    {r.icon} {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {CATS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[s.chip, category === c && s.chipActive]}
                >
                  <Text style={[
                    { fontSize: 12, fontWeight: '500', color: Colors.text2 },
                    category === c && { color: Colors.accent },
                  ]}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <FormInput label="Width (in)" placeholder="12" keyboardType="numeric" value={sizeW} onChangeText={setSizeW} containerStyle={{ flex: 1 }} />
              <FormInput label="Height (in)" placeholder="12" keyboardType="numeric" value={sizeH} onChangeText={setSizeH} containerStyle={{ flex: 1 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <FormInput label="Manufacturer" placeholder="e.g. Luxstone" value={mfr} onChangeText={setMfr} containerStyle={{ flex: 1 }} />
              <FormInput label="Price/sq ft ($)" placeholder="0" keyboardType="numeric" value={price} onChangeText={setPrice} containerStyle={{ flex: 1 }} />
            </View>

            {err ? <Text style={{ fontSize: 12, color: Colors.danger, marginBottom: 10 }}>{err}</Text> : null}

            <Button
              label={uploading ? 'Uploading…' : '📷 Upload to Catalog'}
              onPress={handleSubmit}
              loading={uploading}
              fullWidth
            />
            <View style={{ height: 20 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(10,10,20,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  card: {
    backgroundColor: Colors.white, borderRadius: 14, width: '100%',
    maxWidth: 440, maxHeight: '88%',
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadows.modal,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTxt: { fontSize: 14, fontWeight: '500', color: Colors.text1 },
  spNotice: {
    backgroundColor: 'rgba(59,130,246,0.08)', borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)', borderRadius: Radii.md, padding: 10, marginBottom: 14,
  },
  // Upload zone
  uploadZone: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.border,
    borderRadius: Radii.lg, padding: 20, alignItems: 'center',
    marginBottom: 14, backgroundColor: Colors.surface, overflow: 'hidden',
  },
  uploadZoneWithImg: { padding: 0, borderStyle: 'solid' },
  // Picker buttons (Camera / Gallery)
  pickerButtons: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  pickerBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  pickerBtnIcon: { fontSize: 24, marginBottom: 4 },
  pickerBtnLabel: { fontSize: 13, fontWeight: '600', color: Colors.text1 },
  pickerBtnHint: { fontSize: 10, color: Colors.text3, marginTop: 2 },
  pickerDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  // Edit panel
  editPanel: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: Colors.surface,
  },
  editPreviewWrap: {
    width: '100%',
    height: 200,
    backgroundColor: '#1a1a2e',
    position: 'relative',
  },
  editPreviewImg: {
    width: '100%',
    height: '100%',
  },
  editingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editControls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  editBtn: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editBtnIcon: { fontSize: 16, marginBottom: 2 },
  editBtnLabel: { fontSize: 10, fontWeight: '600', color: Colors.text2 },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  retakeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  retakeBtnTx: { fontSize: 12, fontWeight: '600', color: Colors.text2 },
  confirmBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radii.md,
    backgroundColor: Colors.gold,
  },
  confirmBtnTx: { fontSize: 12, fontWeight: '700', color: '#fff' },
  // Preview (after confirming edit)
  previewWrap: { width: '100%', height: 150, position: 'relative' },
  previewImg: { width: '100%', height: '100%' },
  previewOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 7,
    alignItems: 'center',
  },
  previewChangeTxt: { fontSize: 12, color: '#fff', fontWeight: '500' },
  // Form fields
  fieldLabel: { fontSize: 12, fontWeight: '500', color: Colors.text2, marginBottom: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipActive: { borderColor: Colors.accent, backgroundColor: `${Colors.accent}18` },
});
