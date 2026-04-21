// CatalogScreen — split layout: tile grid (left) + sliding sidebar (right)
// Mobile: Zone Arena shown as bottom-sheet modal; auto-closes on row tap
import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ScrollView, Image,
  Modal, Pressable, Platform,
} from 'react-native';
import { Colors, Radii, Shadows } from '../config/theme';
import { Button } from '../components/Button';
import { TileCard } from '../components/TileCard';
import { TileGridSkeleton } from '../components/SkeletonLoader';
import { UploadTileModal } from '../components/UploadTileModal';
import { CatalogSidebar } from '../components/CatalogSidebar';
import { useCatalogStore } from '../store/catalog.store';
import { useAuthStore } from '../store/auth.store';
import { useAppStore } from '../store/app.store';
import { useLayout } from '../hooks/useLayout';
import { getTiles, deleteTile } from '../api/tiles';
import { CAT_TABS, ROOM_SIZE_FILTERS } from '../config';
import { Tile } from '../types';
import { showConfirm, showAlert, showError } from '../utils/alert';

const H_PAD = 12;

export function CatalogScreen() {
  const { user } = useAuthStore();
  const { isPhone } = useLayout();
  const {
    tiles, setTiles, search, setSearch,
    activeTab, setActiveTab, activeSize, setActiveSize,
    selectedTile, setSelectedTile,
    loading, setLoading,
    sidebarOpen, setSidebarOpen, toggleSidebar,
    assigningKey, setAssigningKey,
    setZoneStep,
  } = useCatalogStore();
  const { zoneRows, setZoneRows, setActivePage } = useAppStore();
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTiles(await getTiles()); }
    catch (e: any) { console.error('tiles load:', e?.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => tiles.filter(t => {
    const matchRoom = activeTab === 'all' || t.roomType === activeTab;
    let matchSize = true;
    if (activeSize !== 'all' && activeTab !== 'all') {
      const sizeFilters = ROOM_SIZE_FILTERS[activeTab];
      const sf = sizeFilters?.find(s => s.label === activeSize);
      if (sf) matchSize = t.widthIn === sf.wIn && t.heightIn === sf.hIn;
    }
    const matchQ = !search
      || t.name.toLowerCase().includes(search.toLowerCase())
      || (t.manufacturer ?? '').toLowerCase().includes(search.toLowerCase());
    return matchRoom && matchSize && matchQ;
  }), [tiles, activeTab, activeSize, search]);

  const countFor = (key: string) =>
    key === 'all' ? tiles.length : tiles.filter(t => t.roomType === key).length;

  const sizeFilters = activeTab !== 'all' ? ROOM_SIZE_FILTERS[activeTab] ?? [] : [];

  const canUpload = user?.role === 'admin' || user?.role === 'shop_owner' || user?.role === 'sales_person';
  const canDelete = user?.role === 'admin' || user?.role === 'shop_owner';

  // ── Tile click: assign to focused zone row OR just select ──
  function handleTilePress(tile: Tile) {
    if (assigningKey) {
      const parts = assigningKey.split(':');
      const wallKey = parts[0];
      const rowIndex = parseInt(parts[1]);
      const slot = parts[2]; // 'accent' | undefined
      const rowLabel = wallKey === 'floor' ? 'Floor Tile' : `Row ${rowIndex + 1}`;

      if (slot === 'accent') {
        // Assign accent (B) tile — preserve existing base tile fields
        const existing = zoneRows.find(r => r.wallKey === wallKey && r.rowIndex === rowIndex);
        const updated = {
          rowIndex, wallKey,
          ...(existing ?? {}),
          tileBId: tile.id, tileBName: tile.name,
          tileBColor: tile.color, tileBImageUri: tile.imageUri,
        };
        setZoneRows(
          zoneRows.some(r => r.wallKey === wallKey && r.rowIndex === rowIndex)
            ? zoneRows.map(r => r.wallKey === wallKey && r.rowIndex === rowIndex ? updated : r)
            : [...zoneRows, updated]
        );
        showAlert('✅ Accent Assigned', `"${tile.name}" → ${rowLabel} accent`);
      } else {
        // Assign base tile — preserve accent fields if they exist
        const existing = zoneRows.find(r => r.wallKey === wallKey && r.rowIndex === rowIndex);
        const newRow = {
          rowIndex, wallKey,
          ...(existing ?? {}),
          tileId: tile.id, tileName: tile.name,
          color: tile.color, tileImageUri: tile.imageUri,
          tileWidthIn: tile.widthIn, tileHeightIn: tile.heightIn,
        };
        setZoneRows(
          zoneRows.some(r => r.wallKey === wallKey && r.rowIndex === rowIndex)
            ? zoneRows.map(r => r.wallKey === wallKey && r.rowIndex === rowIndex ? newRow : r)
            : [...zoneRows, newRow]
        );
        const { setTileSize } = useAppStore.getState();
        setTileSize(`${tile.widthIn}x${tile.heightIn}`);
        showAlert('✅ Tile Assigned', `"${tile.name}" → ${rowLabel}`);
      }

      setAssigningKey(null);

      // On mobile, auto-reopen Zone Arena so user can pick next slot
      if (isPhone) {
        setTimeout(() => { setSidebarOpen(true); }, 600);
      }
      return;
    }

    // If sidebar isn't open, show a toast guiding the user
    if (!sidebarOpen) {
      setSelectedTile(tile);
      showAlert('Tile Selected', `"${tile.name}" selected. Open Zone Arena to assign it to a row.`);
      return;
    }

    setSelectedTile(tile);
  }

  async function handleDelete(tile: Tile) {
    console.log('Delete tile clicked:', tile.name, tile.id);
    showConfirm(
      'Delete Tile',
      `Are you sure you want to delete "${tile.name}"?\n\nThis will remove it from the catalog and cannot be undone.`,
      async () => {
        try {
          console.log('Deleting tile:', tile.id);
          await deleteTile(tile.id);
          setTiles(tiles.filter(t => t.id !== tile.id));
          showAlert('Deleted', `"${tile.name}" has been removed from the catalog.`);
        } catch (e: any) {
          console.error('Delete tile error:', e);
          showError('Could not delete tile', e);
        }
      },
      () => {
        console.log('Delete cancelled');
      }
    );
  }

  // Derive assigning label for the banner
  const assigningLabel = useMemo(() => {
    if (!assigningKey) return null;
    const [wallKey, ri] = assigningKey.split(':');
    return wallKey === 'floor' ? 'Floor Tile' : `Wall Row ${parseInt(ri) + 1}`;
  }, [assigningKey]);

  // ── Render the catalog grid ──
  function renderCatalogGrid() {
    return (
      <View style={{ flex: 1 }}>
        {/* Search Bar */}
        <View style={s.toolbar}>
          <View style={s.searchBox}>
            <Text style={{ fontSize: 14, opacity: 0.4 }}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Search tiles…"
              placeholderTextColor={Colors.text3}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 13, color: Colors.text3, fontWeight: '600' }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Room Category Chips */}
        <View style={s.chipBar}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CAT_TABS}
            keyExtractor={i => i.key}
            contentContainerStyle={{ paddingHorizontal: H_PAD, gap: 6 }}
            renderItem={({ item: tab }) => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  onPress={() => {
                    setActiveTab(tab.key);
                  }}
                  style={[s.chip, active && s.chipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 12 }}>{tab.icon}</Text>
                  <Text style={[s.chipLabel, active && s.chipLabelActive]}>
                    {tab.label}
                  </Text>
                  <View style={[s.chipCount, active && s.chipCountActive]}>
                    <Text style={[s.chipCountTx, active && s.chipCountTxActive]}>
                      {countFor(tab.key)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Size Sub-Filters */}
        {sizeFilters.length > 0 && (
          <View style={s.sizeBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: H_PAD, gap: 6 }}>
              <TouchableOpacity
                onPress={() => setActiveSize('all')}
                style={[s.sizeFilterChip, activeSize === 'all' && s.sizeFilterChipActive]}
              >
                <Text style={[s.sizeFilterTx, activeSize === 'all' && { color: '#fff' }]}>All Sizes</Text>
              </TouchableOpacity>
              {sizeFilters.map(sf => (
                <TouchableOpacity
                  key={sf.label}
                  onPress={() => setActiveSize(sf.label)}
                  style={[s.sizeFilterChip, activeSize === sf.label && s.sizeFilterChipActive]}
                >
                  <Text style={[s.sizeFilterTx, activeSize === sf.label && { color: '#fff' }]}>{sf.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Tile Grid */}
        {loading ? (
          <TileGridSkeleton count={9} />
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.grid}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); load(); }}
                tintColor={Colors.accent}
              />
            }
          >
            {filtered.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>🔍</Text>
                <Text style={s.emptyTitle}>No tiles found</Text>
                <Text style={s.emptySub}>
                  Try changing your search or category filter
                </Text>
              </View>
            ) : (
              <View style={s.tileWrap}>
                {filtered.map((item) => (
                  <View key={item.id}>
                    <TileCard
                      tile={item}
                      selected={selectedTile?.id === item.id}
                      onPress={(tile) => { handleTilePress(tile); }}
                      onDelete={canDelete ? handleDelete : undefined}
                      canDelete={canDelete}
                    />
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface }}>
      {/* ─── Page Header ─── */}
      <View style={s.pageHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.pageTitle}>Tile Catalog</Text>
          <Text style={s.pageSub}>Browse & select tiles for your visualization</Text>
        </View>
        {canUpload && (
          <Button
            label="📷 Upload"
            onPress={() => setUploadOpen(true)}
            variant={user?.role === 'sales_person' ? 'outline' : 'primary'}
            size="sm"
          />
        )}
      </View>

      {/* ─── Assigning Mode Banner ─── */}
      {assigningKey && (
        <View style={s.assignBanner}>
          <View style={s.assignDot} />
          <Text style={s.assignText}>
            🎯 Assigning to: <Text style={{ fontWeight: '700' }}>{assigningLabel}</Text> — click a tile below
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {isPhone && (
              <TouchableOpacity
                onPress={() => setSidebarOpen(true)}
                style={s.assignProgressBtn}
              >
                <Text style={{ fontSize: 11, color: '#896e38' }}>View Arena</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setAssigningKey(null)} style={s.assignCancel}>
              <Text style={{ fontSize: 11, color: '#896e38' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Main Content: Grid + Sidebar ─── */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* ── Left: Catalog Grid ── */}
        {renderCatalogGrid()}

        {/* ── Right: Sidebar (desktop/tablet only) ── */}
        {!isPhone && sidebarOpen && (
          <CatalogSidebar
            onGenerate3D={() => {
              setSidebarOpen(false);
              setAssigningKey(null);
              setZoneStep(1);
              setActivePage('visualizer');
            }}
          />
        )}
      </View>

      {/* ─── Mobile: Zone Arena as Bottom Sheet Modal ─── */}
      {isPhone && (
        <Modal
          visible={sidebarOpen}
          transparent
          animationType="slide"
          onRequestClose={() => { setSidebarOpen(false); setAssigningKey(null); setZoneStep(1); }}
        >
          <Pressable
            style={s.mobileSheetBackdrop}
            onPress={() => { setSidebarOpen(false); setZoneStep(1); }}
          >
            <Pressable style={s.mobileSheetPanel} onPress={() => {}}>
              {/* Handle bar */}
              <View style={s.mobileSheetHandleBar}>
                <View style={s.mobileSheetHandle} />
              </View>
              <CatalogSidebar
                onGenerate3D={() => {
                  setSidebarOpen(false);
                  setAssigningKey(null);
                  setZoneStep(1);
                  setActivePage('visualizer');
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* ─── Floating Action Button ─── */}
      {!sidebarOpen && (
        <TouchableOpacity
          style={s.fab}
          onPress={() => setSidebarOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={s.fabIcon}>⚡</Text>
          <Text style={s.fabLabel}>Zone Arena</Text>
        </TouchableOpacity>
      )}

      {/* ─── Upload Modal (only valid modal — it's a form) ─── */}
      <UploadTileModal visible={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={load} />
    </View>
  );
}

/* ─── Styles ─── */
const s = StyleSheet.create({
  // Header
  pageHeader: {
    padding: H_PAD,
    paddingBottom: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: { fontSize: 18, fontFamily: 'serif', fontWeight: '700', color: Colors.text1 },
  pageSub: { fontSize: 11, color: Colors.text3, marginTop: 1 },
  // Assigning banner
  assignBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: 'rgba(200,169,110,0.12)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(200,169,110,0.3)',
  },
  assignDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gold },
  assignText: { flex: 1, fontSize: 12, fontWeight: '500', color: '#896e38' },
  assignCancel: {
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.4)', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  assignProgressBtn: {
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.4)', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: 'rgba(200,169,110,0.1)',
  },
  // Search
  toolbar: { backgroundColor: Colors.white, paddingHorizontal: H_PAD, paddingVertical: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.pill,
    paddingHorizontal: 14, paddingVertical: 9, backgroundColor: Colors.surface,
  },
  searchInput: { flex: 1, fontSize: 13, color: Colors.text1 },
  // Chip tabs
  chipBar: {
    backgroundColor: Colors.white, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radii.pill, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  chipLabel: { fontSize: 11, fontWeight: '600', color: Colors.text2 },
  chipLabelActive: { color: '#fff' },
  chipCount: {
    backgroundColor: Colors.surface2, borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: 'center',
  },
  chipCountActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  chipCountTx: { fontSize: 9, fontWeight: '700', color: Colors.text3 },
  chipCountTxActive: { color: '#fff' },
  // Size sub-filters
  sizeBar: {
    backgroundColor: Colors.white, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  sizeFilterChip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radii.pill, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  sizeFilterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sizeFilterTx: { fontSize: 11, fontWeight: '600', color: Colors.text2 },
  // Grid
  grid: { padding: H_PAD, paddingBottom: 40 },
  tileWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  // Empty state
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: Colors.text1, marginBottom: 4 },
  emptySub: { fontSize: 12, color: Colors.text3, textAlign: 'center', lineHeight: 18 },
  // Floating Action Button
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.gold, borderRadius: 28,
    paddingHorizontal: 18, paddingVertical: 12,
    ...Shadows.header,
  },
  fabIcon: { fontSize: 16 },
  fabLabel: { fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  // ── Mobile bottom sheet ──
  mobileSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  mobileSheetPanel: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    maxHeight: '85%',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 -4px 24px rgba(0,0,0,0.15)' } as any
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 20,
        }),
  },
  mobileSheetHandleBar: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  mobileSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
});
