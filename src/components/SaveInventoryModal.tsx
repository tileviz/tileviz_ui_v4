// ============================================================
//  components/SaveInventoryModal.tsx
//  Modal form for saving inventory with metadata
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, Modal, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { Colors, Radii, Shadows } from '../config/theme';
import { createInventory, CreateInventoryPayload } from '../api';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  designData: Omit<CreateInventoryPayload, 'name'>;
}

export function SaveInventoryModal({ visible, onClose, onSuccess, designData }: Props) {
  const [inventoryName, setInventoryName] = useState('');
  const [inventoryId, setInventoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setInventoryName('');
    setInventoryId('');
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    // Validate required fields
    if (!inventoryName.trim()) {
      Alert.alert('Missing Information', 'Please enter a name for this inventory.');
      return;
    }

    if (!inventoryId.trim()) {
      Alert.alert('Missing Information', 'Please enter an inventory ID.');
      return;
    }

    setSaving(true);
    try {
      const payload: CreateInventoryPayload = {
        ...designData,
        name: inventoryName.trim(),
      };

      await createInventory(payload);

      // Reset form and close modal first
      resetForm();
      setSaving(false);
      onClose();

      // Then show success alert and trigger navigation
      Alert.alert(
        '✅ Success!',
        `"${inventoryName}" has been saved to inventory.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Save inventory error:', error);
      setSaving(false);
      Alert.alert(
        '❌ Error',
        error.message || 'Failed to save inventory. Please try again.'
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
              <Text style={s.title}>💾 Save as Inventory</Text>
              <Text style={s.subtitle}>Fill in the details below</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
              <Text style={s.closeTx}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView style={s.form} showsVerticalScrollIndicator={false}>
            {/* Inventory Name */}
            <View style={s.field}>
              <Text style={s.label}>
                Inventory Name <Text style={{ color: Colors.danger }}>*</Text>
              </Text>
              <TextInput
                style={s.input}
                placeholder="e.g., Modern Bathroom Suite"
                placeholderTextColor={Colors.text3}
                value={inventoryName}
                onChangeText={setInventoryName}
                editable={!saving}
              />
            </View>

            {/* Inventory ID */}
            <View style={s.field}>
              <Text style={s.label}>
                Inventory ID <Text style={{ color: Colors.danger }}>*</Text>
              </Text>
              <TextInput
                style={s.input}
                placeholder="e.g., INV-2026-001"
                placeholderTextColor={Colors.text3}
                value={inventoryId}
                onChangeText={setInventoryId}
                editable={!saving}
              />
              <Text style={s.hint}>
                Use a unique identifier for tracking
              </Text>
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
              <Text style={s.hint}>Automatically set to today's date</Text>
            </View>

            {/* Notes (Optional) */}
            <View style={s.field}>
              <Text style={s.label}>Notes (Optional)</Text>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Add any additional notes..."
                placeholderTextColor={Colors.text3}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!saving}
              />
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
                <Text style={s.previewValue}>{designData.tileSize}</Text>
              </View>
              {designData.tileName && (
                <View style={s.previewRow}>
                  <Text style={s.previewLabel}>Primary Tile:</Text>
                  <Text style={s.previewValue} numberOfLines={1}>
                    {designData.tileName}
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
                <Text style={s.saveBtnText}>💾 Save to Inventory</Text>
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
    minHeight: 80,
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
    backgroundColor: Colors.gold,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
