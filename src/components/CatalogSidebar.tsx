// CatalogSidebar — right panel: Room Select → Dimensions → Zone Assignment → Actions
// On mobile: auto-closes when a row is tapped so catalog grid becomes visible
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Image,
} from 'react-native';
import { Colors, Radii, Shadows } from '../config/theme';
import { ROOM_TYPES, ROOM_DEFAULTS, TILE_SIZES } from '../config';
import { useAppStore } from '../store/app.store';
import { useCatalogStore } from '../store/catalog.store';
import { useAuthStore } from '../store/auth.store';
import { RoomType } from '../types';
import { SaveInventoryModal } from './SaveInventoryModal';
import { CreateInventoryPayload } from '../api';
import { useLayout } from '../hooks/useLayout';
import { showAlert } from '../utils/alert';

// Which surfaces get zones per room type
const SURFACE_RULES: Record<RoomType, { walls: boolean; floor: boolean; wallCount: number }> = {
  bathroom: { walls: true, floor: true, wallCount: 4 },
  kitchen:  { walls: true, floor: true, wallCount: 3 },
  bedroom:  { walls: false, floor: true, wallCount: 0 },
  balcony:  { walls: false, floor: true, wallCount: 0 },
  parking:  { walls: false, floor: true, wallCount: 0 },
};

interface Props {
  onGenerate3D: () => void;
}

export function CatalogSidebar({ onGenerate3D }: Props) {
  const { user } = useAuthStore();
  const { isPhone } = useLayout();
  const {
    roomType, setRoomType, dimensions, setDimensions,
    selectedTileSize, setTileSize, zoneRows, setZoneRows, wallColor, setActivePage,
  } = useAppStore();
  const { assigningKey, setAssigningKey, setSidebarOpen, zoneStep: step, setZoneStep: setStep } = useCatalogStore();
  const [customW, setCustomW] = useState('12');
  const [customH, setCustomH] = useState('12');
  const [showSaveModal, setShowSaveModal] = useState(false);

  const isCustom = selectedTileSize === 'custom';
  const [tw, th] = isCustom
    ? [parseFloat(customW) || 12, parseFloat(customH) || 12]
    : selectedTileSize.split('x').map(Number);
  const rowCount = Math.max(1, Math.round(dimensions.height / (th / 12)));
  const rules = SURFACE_RULES[roomType];
  const canSave = user?.role === 'admin' || user?.role === 'shop_owner';

  function handleSelectRoom(rt: RoomType) {
    setRoomType(rt);
    const defs = ROOM_DEFAULTS[rt];
    if (defs) setDimensions(defs);
    setZoneRows([]);
    setAssigningKey(null);
    setStep(2);
    // On mobile, ensure sidebar is open after room selection
    if (isPhone) setSidebarOpen(true);
  }

  function handleBack() {
    setStep(1);
    setAssigningKey(null);
  }

  // Zone row helpers
  const getRow = (wallKey: string, rowIndex: number) =>
    zoneRows.find(r => r.wallKey === wallKey && r.rowIndex === rowIndex);

  function focusRow(wallKey: string, rowIndex: number) {
    const k = `${wallKey}:${rowIndex}`;
    if (assigningKey === k) {
      // Toggle off
      setAssigningKey(null);
    } else {
      // Set assigning mode
      setAssigningKey(k);
      // On mobile, auto-close sidebar so user can see the catalog tiles
      if (isPhone) {
        setSidebarOpen(false);
        const label = wallKey === 'floor' ? 'Floor Tile' : `Row ${rowIndex + 1}`;
        showAlert('Select a Tile', `Tap a tile from the catalog to assign it to ${label}`);
      }
    }
  }

  function clearRow(wallKey: string, rowIndex: number) {
    setZoneRows(zoneRows.filter(r => !(r.wallKey === wallKey && r.rowIndex === rowIndex)));
    if (assigningKey === `${wallKey}:${rowIndex}`) setAssigningKey(null);
  }

  function handleGenerate() {
    onGenerate3D();
  }

  function handleSaveInventory() {
    setShowSaveModal(true);
  }

  function handleInventorySaved() {
    // Navigate to inventory screen
    setSidebarOpen(false);
    setActivePage('inventory');
  }

  // Prepare design data for modal
  const getDesignData = (): Omit<CreateInventoryPayload, 'name'> => {
    const firstTile = zoneRows.find(r => r.tileId || r.tileName);

    return {
      roomType,
      dimensions,
      tileSize: selectedTileSize,
      tileName: firstTile?.tileName,
      tileColor: firstTile?.color,
      tileImageUri: firstTile?.tileImageUri,
      zoneRows,
      wallColor,
      selectedTileId: firstTile?.tileId,
      selectedTileName: firstTile?.tileName,
      selectedTileColor: firstTile?.color,
      selectedTileImageUri: firstTile?.tileImageUri,
      status: 'active',
    };
  };

  // Build surfaces
  const surfaces: { key: string; label: string; rows: number }[] = [];
  if (rules.floor) surfaces.push({ key: 'floor', label: 'Floor', rows: 1 });
  if (rules.walls) surfaces.push({ key: 'walls', label: 'Walls', rows: rowCount });

  const assignedTotal = surfaces.reduce((sum, s) =>
    sum + Array.from({ length: s.rows }, (_, i) => getRow(s.key, i)).filter(Boolean).length, 0);
  const totalRows = surfaces.reduce((sum, s) => sum + s.rows, 0);

  return (
    <View style={[st.container, isPhone && st.containerMobile]}>
      {/* ── Header ── */}
      <View style={st.header}>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>Zone Arena</Text>
          <Text style={st.headerSub}>
            {step === 1 ? 'Select room type' : `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} · ${assignedTotal}/${totalRows} assigned`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => { setSidebarOpen(false); setAssigningKey(null); setStep(1); }} style={st.closeBtn}>
          <Text style={{ fontSize: 14, color: Colors.text3 }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* ── Step 1: Room Selection ── */}
      {step === 1 && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 8 }}>
          <Text style={st.sectionLabel}>Select Room Type</Text>
          {ROOM_TYPES.map(({ key, icon, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => handleSelectRoom(key as RoomType)}
              style={[st.roomCard, roomType === key && st.roomCardActive]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 24 }}>{icon}</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[st.roomLabel, roomType === key && { color: Colors.gold }]}>{label}</Text>
                <Text style={st.roomHint}>
                  {key === 'bathroom' ? 'Floor + 4 walls' :
                   key === 'kitchen' ? 'Floor + 3 walls' : 'Floor only'}
                </Text>
              </View>
              {roomType === key && <Text style={{ color: Colors.gold, fontSize: 16 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Step 2: Dimensions + Zone Assignment ── */}
      {step === 2 && (
        <>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {/* Back button */}
            <TouchableOpacity onPress={handleBack} style={st.backRow}>
              <Text style={{ fontSize: 12, color: Colors.accent }}>← Change Room</Text>
            </TouchableOpacity>

            {/* Dimensions */}
            <View style={st.section}>
              <Text style={st.sectionLabel}>Room Dimensions (ft)</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[
                  { k: 'width', l: 'W', v: dimensions.width },
                  { k: 'length', l: 'L', v: dimensions.length },
                  { k: 'height', l: 'H', v: dimensions.height },
                ].map(d => (
                  <View key={d.k} style={{ flex: 1 }}>
                    <Text style={st.inputLabel}>{d.l}</Text>
                    <TextInput
                      style={st.input}
                      value={String(d.v)}
                      keyboardType="numeric"
                      onChangeText={v => setDimensions({ ...dimensions, [d.k]: parseFloat(v) || 1 })}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Tile Size */}
            <View style={st.section}>
              <Text style={st.sectionLabel}>Tile Size</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {TILE_SIZES.map(sz => (
                  <TouchableOpacity key={sz} onPress={() => setTileSize(sz)}
                    style={[st.sizeChip, selectedTileSize === sz && st.sizeChipActive]}>
                    <Text style={[st.sizeChipTx, selectedTileSize === sz && { color: '#fff' }]}>
                      {sz === 'custom' ? '✏️' : sz}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {isCustom && (
                <View style={{ marginTop: 8, backgroundColor: Colors.surface, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: Colors.border }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: Colors.text3, marginBottom: 6 }}>Custom Size (inches)</Text>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9, color: Colors.text3, marginBottom: 3 }}>Width</Text>
                      <TextInput style={[st.input, { textAlign: 'center', fontSize: 14, fontWeight: '600' }]} value={customW} onChangeText={setCustomW} keyboardType="numeric" placeholder="12" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.gold, marginTop: 12 }}>×</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9, color: Colors.text3, marginBottom: 3 }}>Height</Text>
                      <TextInput style={[st.input, { textAlign: 'center', fontSize: 14, fontWeight: '600' }]} value={customH} onChangeText={setCustomH} keyboardType="numeric" placeholder="12" />
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.text3, marginTop: 12 }}>in</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Zone Assignment */}
            <View style={st.section}>
              <Text style={st.sectionLabel}>Assign Tiles</Text>
              <Text style={{ fontSize: 11, color: Colors.text3, marginBottom: 10 }}>
                Tap a row, then select a tile from the catalog grid
              </Text>

              {surfaces.map(surf => {
                const assignedCount = Array.from({ length: surf.rows }, (_, i) => getRow(surf.key, i)).filter(Boolean).length;
                return (
                  <View key={surf.key} style={st.surfaceCard}>
                    <View style={st.surfaceHeader}>
                      <Text style={{ fontSize: 13 }}>{surf.key === 'floor' ? '▦' : '🧱'}</Text>
                      <Text style={st.surfaceLabel}>{surf.label}</Text>
                      <View style={st.surfaceBadge}>
                        <Text style={st.surfaceBadgeTx}>{assignedCount}/{surf.rows}</Text>
                      </View>
                    </View>
                    <View style={{ padding: 6, gap: 3 }}>
                      {Array.from({ length: surf.rows }, (_, r) => {
                        const row = getRow(surf.key, r);
                        const k = `${surf.key}:${r}`;
                        const focused = assigningKey === k;
                        const assigned = !!row?.tileId || !!row?.color;
                        return (
                          <TouchableOpacity
                            key={r}
                            onPress={() => focusRow(surf.key, r)}
                            style={[st.rowChip, focused && st.rowChipFocused, assigned && st.rowChipAssigned]}
                            activeOpacity={0.7}
                          >
                            <View style={[st.rowThumb, !row?.tileImageUri && assigned && row?.color ? { backgroundColor: row.color } : {}]}>
                              {row?.tileImageUri ? (
                                <Image source={{ uri: row.tileImageUri }} style={st.rowThumbImg} resizeMode="cover" />
                              ) : focused && !assigned ? (
                                <View style={st.pulseIndicator} />
                              ) : null}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[st.rowLabel, focused && { color: Colors.gold }]}>
                                {surf.key === 'floor' ? 'FLOOR TILE' : `ROW ${r + 1}`}
                              </Text>
                              <Text style={[st.rowTile, !assigned && { fontStyle: 'italic', color: Colors.text3 }]} numberOfLines={1}>
                                {focused && !assigned ? '← Select from catalog' : assigned ? row?.tileName ?? 'Custom' : 'Not assigned'}
                              </Text>
                            </View>
                            {assigned && (
                              <TouchableOpacity onPress={() => clearRow(surf.key, r)} style={st.clearBtn} hitSlop={{top:6,bottom:6,left:6,right:6}}>
                                <Text style={{ fontSize: 8, color: Colors.text3 }}>✕</Text>
                              </TouchableOpacity>
                            )}
                            {focused && <View style={st.focusDot} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* ── Sticky Footer ── */}
          <View style={st.footer}>
            <TouchableOpacity style={st.generateBtn} onPress={handleGenerate} activeOpacity={0.7}>
              <Text style={st.generateTx}>🎬 Generate 3D Preview</Text>
            </TouchableOpacity>
            {canSave && (
              <TouchableOpacity
                style={st.saveBtn}
                onPress={handleSaveInventory}
                activeOpacity={0.7}
              >
                <Text style={st.saveTx}>💾 Save as Inventory</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* Save Inventory Modal */}
      <SaveInventoryModal
        visible={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSuccess={handleInventorySaved}
        designData={getDesignData()}
      />
    </View>
  );
}

const SIDEBAR_W = 320;

const st = StyleSheet.create({
  container: {
    width: SIDEBAR_W,
    backgroundColor: Colors.white,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    ...Shadows.card,
  },
  containerMobile: {
    width: '100%' as any,
    flex: 1,
    borderLeftWidth: 0,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.primary,
  },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#E0E3F5', letterSpacing: 0.3 },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  backRow: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  section: { paddingHorizontal: 16, paddingVertical: 10 },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1.2, color: Colors.text3, marginBottom: 8,
  },
  inputLabel: { fontSize: 9, fontWeight: '600', color: Colors.text3, marginBottom: 3 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 5, fontSize: 13,
    color: Colors.text1, backgroundColor: Colors.surface,
  },
  sizeChip: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 14, backgroundColor: Colors.surface,
  },
  sizeChipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold },
  sizeChipTx: { fontSize: 10, fontWeight: '500', color: Colors.text1 },
  // Room cards
  roomCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radii.lg, backgroundColor: Colors.surface,
  },
  roomCardActive: { borderColor: Colors.gold, backgroundColor: '#fdf9f2', ...Shadows.card },
  roomLabel: { fontSize: 13, fontWeight: '600', color: Colors.text1 },
  roomHint: { fontSize: 10, color: Colors.text3, marginTop: 1 },
  // Surface cards
  surfaceCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, overflow: 'hidden', marginBottom: 8,
  },
  surfaceHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: 'rgba(200,169,110,0.06)',
  },
  surfaceLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: Colors.text1 },
  surfaceBadge: {
    backgroundColor: Colors.surface2, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  surfaceBadgeTx: { fontSize: 9, color: Colors.text3, fontWeight: '600' },
  // Zone rows
  rowChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md,
    backgroundColor: Colors.white, borderStyle: 'dashed',
  },
  rowChipFocused: {
    borderColor: Colors.gold, borderStyle: 'solid',
    backgroundColor: 'rgba(200,169,110,0.08)',
    ...Shadows.card,
  },
  rowChipAssigned: {
    borderColor: 'rgba(76,183,116,0.38)', borderStyle: 'solid',
    backgroundColor: 'rgba(76,183,116,0.04)',
  },
  rowThumb: {
    width: 22, height: 22, borderRadius: 5,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface2,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  rowThumbImg: { width: '100%', height: '100%' },
  pulseIndicator: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gold,
  },
  rowLabel: { fontSize: 9, fontWeight: '700', color: Colors.text3, letterSpacing: 0.3 },
  rowTile: { fontSize: 10, fontWeight: '500', color: Colors.text2 },
  clearBtn: {
    width: 18, height: 18, borderRadius: 4,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  focusDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.gold,
    marginLeft: 4,
  },
  // Footer
  footer: {
    padding: 12, gap: 6,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
  generateBtn: {
    backgroundColor: Colors.gold, borderRadius: Radii.md,
    paddingVertical: 11, alignItems: 'center',
  },
  generateTx: { fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radii.md,
    paddingVertical: 10, alignItems: 'center',
  },
  saveTx: { fontSize: 12, fontWeight: '600', color: '#E0E3F5' },
});
