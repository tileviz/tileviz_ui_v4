// SavedDesignsScreen — wired to /api/rooms (#10 session fix)
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, useWindowDimensions,
} from 'react-native';
import { Colors, Radii, Shadows } from '../config/theme';
import { Button } from '../components/Button';
import { useAppStore } from '../store/app.store';
import { useCatalogStore } from '../store/catalog.store';
import { getRooms, deleteRoom } from '../api/rooms';
import { SavedDesign } from '../types';
import { ROOM_EMOJIS, ROOM_BG, formatDate } from '../utils/format';
import { showConfirm, showAlert } from '../utils/alert';
import { Trie } from '../utils/trie';
import { SearchBar } from '../components/SearchBar';

export function SavedDesignsScreen() {
  const { width } = useWindowDimensions();
  const { loadDesign } = useAppStore();
  const { setSelectedTile, tiles } = useCatalogStore();
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState('all');
  const [searchTrie] = useState(() => new Trie());

  const numCols = width > 1200 ? 4 : width > 800 ? 3 : width > 500 ? 2 : 1;

  // Build search index whenever designs change
  useEffect(() => {
    if (designs.length > 0) {
      searchTrie.buildIndex(designs, ['name', 'id', 'tileName', 'roomType']);
    }
  }, [designs, searchTrie]);

  const load = useCallback(async () => {
    try {
      setDesigns(await getRooms());
    } catch (e: any) {
      console.error('rooms:', e?.message);
      showAlert('Error', 'Failed to load saved designs. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Optimized filtering with Trie search
  const filteredDesigns = useMemo(() => {
    let items = designs;

    // Apply search using Trie
    if (searchQuery.trim()) {
      items = searchTrie.search(searchQuery);
    }

    // Room type filter
    if (roomFilter !== 'all') {
      items = items.filter(i => i.roomType === roomFilter);
    }

    return items;
  }, [designs, searchQuery, roomFilter, searchTrie]);

  function handleLoad(d: SavedDesign) {
    loadDesign(d, setSelectedTile, tiles);
    showAlert('Design Loaded', `"${d.name}" loaded into Visualizer with all saved features.`);
  }

  function handleDelete(id: string, name: string) {
    showConfirm(
      'Delete Design',
      `Delete "${name}"?\n\nThis action cannot be undone.`,
      async () => {
        try {
          await deleteRoom(id);
          setDesigns(d => d.filter(x => x.id !== id));
          showAlert('Deleted', `"${name}" has been removed.`);
        } catch (e: any) {
          console.error('Delete error:', e);
          showAlert('Error', e?.response?.data?.message ?? 'Delete failed');
        }
      }
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={{ fontSize: 13, color: Colors.text3 }}>Loading designs…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface }}>
      <View style={s.pageHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.pageTitle}>Saved Designs</Text>
          <Text style={s.pageSub}>
            {filteredDesigns.length} of {designs.length} saved visualizations
          </Text>
        </View>
        <View style={s.countBadge}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text2 }}>
            {designs.length}
          </Text>
        </View>
      </View>

      {/* Search bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by name, tile, or room type..."
      />

      {/* Room type filter chips */}
      <View style={s.filterSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { key: 'all', label: 'All Rooms' },
            { key: 'bathroom', label: '🛁 Bathroom' },
            { key: 'kitchen', label: '🍳 Kitchen' },
            { key: 'bedroom', label: '🛏 Bedroom' },
            { key: 'balcony', label: '🌆 Balcony' },
            { key: 'parking', label: '🅿️ Parking' },
          ]}
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
      </View>

      {filteredDesigns.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>📂</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.text1, marginBottom: 8 }}>
            {searchQuery ? 'No results found' : 'No saved designs yet'}
          </Text>
          <Text style={{ fontSize: 13, color: Colors.text3, textAlign: 'center', lineHeight: 20 }}>
            {searchQuery
              ? `No designs match "${searchQuery}"`
              : 'Create a visualization and tap "Save Design" to store it here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDesigns}
          keyExtractor={i => i.id}
          numColumns={numCols}
          key={`cols-${numCols}`}
          contentContainerStyle={{ padding: 14, gap: 14, paddingBottom: 40 }}
          columnWrapperStyle={numCols > 1 ? { gap: 14 } : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={Colors.accent}
            />
          }
          renderItem={({ item }) => (
            <View style={[s.card, { flex: 1, maxWidth: numCols > 1 ? `${100 / numCols}%` as any : '100%' }]}>
              <TouchableOpacity onPress={() => handleLoad(item)} activeOpacity={0.85}>
                <View style={[s.thumb, { backgroundColor: ROOM_BG[item.roomType] ?? '#f8f6f2' }]}>
                  <Text style={{ fontSize: 40 }}>{ROOM_EMOJIS[item.roomType] ?? '🏠'}</Text>
                </View>
                <View style={{ padding: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: Colors.text1, marginBottom: 3 }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: Colors.text3, marginBottom: 2 }}>
                    {item.dimensions.length}×{item.dimensions.width}×{item.dimensions.height} ft
                  </Text>
                  {item.tileName && (
                    <Text style={{ fontSize: 11, color: Colors.text2, marginBottom: 2 }} numberOfLines={1}>
                      🪨 {item.tileName}
                    </Text>
                  )}
                  <Text style={{ fontSize: 10, color: Colors.text3 }}>
                    {formatDate(item.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingBottom: 10 }}>
                <Button
                  label="Load"
                  onPress={() => handleLoad(item)}
                  variant="primary"
                  size="sm"
                  style={{ flex: 1 }}
                />
                <Button
                  label="🗑"
                  onPress={() => handleDelete(item.id, item.name)}
                  variant="danger"
                  size="sm"
                  style={{ width: 36, paddingHorizontal: 0 }}
                />
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
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
  countBadge: {
    backgroundColor: Colors.surface2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  thumb: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  filterChip: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text1,
  },
});
