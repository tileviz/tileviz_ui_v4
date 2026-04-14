// ============================================================
//  UploadTileModal — Tile upload with bottom-sheet source
//  picker, full-screen image review, and inline edit tools.
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
  ScrollView, Image, Platform, ActivityIndicator, Dimensions,
  SafeAreaView,
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
const { width: SW, height: SH } = Dimensions.get('window');

export function UploadTileModal({ visible, onClose, onUploaded }: Props) {
  const { user } = useAuthStore();

  // ── Form state ──────────────────────────────────────────────
  const [imageUri,    setImageUri]    = useState<string | null>(null);
  const [tileName,    setTileName]    = useState('');
  const [category,    setCategory]    = useState('marble');
  const [roomType,    setRoomType]    = useState('bathroom');
  const [sizeW,       setSizeW]       = useState('12');
  const [sizeH,       setSizeH]       = useState('12');
  const [mfr,         setMfr]         = useState('');
  const [price,       setPrice]       = useState('0');
  const [uploading,   setUploading]   = useState(false);
  const [err,         setErr]         = useState('');

  // ── Source-picker bottom sheet ──────────────────────────────
  const [showPicker, setShowPicker] = useState(false);

  // ── Full-screen review state ────────────────────────────────
  const [showReview,    setShowReview]    = useState(false);
  const [reviewUri,     setReviewUri]     = useState<string | null>(null);
  const [originalUri,   setOriginalUri]   = useState<string | null>(null);
  const [editMode,      setEditMode]      = useState(false);
  const [rotation,      setRotation]      = useState(0);
  const [processing,    setProcessing]    = useState(false);

  // ── Source picker actions ───────────────────────────────────

  async function openCamera() {
    setShowPicker(false);
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
        openReview(res.assets[0].uri);
      }
    } catch {
      showAlert('Not Available', 'Camera is not available on this device.');
    }
  }

  async function openGallery() {
    setShowPicker(false);
    try {
      const IP = require('expo-image-picker');
      const { status } = await IP.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Needed', 'Allow photo library access to select tile images.');
        return;
      }
      const res = await IP.launchImageLibraryAsync({
        mediaTypes: IP.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });
      if (!res.canceled && res.assets[0]) {
        openReview(res.assets[0].uri);
      }
    } catch {
      showAlert('Not Available', 'Gallery is not available on this device.');
    }
  }

  async function openFiles() {
    setShowPicker(false);
    try {
      const DP = require('expo-document-picker');
      const res = await DP.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/webp'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets?.[0]) {
        openReview(res.assets[0].uri);
      }
    } catch {
      // Fallback to gallery if expo-document-picker not available
      openGallery();
    }
  }

  // ── Review helpers ──────────────────────────────────────────

  function openReview(uri: string) {
    setReviewUri(uri);
    setOriginalUri(uri);
    setRotation(0);
    setEditMode(false);
    setShowReview(true);
  }

  async function handleRotate() {
    if (!originalUri) return;
    setProcessing(true);
    try {
      const IM = require('expo-image-manipulator');
      const next = (rotation + 90) % 360;
      const result = await IM.manipulateAsync(
        originalUri,
        [{ rotate: next }],
        { compress: 0.9, format: IM.SaveFormat.JPEG }
      );
      setReviewUri(result.uri);
      setRotation(next);
    } catch { /* ignore */ } finally {
      setProcessing(false);
    }
  }

  async function handleCropSquare() {
    if (!reviewUri) return;
    setProcessing(true);
    try {
      const IM = require('expo-image-manipulator');
      const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
        Image.getSize(reviewUri, (w, h) => resolve({ width: w, height: h }), () => resolve({ width: 500, height: 500 }));
      });
      const size = Math.min(width, height);
      const originX = Math.floor((width - size) / 2);
      const originY = Math.floor((height - size) / 2);
      const result = await IM.manipulateAsync(
        reviewUri,
        [{ crop: { originX, originY, width: size, height: size } }],
        { compress: 0.9, format: IM.SaveFormat.JPEG }
      );
      setReviewUri(result.uri);
      setOriginalUri(result.uri); // Crop is destructive — update base
    } catch { /* ignore */ } finally {
      setProcessing(false);
    }
  }

  function handleResetImage() {
    if (!originalUri) return;
    setReviewUri(originalUri);
    setRotation(0);
  }

  function confirmReview() {
    if (!reviewUri) return;
    setImageUri(reviewUri);
    setShowReview(false);
    setEditMode(false);
  }

  function discardReview() {
    setShowReview(false);
    setReviewUri(null);
    setOriginalUri(null);
    setEditMode(false);
  }

  // ── Upload ──────────────────────────────────────────────────

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
    setUploading(true); setErr('');
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
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
          fd.append('image', blob, `tile.${ext}`);
        } else {
          const ext = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
          fd.append('image', { uri: imageUri, name: `tile.${ext}`, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` } as any);
        }
      }

      await uploadTile(fd);
      const msg = user?.role === 'sales_person'
        ? 'Tile submitted for approval.' : 'Tile uploaded to catalog.';
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
    setImageUri(null); setTileName(''); setCategory('marble'); setRoomType('bathroom');
    setSizeW('12'); setSizeH('12'); setMfr(''); setPrice('0'); setErr('');
    setShowPicker(false); setShowReview(false); setReviewUri(null); setOriginalUri(null);
    setEditMode(false); setRotation(0);
    onClose();
  }

  // ────────────────────────────────────────────────────────────
  //  Render
  // ────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Main upload modal ── */}
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

              {/* ── Image area ── */}
              {imageUri ? (
                /* Confirmed image preview with tap-to-change */
                <TouchableOpacity
                  style={s.previewZone}
                  onPress={() => setShowPicker(true)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: imageUri }} style={s.previewImg} resizeMode="cover" />
                  <View style={s.previewOverlay}>
                    <Text style={s.previewChangeTxt}>✏️  Tap to change image</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                /* Empty upload zone */
                <TouchableOpacity style={s.uploadZone} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
                  <Text style={{ fontSize: 36, marginBottom: 10 }}>📷</Text>
                  <Text style={s.uploadZoneTitle}>Tap to add tile photo</Text>
                  <Text style={s.uploadZoneHint}>Camera · Gallery · Files</Text>
                  <Text style={s.uploadZoneHint}>JPG / PNG · Max 5 MB</Text>
                </TouchableOpacity>
              )}

              {/* ── Form fields ── */}
              <FormInput
                label="Tile Name *"
                placeholder="e.g. Carrara Marble"
                value={tileName}
                onChangeText={setTileName}
              />

              <Text style={s.fieldLabel}>Room Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {ROOM_TYPES.map(r => (
                  <TouchableOpacity key={r.key} onPress={() => setRoomType(r.key)}
                    style={[s.chip, roomType === r.key && s.chipActive]}>
                    <Text style={[{ fontSize: 12, fontWeight: '500', color: Colors.text2 },
                      roomType === r.key && { color: Colors.accent }]}>
                      {r.icon} {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.fieldLabel}>Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {CATS.map(c => (
                  <TouchableOpacity key={c} onPress={() => setCategory(c)}
                    style={[s.chip, category === c && s.chipActive]}>
                    <Text style={[{ fontSize: 12, fontWeight: '500', color: Colors.text2 },
                      category === c && { color: Colors.accent }]}>
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
                <FormInput label="Price/sq ft (₹)" placeholder="0" keyboardType="numeric" value={price} onChangeText={setPrice} containerStyle={{ flex: 1 }} />
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

      {/* ── Source-picker bottom sheet ── */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <Pressable style={s.sheetOverlay} onPress={() => setShowPicker(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            {/* Drag handle */}
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Add photo</Text>
            <View style={s.sheetOptions}>
              <TouchableOpacity style={s.sheetOption} onPress={openCamera} activeOpacity={0.7}>
                <View style={[s.sheetIconWrap, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                  <Text style={s.sheetIcon}>📷</Text>
                </View>
                <Text style={s.sheetOptionLabel}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.sheetOption} onPress={openGallery} activeOpacity={0.7}>
                <View style={[s.sheetIconWrap, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                  <Text style={s.sheetIcon}>🖼️</Text>
                </View>
                <Text style={s.sheetOptionLabel}>Photos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.sheetOption} onPress={openFiles} activeOpacity={0.7}>
                <View style={[s.sheetIconWrap, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                  <Text style={s.sheetIcon}>📁</Text>
                </View>
                <Text style={s.sheetOptionLabel}>Files</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.sheetCancel} onPress={() => setShowPicker(false)} activeOpacity={0.7}>
              <Text style={s.sheetCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Full-screen image review ── */}
      <Modal visible={showReview} transparent={false} animationType="fade" onRequestClose={discardReview}>
        <View style={s.reviewScreen}>
          {/* Image fills the screen */}
          <Image
            source={{ uri: reviewUri ?? undefined }}
            style={s.reviewImage}
            resizeMode="contain"
          />

          {/* Processing overlay */}
          {processing && (
            <View style={s.processingOverlay}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={s.processingTxt}>Processing…</Text>
            </View>
          )}

          {/* Edit toolbar — visible only in edit mode */}
          {editMode && (
            <View style={s.editToolbar}>
              <TouchableOpacity style={s.editTool} onPress={handleRotate} disabled={processing}>
                <Text style={s.editToolIcon}>🔄</Text>
                <Text style={s.editToolLabel}>Rotate 90°</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.editTool} onPress={handleCropSquare} disabled={processing}>
                <Text style={s.editToolIcon}>⬜</Text>
                <Text style={s.editToolLabel}>Crop Square</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.editTool} onPress={handleResetImage} disabled={processing}>
                <Text style={s.editToolIcon}>↩️</Text>
                <Text style={s.editToolLabel}>Reset</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom action bar */}
          <SafeAreaView style={s.reviewBar}>
            {/* X — discard / cancel */}
            <TouchableOpacity style={s.reviewBtnCircle} onPress={discardReview} activeOpacity={0.8}>
              <Text style={s.reviewBtnX}>✕</Text>
            </TouchableOpacity>

            {/* Edit toggle */}
            <TouchableOpacity
              style={[s.reviewBtnEdit, editMode && s.reviewBtnEditActive]}
              onPress={() => setEditMode(v => !v)}
              activeOpacity={0.8}
            >
              <Text style={[s.reviewBtnEditTxt, editMode && { color: Colors.primary }]}>
                {editMode ? '✓ Done' : '✏️ Edit'}
              </Text>
            </TouchableOpacity>

            {/* ✓ — confirm image */}
            <TouchableOpacity style={s.reviewBtnCircle} onPress={confirmReview} disabled={processing} activeOpacity={0.8}>
              <Text style={s.reviewBtnTick}>✓</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

// ── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  // Main modal
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

  // Upload zone (empty)
  uploadZone: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.border,
    borderRadius: Radii.lg, paddingVertical: 36, paddingHorizontal: 20,
    alignItems: 'center', marginBottom: 14, backgroundColor: Colors.surface,
  },
  uploadZoneTitle: { fontSize: 14, fontWeight: '600', color: Colors.text1, marginBottom: 4 },
  uploadZoneHint:  { fontSize: 11, color: Colors.text3, marginTop: 2 },

  // Confirmed preview
  previewZone: {
    height: 160, borderRadius: Radii.lg, overflow: 'hidden',
    marginBottom: 14, borderWidth: 1, borderColor: Colors.border,
  },
  previewImg: { width: '100%', height: '100%' },
  previewOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 7, alignItems: 'center',
  },
  previewChangeTxt: { fontSize: 12, color: '#fff', fontWeight: '500' },

  // Form fields
  fieldLabel: { fontSize: 12, fontWeight: '500', color: Colors.text2, marginBottom: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipActive: { borderColor: Colors.accent, backgroundColor: `${Colors.accent}18` },

  // ── Bottom sheet picker ──────────────────────────────────────
  sheetOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1c1c2e',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32, paddingTop: 12,
    paddingHorizontal: 24,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.55)',
    textAlign: 'center', marginBottom: 20,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  sheetOptions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  sheetOption: { alignItems: 'center', gap: 8 },
  sheetIconWrap: {
    width: 68, height: 68, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sheetIcon: { fontSize: 28 },
  sheetOptionLabel: { fontSize: 12, color: '#fff', fontWeight: '500' },
  sheetCancel: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  sheetCancelTxt: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // ── Full-screen review ───────────────────────────────────────
  reviewScreen: {
    flex: 1, backgroundColor: '#000', position: 'relative',
  },
  reviewImage: {
    position: 'absolute', top: 0, left: 0,
    width: SW, height: SH,
  },
  processingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center',
  },
  processingTxt: { color: '#fff', fontSize: 13, marginTop: 10, fontWeight: '500' },

  // Edit toolbar (above the bar)
  editToolbar: {
    position: 'absolute', bottom: 110, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 12, paddingHorizontal: 20,
  },
  editTool: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  editToolIcon:  { fontSize: 20, marginBottom: 3 },
  editToolLabel: { fontSize: 10, color: '#fff', fontWeight: '600' },

  // Bottom action bar
  reviewBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 32, paddingBottom: 32, paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  reviewBtnCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(40,40,60,0.85)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  reviewBtnX:    { fontSize: 20, color: '#fff', fontWeight: '300' },
  reviewBtnTick: { fontSize: 24, color: '#fff', fontWeight: '300' },
  reviewBtnEdit: {
    paddingHorizontal: 22, paddingVertical: 11, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  reviewBtnEditActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  reviewBtnEditTxt: { fontSize: 14, color: '#fff', fontWeight: '600' },
});
