// ============================================================
//  screens/InventoryScreen.tsx
//  Inventory Library — browse, search, and manage saved
//  design inventories. Accessible to Admin, Shop Owner, Sales.
// ============================================================
import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, useWindowDimensions,
} from 'react-native';
import { Colors, Radii, Shadows } from '../config/theme';
import { useAppStore } from '../store/app.store';
import { useAuthStore } from '../store/auth.store';
import { InventoryItem, RoomType } from '../types';
import { ROOM_EMOJIS, ROOM_BG, formatDate } from '../utils/format';

// ── Demo inventory data (in production, fetched from API) ─────
const DEMO_INVENTORY: InventoryItem[] = [
  {
    id: 'INV-001', name: 'Modern Bathroom Suite', roomType: 'bathroom',
    dimensions: { width: 8, length: 10, height: 10 }, tileSize: '12x12',
    tileName: 'Ocean Mosaic', tileColor: '#5ba3c7',
    zoneRows: [], shopName: 'TileWorld Mumbai', createdBy: 'Rajesh Kumar',
    createdByRole: 'shop_owner', createdAt: '2026-03-28', status: 'active',
  },
  {
    id: 'INV-002', name: 'Classic Kitchen Design', roomType: 'kitchen',
    dimensions: { width: 10, length: 12, height: 10 }, tileSize: '18x18',
    tileName: 'Midnight Navy', tileColor: '#1a2a5e',
    zoneRows: [], shopName: 'TileWorld Mumbai', createdBy: 'Rajesh Kumar',
    createdByRole: 'shop_owner', createdAt: '2026-03-27', status: 'active',
  },
  {
    id: 'INV-003', name: 'Master Bedroom Floor', roomType: 'bedroom',
    dimensions: { width: 14, length: 16, height: 10 }, tileSize: '24x24',
    tileName: 'Rose Quartz', tileColor: '#e8a4b0',
    zoneRows: [], shopName: 'Premium Tiles Pune', createdBy: 'Suresh Patel',
    createdByRole: 'shop_owner', createdAt: '2026-03-25', status: 'active',
  },
  {
    id: 'INV-004', name: 'Balcony Terracotta', roomType: 'balcony',
    dimensions: { width: 6, length: 10, height: 8 }, tileSize: '12x12',
    tileName: 'Terracotta Warm', tileColor: '#c87a4a',
    zoneRows: [], shopName: 'TileWorld Mumbai', createdBy: 'Rajesh Kumar',
    createdByRole: 'shop_owner', createdAt: '2026-03-22', status: 'draft',
  },
  {
    id: 'INV-005', name: 'Parking Interlocking', roomType: 'parking',
    dimensions: { width: 16, length: 20, height: 8 }, tileSize: '12x12',
    tileName: 'Cobalt Blue', tileColor: '#2a4a8a',
    zoneRows: [], shopName: 'Premium Tiles Pune', createdBy: 'Suresh Patel',
    createdByRole: 'shop_owner', createdAt: '2026-03-20', status: 'active',
  },
  {
    id: 'INV-006', name: 'Guest Bathroom', roomType: 'bathroom',
    dimensions: { width: 6, length: 8, height: 9 }, tileSize: '6x6',
    tileName: 'Pearl White', tileColor: '#f0ece4',
    zoneRows: [], shopName: 'TileWorld Mumbai', createdBy: 'Anita Sharma',
    createdByRole: 'sales_person', createdAt: '2026-03-18', status: 'archived',
  },
];

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
  const { setActivePage, setRoomType, setDimensions } = useAppStore();
  const { user } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [inventoryItems] = useState<InventoryItem[]>(DEMO_INVENTORY);

  const numCols = width > 1200 ? 4 : width > 800 ? 3 : width > 500 ? 2 : 1;

  // Filtered and searched inventory
  const filteredItems = useMemo(() => {
    let items = inventoryItems;

    // Room type filter
    if (roomFilter !== 'all') {
      items = items.filter(i => i.roomType === roomFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      items = items.filter(i => i.status === statusFilter);
    }

    // Search by name or ID
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.tileName?.toLowerCase().includes(q) ||
        i.shopName?.toLowerCase().includes(q) ||
        i.createdBy?.toLowerCase().includes(q)
      );
    }

    return items;
  }, [inventoryItems, roomFilter, statusFilter, searchQuery]);

  function handleLoadDesign(item: InventoryItem) {
    setRoomType(item.roomType);
    setDimensions(item.dimensions);
    setActivePage('visualizer');
    Alert.alert('Design Loaded', `"${item.name}" loaded into Visualizer.`);
  }

  function handleViewDetails(item: InventoryItem) {
    Alert.alert(
      item.name,
      `ID: ${item.id}\nRoom: ${item.roomType}\nDimensions: ${item.dimensions.width}×${item.dimensions.length}×${item.dimensions.height} ft\nTile: ${item.tileName}\nTile Size: ${item.tileSize}\nShop: ${item.shopName}\nCreated by: ${item.createdBy}\nDate: ${formatDate(item.createdAt)}\nStatus: ${item.status}`,
      [
        { text: 'Load Design', onPress: () => handleLoadDesign(item) },
        { text: 'Close', style: 'cancel' },
      ]
    );
  }

  function handleDelete(item: InventoryItem) {
    Alert.alert('Delete Inventory', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        // In production: call API to delete
        Alert.alert('Deleted', `"${item.name}" removed.`);
      }},
    ]);
  }

  const roleLabel = (role?: string) => {
    if (role === 'admin') return '👑 Admin';
    if (role === 'shop_owner') return '🏪 Shop Owner';
    if (role === 'sales_person') return '💼 Sales';
    return role || '';
  };

  return (
    <View style={s.container}>
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
      <View style={s.searchSection}>
        <View style={s.searchBar}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search by ID, name, tile, shop, or creator..."
            placeholderTextColor={Colors.text3}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={s.clearSearch}>
              <Text style={{ fontSize: 12, color: Colors.text3 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

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
            {searchQuery ? `No results for "${searchQuery}"` : 'Create a design in Visualizer and save it as inventory.'}
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
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleViewDetails(item)}
              activeOpacity={0.85}
              style={[s.card, { flex: 1, maxWidth: numCols > 1 ? `${100 / numCols}%` as any : '100%' }]}
            >
              {/* Thumbnail */}
              <View style={[s.cardThumb, { backgroundColor: ROOM_BG[item.roomType] ?? '#f8f6f2' }]}>
                <Text style={{ fontSize: 36 }}>{ROOM_EMOJIS[item.roomType] ?? '🏠'}</Text>
                {/* Tile color swatch */}
                {item.tileColor && (
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
                {/* ID badge */}
                <View style={s.idBadge}>
                  <Text style={s.idText}>{item.id}</Text>
                </View>
                <Text style={s.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={s.cardDims}>
                  {item.dimensions.width}×{item.dimensions.length}×{item.dimensions.height} ft • {item.tileSize}
                </Text>
                {item.tileName && (
                  <Text style={s.cardTile} numberOfLines={1}>🪨 {item.tileName}</Text>
                )}
                {/* Shop + creator */}
                <View style={s.cardMeta}>
                  {item.shopName && (
                    <Text style={s.metaText} numberOfLines={1}>🏪 {item.shopName}</Text>
                  )}
                  {item.createdBy && (
                    <Text style={s.metaText} numberOfLines={1}>
                      👤 {item.createdBy}
                    </Text>
                  )}
                </View>
                <Text style={s.cardDate}>{formatDate(item.createdAt)}</Text>
              </View>
              {/* Card actions */}
              <View style={s.cardActions}>
                <TouchableOpacity
                  style={s.loadBtn}
                  onPress={() => handleLoadDesign(item)}
                >
                  <Text style={s.loadBtnText}>▣ Load</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.detailBtn}
                  onPress={() => handleViewDetails(item)}
                >
                  <Text style={s.detailBtnText}>Details</Text>
                </TouchableOpacity>
                {(user?.role === 'admin' || user?.role === 'shop_owner') && (
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => handleDelete(item)}
                  >
                    <Text style={{ fontSize: 12 }}>🗑</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
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
});
