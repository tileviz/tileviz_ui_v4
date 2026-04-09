// UploadTileModal — multipart tile upload with real image preview
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
  ScrollView, Alert, Image, Platform,
} from 'react-native';
import { Colors, Radii, Shadows } from '../config/theme';
import { FormInput } from './FormInput';
import { Button } from './Button';
import { useAuthStore } from '../store/auth.store';
import { uploadTile } from '../api/tiles';
import { ROOM_TYPES } from '../config';

interface Props { visible: boolean; onClose: () => void; onUploaded?: () => void; }

const CATS = ['marble', 'ceramic', 'stone', 'mosaic', 'wood'] as const;

export function UploadTileModal({ visible, onClose, onUploaded }: Props) {
  const { user } = useAuthStore();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [tileName, setTileName] = useState('');
  const [category, setCategory] = useState('marble');
  const [roomType, setRoomType] = useState('bathroom');
  const [sizeW, setSizeW] = useState('12');
  const [sizeH, setSizeH] = useState('12');
  const [mfr, setMfr] = useState('');
  const [price, setPrice] = useState('0');
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  async function pickImage() {
    try {
      const IP = require('expo-image-picker');
      const { status } = await IP.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo library access.');
        return;
      }
      const res = await IP.launchImageLibraryAsync({
        mediaTypes: IP.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (!res.canceled && res.assets[0]) {
        setImageUri(res.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Not available', 'Image picker is not available on this platform.');
    }
  }

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
      Alert.alert('Success', msg);
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

            {/* Image picker — shows real preview after selection */}
            <TouchableOpacity
              style={[s.uploadZone, imageUri ? s.uploadZoneWithImg : null]}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              {imageUri ? (
                <View style={s.previewWrap}>
                  <Image source={{ uri: imageUri }} style={s.previewImg} resizeMode="cover" />
                  <View style={s.previewOverlay}>
                    <Text style={s.previewChangeTxt}>📷  Tap to change image</Text>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={{ fontSize: 32, marginBottom: 4 }}>📷</Text>
                  <Text style={{ fontSize: 13, color: Colors.text3, marginBottom: 2 }}>
                    Tap to choose tile photo (JPG / PNG)
                  </Text>
                  <Text style={{ fontSize: 11, color: Colors.text3 }}>Max 5 MB</Text>
                </>
              )}
            </TouchableOpacity>

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
