// VisualizerScreen — full 3D visualizer with auto-preview & live updates
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Image, Animated } from 'react-native';
import { Colors, Radii, Shadows } from '../config/theme';
import { Button } from '../components/Button';
import { useAppStore } from '../store/app.store';
import { useCatalogStore } from '../store/catalog.store';
import { RoomType } from '../types';
import { ThreeCanvas, RoomBuildConfig } from '../three/ThreeCanvas';
import { calcTileStats, ROOM_EMOJIS } from '../utils/format';
import { ROOM_TYPES, TILE_SIZES } from '../config';
import { SaveDesignModal } from '../components/SaveDesignModal';
import { Alert } from '../utils/alert';

// 35 curated wall colors — common Indian home paint palette
const WALL_COLORS: Array<{ name: string; hex: string }> = [
  { name: 'White', hex: '#ffffff' }, { name: 'Snow', hex: '#fffafa' }, { name: 'Ivory', hex: '#fffff0' },
  { name: 'Cream', hex: '#f0ebe4' }, { name: 'Linen', hex: '#faf0e6' }, { name: 'Beige', hex: '#f5f5dc' },
  { name: 'Antique White', hex: '#faebd7' }, { name: 'Peach', hex: '#ffe5b4' }, { name: 'Wheat', hex: '#f5deb3' },
  { name: 'Sand', hex: '#c2b280' }, { name: 'Khaki', hex: '#f0e68c' }, { name: 'Lemon', hex: '#fff44f' },
  { name: 'Butter', hex: '#fffd74' }, { name: 'Pale Yellow', hex: '#ffffcc' }, { name: 'Mint', hex: '#b2f2bb' },
  { name: 'Sage', hex: '#bcb88a' }, { name: 'Olive', hex: '#b5b35c' }, { name: 'Sea Green', hex: '#8fbc8f' },
  { name: 'Sky Blue', hex: '#87ceeb' }, { name: 'Powder Blue', hex: '#b0e0e6' }, { name: 'Light Blue', hex: '#add8e6' },
  { name: 'Periwinkle', hex: '#ccccff' }, { name: 'Lavender', hex: '#e6e6fa' }, { name: 'Lilac', hex: '#c8a2c8' },
  { name: 'Blush Pink', hex: '#f4c2c2' }, { name: 'Rose', hex: '#f2b5d4' }, { name: 'Coral', hex: '#f7a68e' },
  { name: 'Terracotta', hex: '#e2725b' }, { name: 'Salmon', hex: '#fa8072' }, { name: 'Warm Gray', hex: '#a09080' },
  { name: 'Cool Gray', hex: '#aeb2b5' }, { name: 'Silver', hex: '#c0c0c0' }, { name: 'Ash', hex: '#b2beb5' },
  { name: 'Pale Green', hex: '#98fb98' }, { name: 'Aqua', hex: '#b2dfdb' },
];

// ── Inline toast notification ─────────────────────────────────
function SaveToast({ status, onHide }: { status: 'success' | 'error' | null; onHide: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!status) return;
    opacity.setValue(1);
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(onHide);
    }, 2400);
    return () => clearTimeout(t);
  }, [status]);

  if (!status) return null;
  const isOk = status === 'success';
  return (
    <Animated.View style={[s.toast, isOk ? s.toastOk : s.toastErr, { opacity }]}>
      <Text style={s.toastIcon}>{isOk ? '✅' : '❌'}</Text>
      <Text style={s.toastTxt}>{isOk ? 'Design saved!' : 'Save failed'}</Text>
    </Animated.View>
  );
}

export function VisualizerScreen() {
  const { roomType, setRoomType, dimensions, setDimensions, selectedTileSize, setTileSize, zoneRows, wallColor, setWallColor, setActivePage } = useAppStore();
  const { selectedTile } = useCatalogStore();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [customW, setCustomW] = useState('12');
  const [customH, setCustomH] = useState('12');
  const isCustom = selectedTileSize === 'custom';
  const [tw, th] = isCustom
    ? [parseFloat(customW) || 12, parseFloat(customH) || 12]
    : selectedTileSize.split('x').map(Number);
  const { tilesNeeded, totalSqFt } = calcTileStats(dimensions.width, dimensions.length, dimensions.height, tw, th);
  const rowCount = Math.ceil(dimensions.height / (th / 12));
  const roomLabel = roomType.charAt(0).toUpperCase() + roomType.slice(1);

  const liveConfig = useMemo<RoomBuildConfig>(() => ({
    roomType,
    widthFt: dimensions.width,
    lengthFt: dimensions.length,
    heightFt: dimensions.height,
    tileWidthIn: tw,
    tileHeightIn: th,
    selectedTile,
    zoneRows,
    wallColor,
  }), [roomType, dimensions.width, dimensions.length, dimensions.height, tw, th, selectedTile, zoneRows, wallColor]);

  function handleSave() {
    setShowSaveModal(true);
  }

  function handleDesignSaved() {
    // Navigate to saved designs screen
    setActivePage('saved');
  }

  // Prepare design data for modal
  const getDesignData = () => ({
    roomType,
    dimensions: { length: dimensions.length, width: dimensions.width, height: dimensions.height },
    tileSize: { width: tw, height: th },
    zoneRows,
    wallColor,
    selectedTileSize,
    selectedTileId:       selectedTile?.id       ?? '',
    selectedTileName:     selectedTile?.name     ?? '',
    selectedTileImageUri: selectedTile?.imageUri ?? '',
    selectedTileColor:    selectedTile?.color    ?? '#cccccc',
  });

  const defaultName = `${roomLabel} Design - ${new Date().toLocaleDateString()}`;

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: Colors.surface }}>
      {/* SIDEBAR */}
      <View style={s.sidebar}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          {/* Room Type */}
          <View style={s.sec}>
            <Text style={s.secLbl}>Room Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {ROOM_TYPES.map(({ key, icon, label }) => (
                <TouchableOpacity key={key} onPress={() => setRoomType(key as RoomType)} style={[s.roomCard, roomType === key && s.roomCardActive]}>
                  <Text style={{ fontSize: 20, marginBottom: 3 }}>{icon}</Text>
                  <Text style={[{ fontSize: 11, fontWeight: '500', color: Colors.text2 }, roomType === key && { color: Colors.gold, fontWeight: '600' }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Dimensions */}
          <View style={s.sec}>
            <Text style={s.secLbl}>Room Dimensions (ft)</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[{ k: 'width', l: 'Width', a: 'X', v: dimensions.width }, { k: 'length', l: 'Length', a: 'Z', v: dimensions.length }, { k: 'height', l: 'Height', a: 'Y', v: dimensions.height }].map(d => (
                <View key={d.k} style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                    <Text style={{ fontSize: 10, color: Colors.text3 }}>{d.l} </Text>
                    <View style={{ backgroundColor: Colors.gold, borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: Colors.primary2 }}>{d.a}</Text>
                    </View>
                  </View>
                  <TextInput style={s.dimInput} value={String(d.v)} keyboardType="numeric" onChangeText={v => setDimensions({ ...dimensions, [d.k]: parseFloat(v) || 1 })} />
                </View>
              ))}
            </View>
          </View>

          {/* Tile Size */}
          <View style={s.sec}>
            <Text style={s.secLbl}>Tile Size</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
              {TILE_SIZES.map(sz => (
                <TouchableOpacity key={sz} onPress={() => setTileSize(sz)} style={[s.chip, selectedTileSize === sz && s.chipActive]}>
                  <Text style={[{ fontSize: 11, fontWeight: '500', color: Colors.text1 }, selectedTileSize === sz && { color: Colors.primary2 }]}>
                    {sz === 'custom' ? '✏️ Custom' : sz}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {isCustom && (
              <View style={{ marginTop: 10, backgroundColor: Colors.surface, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: Colors.border }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: Colors.text3, marginBottom: 6 }}>Custom Size (inches)</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, color: Colors.text3, marginBottom: 3 }}>Width</Text>
                    <TextInput style={[s.dimInput, { textAlign: 'center', fontSize: 14, fontWeight: '600' }]} value={customW} keyboardType="numeric" placeholder="12" onChangeText={setCustomW} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.gold, marginTop: 12 }}>×</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, color: Colors.text3, marginBottom: 3 }}>Height</Text>
                    <TextInput style={[s.dimInput, { textAlign: 'center', fontSize: 14, fontWeight: '600' }]} value={customH} keyboardType="numeric" placeholder="12" onChangeText={setCustomH} />
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.text3, marginTop: 12 }}>in</Text>
                </View>
              </View>
            )}
            <Text style={{ fontSize: 11, color: Colors.text3, marginTop: 8 }}>
              Wall rows: <Text style={{ fontWeight: '700', color: Colors.text1 }}>{rowCount}</Text>
            </Text>
          </View>

          {/* Wall Color */}
          <View style={s.sec}>
            <Text style={s.secLbl}>Wall Color</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
              {WALL_COLORS.map(c => (
                <TouchableOpacity key={c.hex} onPress={() => setWallColor(c.hex)} style={[s.colorSwatch, { backgroundColor: c.hex }, wallColor === c.hex && s.colorSwatchActive]}>
                  {wallColor === c.hex && <Text style={{ fontSize: 9, color: wallColor < '#888' ? '#fff' : '#333' }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 10, color: Colors.text3, marginTop: 6 }}>
              {WALL_COLORS.find(c => c.hex === wallColor)?.name || 'Custom'}
            </Text>
          </View>

          {/* Selected Tile */}
          <View style={s.sec}>
            <Text style={s.secLbl}>Selected Tile</Text>
            {selectedTile ? (
              <View style={{ flexDirection: 'row', gap: 9 }}>
                {selectedTile.imageUri ? (
                  <Image source={{ uri: selectedTile.imageUri }} style={{ width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: Colors.border }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: selectedTile.color || '#ccc' }} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text1 }} numberOfLines={1}>{selectedTile.name}</Text>
                  <Text style={{ fontSize: 10, color: Colors.text3 }}>{selectedTile.widthIn}×{selectedTile.heightIn}in</Text>
                </View>
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: Colors.text3, lineHeight: 18 }}>
                No tile selected. Go to Tile Catalog to pick a design.
              </Text>
            )}
          </View>
        </ScrollView>

        <View style={s.footer}>
          <Button label="💾 Save Design" onPress={handleSave} fullWidth variant="outline" />
        </View>
      </View>

      {/* MAIN — 3D canvas */}
      <View style={{ flex: 1, flexDirection: 'column' }}>
        <View style={s.infoBar}>
          {[
            { val: roomLabel, lbl: 'Room' },
            { val: `${dimensions.length}×${dimensions.width}×${dimensions.height} ft`, lbl: 'Dimensions' },
            { val: tilesNeeded.toLocaleString(), lbl: 'Tiles needed' },
            { val: String(totalSqFt), lbl: 'Total sq ft' },
          ].map((item, i) => (
            <View key={i} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#E0E3F5' }}>{item.val}</Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{item.lbl}</Text>
            </View>
          ))}
        </View>

        <View style={{ flex: 1, backgroundColor: '#e8e4dc', overflow: 'hidden' }}>
          <ThreeCanvas config={liveConfig} />
        </View>

        <View style={s.bottomBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
            {[
              { val: tilesNeeded.toLocaleString(), lbl: 'TOTAL TILES' },
              { val: String(totalSqFt), lbl: 'SQ FT' },
              { val: isCustom ? `${tw}x${th}` : selectedTileSize, lbl: 'TILE SIZE' },
              { val: roomLabel, lbl: 'ROOM' },
            ].map((stat, i) => (
              <React.Fragment key={i}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 17, fontWeight: '600', color: '#E0E3F5' }}>{stat.val}</Text>
                  <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{stat.lbl}</Text>
                </View>
                {i < 3 && <View style={{ width: 1, height: 32, backgroundColor: 'rgba(124,111,247,0.2)' }} />}
              </React.Fragment>
            ))}
            <View style={{ flexDirection: 'row', gap: 8, marginLeft: 8 }}>
              <Button label="📤 Share" onPress={() => Alert.alert('Share', 'Coming soon')} variant="outline" size="sm" style={{ borderColor: 'rgba(255,255,255,0.3)' }} textStyle={{ color: '#E0E3F5' }} />
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Save Design Modal */}
      <SaveDesignModal
        visible={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSuccess={handleDesignSaved}
        designData={getDesignData()}
        defaultName={defaultName}
      />
    </View>
  );
}

const s = StyleSheet.create({
  sidebar: { width: 220, backgroundColor: Colors.white, borderRightWidth: 1, borderRightColor: Colors.border },
  sec: { padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.surface2 },
  secLbl: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, color: Colors.text3, marginBottom: 10 },
  roomCard: { width: '47%', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 8, alignItems: 'center', backgroundColor: Colors.surface },
  roomCardActive: { borderColor: Colors.gold, backgroundColor: '#fdf9f2', ...Shadows.card },
  dimInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 5, fontSize: 13, color: Colors.text1, backgroundColor: Colors.surface },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border, borderRadius: 20, backgroundColor: Colors.surface },
  chipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold },
  colorSwatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  colorSwatchActive: { borderColor: Colors.gold, borderWidth: 2.5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  footer: { padding: 14, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.white },
  infoBar: { position: 'absolute', top: 12, left: 12, backgroundColor: Colors.primary, borderWidth: 1, borderColor: 'rgba(124,111,247,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', gap: 20, zIndex: 10, ...Shadows.header },
  bottomBar: { backgroundColor: Colors.primary, borderTopWidth: 1, borderTopColor: 'rgba(124,111,247,0.15)', height: 58 },
  // Save toast
  toast: { position: 'absolute', bottom: 66, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 24, ...Shadows.header },
  toastOk: { backgroundColor: '#1a9e5c' },
  toastErr: { backgroundColor: '#d93025' },
  toastIcon: { fontSize: 16 },
  toastTxt: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
