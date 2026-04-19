// ============================================================
//  screens/InventoryScreen.tsx
//  Inventory Library — browse, search, and manage saved
//  design inventories. Accessible to Admin, Shop Owner, Sales.
// ============================================================
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, useWindowDimensions, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { loadThumbnail, deleteThumbnail } from '../utils/thumbnail';
import { setPendingCaptureId } from '../utils/pendingCapture';
import { ThumbnailGenerator } from '../components/ThumbnailGenerator';
import { Colors, Radii, Shadows } from '../config/theme';
import { useAppStore } from '../store/app.store';
import { useAuthStore } from '../store/auth.store';
import { useCatalogStore } from '../store/catalog.store';
import { InventoryItem, SavedDesign } from '../types';
import { ROOM_EMOJIS, ROOM_BG, formatDate } from '../utils/format';
import { getInventory, deleteInventory } from '../api';
import { showConfirm, showAlert, showAlertWithButtons, showError } from '../utils/alert';
import { Trie } from '../utils/trie';
import { SearchBar } from '../components/SearchBar';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active:   { bg: 'rgba(76,175,80,0.12)', text: '#2e7d4f', label: 'Active' },
  draft:    { bg: 'rgba(200,169,110,0.15)', text: '#8a6d30', label: 'Draft' },
  archived: { bg: 'rgba(158,152,144,0.15)', text: '#6a645e', label: 'Archived' },
};

const ROOM_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bathroom', label: '🛁 Bathroom' },
  { key: 'kitchen', label: '🍳 Kitchen' },
  { key: 'bedroom', label: '🛏 Bedroom' },
  { key: 'balcony', label: '🌆 Balcony' },
  { key: 'parking', label: '🅿️ Parking' },
];

export function InventoryScreen() {
  const { width } = useWindowDimensions();
  const { loadDesign } = useAppStore();
  const { setSelectedTile, tiles } = useCatalogStore();
  const { user } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [thumbQueue, setThumbQueue] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTrie] = useState(() => new Trie());

  const numCols = width > 1200 ? 4 : width > 800 ? 3 : width > 500 ? 2 : 1;

  // Build search index whenever inventory items change
  useEffect(() => {
    if (inventoryItems.length > 0) {
      searchTrie.buildIndex(inventoryItems, ['name', 'id', 'tileName', 'shopName', 'createdBy', 'roomType']);
    }
  }, [inventoryItems, searchTrie]);

  // Load inventory from backend
  const loadInventory = useCallback(async () => {
    try {
      const items = await getInventory();
      setInventoryItems(items);
      // Load any already-generated local thumbnails
      const thumbMap: Record<string, string> = {};
      await Promise.all(items.map(async (item: InventoryItem) => {
        const uri = await loadThumbnail(item.id);
        if (uri) thumbMap[item.id] = uri;
      }));
      setThumbnails(thumbMap);
      // Queue items that still need a thumbnail for background rendering
      setThumbQueue(items.filter(i => !thumbMap[i.id]));
    } catch (error: any) {
      console.error('Failed to load inventory:', error);
      showAlert('Error', 'Failed to load inventory items. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Optimized filtering with Trie search
  const filteredItems = useMemo(() => {
    let items = inventoryItems;

    // Apply search using Trie for O(m) complexity where m is query length
    if (searchQuery.trim()) {
      items = searchTrie.search(searchQuery);
    }

    // Room type filter
    if (roomFilter !== 'all') {
      items = items.filter(i => i.roomType === roomFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      items = items.filter(i => i.status === statusFilter);
    }

    return items;
  }, [inventoryItems, roomFilter, statusFilter, searchQuery, searchTrie]);

  function handleLoadDesign(item: InventoryItem) {
    // Convert InventoryItem to SavedDesign format
    const design: SavedDesign = {
      id: item.id,
      name: item.name,
      roomType: item.roomType,
      dimensions: item.dimensions,
      emoji: ROOM_EMOJIS[item.roomType] ?? '🏠',
      createdAt: item.createdAt,
      tileName: item.tileName,
      tileImageUri: item.tileImageUri,
      tileColor: item.tileColor,
      zoneRows: item.zoneRows,
      wallColor: item.wallColor,
      selectedTileSize: item.tileSize,
      selectedTileId: item.selectedTileId,
      selectedTileName: item.selectedTileName || item.tileName,
      selectedTileColor: item.selectedTileColor || item.tileColor,
    };

    // Flag VisualizerScreen to auto-capture thumbnail once canvas is ready
    if (!thumbnails[item.id]) setPendingCaptureId(item.id);

    // Use unified load design method with callback
    loadDesign(design, setSelectedTile, tiles, () => {
      showAlert('Design Loaded', `"${item.name}" loaded into Visualizer with all saved features.`);
    });
  }

  function handleViewDetails(item: InventoryItem) {
    const details = `ID: ${item.id}\nRoom: ${item.roomType}\nDimensions: ${item.dimensions.width}×${item.dimensions.length}×${item.dimensions.height} ft\nTile: ${item.tileName || 'N/A'}\nTile Size: ${item.tileSize}\nShop: ${item.shopName || 'N/A'}\nCreated by: ${item.createdBy || 'Unknown'}\nDate: ${formatDate(item.createdAt)}\nStatus: ${item.status}`;

    showAlertWithButtons(
      item.name,
      details,
      [
        { text: 'Load Design', onPress: () => handleLoadDesign(item) },
        { text: 'Close', style: 'cancel' },
      ]
    );
  }

  async function handleDelete(item: InventoryItem) {
    console.log('handleDelete called with item:', item.name, item.id);

    // Only admin and shop_owner can delete
    if (user?.role === 'sales_person') {
      console.log('Permission denied for sales person');
      showAlert('Permission Denied', 'Sales persons cannot delete inventory items.');
      return;
    }

    console.log('Showing delete confirmation');
    showConfirm(
      'Delete Inventory',
      `Delete "${item.name}"?\n\nThis action cannot be undone.`,
      async () => {
        console.log('Delete confirmed, calling API for ID:', item.id);
        try {
          await deleteInventory(item.id);
          console.log('Delete API succeeded');
          setInventoryItems(prev => prev.filter(i => i.id !== item.id));
          showAlert('Deleted', `"${item.name}" has been removed from inventory.`);
        } catch (error: any) {
          console.error('Delete error:', error);
          showError('Could not delete item', error);
        }
      },
      () => {
        console.log('Delete cancelled');
      }
    );
  }

  const roleLabel = (role?: string) => {
    if (role === 'admin') return '👑 Admin';
    if (role === 'shop_owner') return '🏪 Shop Owner';
    if (role === 'sales_person') return '💼 Sales';
    return role || '';
  };

  // Called by ThumbnailGenerator each time it finishes a thumbnail — must be
  // declared BEFORE any early return to satisfy the Rules of Hooks
  const handleThumbnailCaptured = useCallback((id: string, uri: string) => {
    setThumbnails(prev => ({ ...prev, [id]: uri }));
  }, []);

  // Show loading state
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={{ fontSize: 13, color: Colors.text3 }}>Loading inventory…</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Background thumbnail renderer — offscreen, processes queue silently */}
      {thumbQueue.length > 0 && (
        <ThumbnailGenerator queue={thumbQueue} onCaptured={handleThumbnailCaptured} />
      )}

      {/* Header */}
      <View style={s.pageHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.pageTitle}>Inventory Library</Text>
          <Text style={s.pageSub}>
            {filteredItems.length} of {inventoryItems.length} inventories
          </Text>
        </View>
        <View style={s.headerBadge}>
          <Text style={{ fontSize: 22 }}>📦</Text>
        </View>
      </View>

      {/* Search bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by ID, name, tile, shop, or creator..."
      />

      {/* Filter chips */}
      <View style={s.filterSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={ROOM_FILTERS}
          keyExtractor={i => i.key}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setRoomFilter(item.key)}
              style={[s.filterChip, roomFilter === item.key && s.filterChipActive]}
            >
              <Text style={[
                s.filterChipText,
                roomFilter === item.key && { color: '#fff' },
              ]}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
        {/* Status filter pills */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { key: 'all', label: 'All Status' },
            { key: 'active', label: '● Active' },
            { key: 'draft', label: '○ Draft' },
            { key: 'archived', label: '◌ Archived' },
          ]}
          keyExtractor={i => i.key}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 6, marginTop: 6 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setStatusFilter(item.key)}
              style={[
                s.statusChip,
                statusFilter === item.key && s.statusChipActive,
              ]}
            >
              <Text style={[
                s.statusChipText,
                statusFilter === item.key && { color: Colors.primary },
              ]}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Inventory Grid */}
      {filteredItems.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>📭</Text>
          <Text style={s.emptyTitle}>No inventories found</Text>
          <Text style={s.emptyDesc}>
            {searchQuery ? `No results for "${searchQuery}"` : 'Create a design in Catalog and save it as inventory.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={i => i.id}
          numColumns={numCols}
          key={`cols-${numCols}`}
          contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }}
          columnWrapperStyle={numCols > 1 ? { gap: 12 } : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadInventory();
              }}
              tintColor={Colors.accent}
            />
          }
          renderItem={({ item }) => (
            <View style={[s.card, { flex: 1, maxWidth: numCols > 1 ? `${100 / numCols}%` as any : '100%' }]}>
              <TouchableOpacity
                onPress={() => handleViewDetails(item)}
                activeOpacity={0.85}
              >
                {/* Thumbnail */}
                <View style={[s.cardThumb, { backgroundColor: ROOM_BG[item.roomType] ?? '#f8f6f2' }]}>
                  {thumbnails[item.id] ? (
                    <Image source={{ uri: thumbnails[item.id] }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  ) : item.tileImageUri ? (
                    <Image source={{ uri: item.tileImageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  ) : (
                    <Text style={{ fontSize: 36 }}>{ROOM_EMOJIS[item.roomType] ?? '🏠'}</Text>
                  )}
                  {/* Tile color swatch — only when no image */}
                  {!thumbnails[item.id] && !item.tileImageUri && item.tileColor && (
                    <View style={[s.tileSwatch, { backgroundColor: item.tileColor }]} />
                  )}
                  {/* Status badge */}
                  <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[item.status]?.bg }]}>
                    <Text style={[s.statusBadgeText, { color: STATUS_COLORS[item.status]?.text }]}>
                      {STATUS_COLORS[item.status]?.label}
                    </Text>
                  </View>
                </View>
                {/* Card body */}
                <View style={s.cardBody}>
                  <Text style={s.cardTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.cardDims}>
                    {item.dimensions.width}×{item.dimensions.length}×{item.dimensions.height} ft
                  </Text>
                  {item.tileName && (
                    <Text style={s.cardTile} numberOfLines={1}>🪨 {item.tileName}</Text>
                  )}
                  <Text style={s.cardMeta}>
                    {item.tileSize} • {roleLabel(item.createdByRole)}
                  </Text>
                  {item.shopName && (
                    <Text style={s.cardShop} numberOfLines={1}>🏪 {item.shopName}</Text>
                  )}
                  <Text style={s.cardDate}>{formatDate(item.createdAt)}</Text>
                </View>
              </TouchableOpacity>

              {/* Action buttons - Outside the card TouchableOpacity */}
              <View style={s.cardFooter} pointerEvents="box-none">
                <TouchableOpacity
                  onPress={() => {
                    console.log('Load button clicked for:', item.name);
                    handleLoadDesign(item);
                  }}
                  style={[s.actionBtn, s.loadBtn]}
                  activeOpacity={0.7}
                >
                  <Text style={s.loadBtnText}>Load</Text>
                </TouchableOpacity>
                {(user?.role === 'admin' || user?.role === 'shop_owner') && (
                  <TouchableOpacity
                    onPress={() => {
                      console.log('Delete button clicked for:', item.name);
                      console.log('Item ID:', item.id);
                      console.log('User role:', user?.role);
                      handleDelete(item);
                    }}
                    style={[s.actionBtn, s.deleteBtn]}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={s.deleteBtnText}>🗑</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  pageHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pageTitle: {
    fontSize: 20,
    fontFamily: 'serif',
    fontWeight: '600',
    color: Colors.text1,
  },
  pageSub: {
    fontSize: 12,
    color: Colors.text3,
    marginTop: 2,
  },
  headerBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: Colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.text1,
  },
  clearSearch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Filters
  filterSection: {
    paddingVertical: 8,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text2,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  statusChipActive: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(124,111,247,0.08)',
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text3,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text1,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.text3,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  cardThumb: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tileSwatch: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    ...Shadows.card,
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 10,
  },
  idBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  idText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text1,
    marginBottom: 3,
  },
  cardDims: {
    fontSize: 11,
    color: Colors.text3,
    marginBottom: 2,
  },
  cardTile: {
    fontSize: 11,
    color: Colors.text2,
    marginBottom: 4,
  },
  cardMeta: {
    gap: 2,
    marginTop: 4,
  },
  metaText: {
    fontSize: 10,
    color: Colors.text3,
  },
  cardDate: {
    fontSize: 10,
    color: Colors.text3,
    marginTop: 4,
  },

  // Actions
  cardFooter: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  actionBtn: {
    paddingVertical: 7,
    borderRadius: Radii.sm,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 4,
  },
  loadBtn: {
    flex: 1,
    backgroundColor: Colors.gold,
    borderRadius: Radii.sm,
    paddingVertical: 7,
    alignItems: 'center',
  },
  loadBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  detailBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    paddingVertical: 7,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  detailBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text2,
  },
  deleteBtn: {
    width: 32,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  deleteBtnText: {
    fontSize: 14,
  },
  cardShop: {
    fontSize: 10,
    color: Colors.text3,
    marginTop: 2,
  },
});
