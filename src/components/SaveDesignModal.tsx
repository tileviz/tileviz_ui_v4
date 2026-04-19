// ============================================================
//  components/SaveDesignModal.tsx
//  Modal form for saving room designs with metadata
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, Modal, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { Colors, Radii, Shadows } from '../config/theme';
import { saveRoom } from '../api/rooms';
import { showAlert } from '../utils/alert';
import { RoomType } from '../types';
import { saveThumbnail } from '../utils/thumbnail';

interface SaveDesignPayload {
  name: string;
  roomType: RoomType;
  dimensions: { length: number; width: number; height: number };
  tileSize: { width: number; height: number };
  zoneRows?: any[];
  wallColor?: string;
  selectedTileSize?: string;
  selectedTileId?: string;
  selectedTileName?: string;
  selectedTileImageUri?: string;
  selectedTileColor?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  designData: Omit<SaveDesignPayload, 'name'>;
  defaultName?: string;
  screenshotDataUri?: string | null;
}

export function SaveDesignModal({ visible, onClose, onSuccess, designData, defaultName, screenshotDataUri }: Props) {
  const [designName, setDesignName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setDesignName('');
    setDescription('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    // Validate required fields
    const finalName = designName.trim() || defaultName || 'Untitled Design';

    setSaving(true);
    try {
      const payload: SaveDesignPayload = {
        ...designData,
        name: finalName,
      };

      const saved = await saveRoom(payload);

      // Persist screenshot thumbnail locally keyed by design ID
      if (screenshotDataUri && saved?.id) {
        saveThumbnail(saved.id, screenshotDataUri).catch(() => {});
      }

      // Reset form and close modal first
      resetForm();
      setSaving(false);
      onClose();

      // Show non-intrusive toast and trigger navigation
      showAlert(
        '✅ Success!',
        `"${finalName}" has been saved to your designs.`
      );
      onSuccess();
    } catch (error: any) {
      console.error('Save design error:', error);
      setSaving(false);
      showAlert(
        '❌ Error',
        error.message || 'Failed to save design. Please try again.'
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={s.overlay}>
        <View style={s.modal}>
          {/* Header */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>💾 Save Design</Text>
              <Text style={s.subtitle}>Give your design a name</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
              <Text style={s.closeTx}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView style={s.form} showsVerticalScrollIndicator={false}>
            {/* Design Name */}
            <View style={s.field}>
              <Text style={s.label}>Design Name</Text>
              <TextInput
                style={s.input}
                placeholder={defaultName || 'e.g., Modern Bathroom Design'}
                placeholderTextColor={Colors.text3}
                value={designName}
                onChangeText={setDesignName}
                editable={!saving}
                autoFocus
              />
              <Text style={s.hint}>
                Leave blank to use default: "{defaultName}"
              </Text>
            </View>

            {/* Description (Optional) */}
            <View style={s.field}>
              <Text style={s.label}>Description (Optional)</Text>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Add notes about this design..."
                placeholderTextColor={Colors.text3}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!saving}
              />
            </View>

            {/* Date (Auto-filled, read-only) */}
            <View style={s.field}>
              <Text style={s.label}>Date</Text>
              <View style={[s.input, s.readOnly]}>
                <Text style={s.readOnlyText}>
                  {new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            {/* Design Preview Info */}
            <View style={s.previewCard}>
              <Text style={s.previewTitle}>Design Summary</Text>
              <View style={s.previewRow}>
                <Text style={s.previewLabel}>Room Type:</Text>
                <Text style={s.previewValue}>
                  {designData.roomType.charAt(0).toUpperCase() + designData.roomType.slice(1)}
                </Text>
              </View>
              <View style={s.previewRow}>
                <Text style={s.previewLabel}>Dimensions:</Text>
                <Text style={s.previewValue}>
                  {designData.dimensions.width}×{designData.dimensions.length}×{designData.dimensions.height} ft
                </Text>
              </View>
              <View style={s.previewRow}>
                <Text style={s.previewLabel}>Tile Size:</Text>
                <Text style={s.previewValue}>
                  {designData.tileSize.width}×{designData.tileSize.height} in
                </Text>
              </View>
              {designData.selectedTileName && (
                <View style={s.previewRow}>
                  <Text style={s.previewLabel}>Selected Tile:</Text>
                  <Text style={s.previewValue} numberOfLines={1}>
                    {designData.selectedTileName}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.btn, s.cancelBtn]}
              onPress={handleClose}
              disabled={saving}
            >
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.saveBtn, saving && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.saveBtnText}>💾 Save Design</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    ...Shadows.modal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text1,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.text3,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTx: {
    fontSize: 16,
    color: Colors.text3,
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text1,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text1,
    backgroundColor: Colors.white,
  },
  textArea: {
    minHeight: 70,
    paddingTop: 10,
  },
  readOnly: {
    backgroundColor: Colors.surface,
  },
  readOnlyText: {
    fontSize: 14,
    color: Colors.text2,
  },
  hint: {
    fontSize: 11,
    color: Colors.text3,
    marginTop: 4,
  },
  previewCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: 12,
    marginTop: 10,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text2,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  previewLabel: {
    fontSize: 12,
    color: Colors.text3,
  },
  previewValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text1,
    flex: 1,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text2,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});

