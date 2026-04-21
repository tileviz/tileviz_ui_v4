// SavedDesignsScreen — wired to /api/rooms (#10 session fix)
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, useWindowDimensions, Image,
} from 'react-native';
import { loadThumbnail, deleteThumbnail } from '../utils/thumbnail';
import { Colors, Radii, Shadows } from '../config/theme';
import { Button } from '../components/Button';
import { useAppStore } from '../store/app.store';
import { useCatalogStore } from '../store/catalog.store';
import { getRooms, deleteRoom } from '../api/rooms';
import { getTiles } from '../api/tiles';
import { SavedDesign } from '../types';
import { ROOM_EMOJIS, ROOM_BG, formatDate } from '../utils/format';
import { showConfirm, showAlert, showError } from '../utils/alert';
import { Trie } from '../utils/trie';
import { SearchBar } from '../components/SearchBar';

export function SavedDesignsScreen() {
  const { width } = useWindowDimensions();
  const { loadDesign } = useAppStore();
  const { setSelectedTile, tiles, setTiles } = useCatalogStore();
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState('all');
  const [searchTrie] = useState(() => new Trie());
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const numCols = width > 1200 ? 4 : width > 800 ? 3 : width > 500 ? 2 : 1;

  // Build search index whenever designs change
  useEffect(() => {
    if (designs.length > 0) {
      searchTrie.buildIndex(designs, ['name', 'id', 'tileName', 'roomType']);
    }
  }, [designs, searchTrie]);

  const load = useCallback(async () => {
    let fetched: typeof designs = [];
    try {
      const [designsData] = await Promise.all([
        getRooms(),
        tiles.length === 0 ? getTiles().then(t => setTiles(t)) : Promise.resolve(),
      ]);
      fetched = designsData;
      setDesigns(designsData);
      // UI shows immediately after designs arrive — thumbnails load in background
    } catch {
      showAlert('Error', 'Failed to load saved designs. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // Load thumbnails in batches of 3 — avoids flooding the main thread
    const BATCH = 3;
    for (let i = 0; i < fetched.length; i += BATCH) {
      if (!mountedRef.current) break;
      await Promise.all(fetched.slice(i, i + BATCH).map(async d => {
        try {
          const uri = await loadThumbnail(d.id);
          if (uri && mountedRef.current) setThumbnails(prev => ({ ...prev, [d.id]: uri }));
        } catch { /* thumbnail missing — emoji placeholder shown */ }
      }));
    }
  }, [tiles.length, setTiles]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredDesigns = useMemo(() => {
    let items = designs;

    if (searchQuery.trim()) {
      items = searchTrie.search(searchQuery);
    }

    if (roomFilter !== 'all') {
      items = items.filter(i => i.roomType === roomFilter);
    }

    return items;
  }, [designs, searchQuery, roomFilter, searchTrie]);

  function handleLoad(d: SavedDesign) {
    if (tiles.length === 0) {
      showAlert('Loading...', 'Preparing tiles data...');
      getTiles().then(t => {
        setTiles(t);
        loadDesign(d, setSelectedTile, t, () => {
          showAlert('Design Loaded', `"${d.name}" loaded into Visualizer with all saved features.`);
        });
      }).catch(e => {
        console.error('Failed to load tiles:', e);
        loadDesign(d, setSelectedTile, [], () => {
          showAlert('Design Loaded', `"${d.name}" loaded into Visualizer (some tiles may be placeholders).`);
        });
      });
    } else {
      loadDesign(d, setSelectedTile, tiles, () => {
        showAlert('Design Loaded', `"${d.name}" loaded into Visualizer with all saved features.`);
      });
    }
  }

  function handleDelete(id: string, name: string) {
    showConfirm(
      'Delete Design',
      `Delete "${name}"?\n\nThis action cannot be undone.`,
      async () => {
        try {
          await deleteRoom(id);
          deleteThumbnail(id).catch(() => {});
          setDesigns(d => d.filter(x => x.id !== id));
          setThumbnails(t => { const n = { ...t }; delete n[id]; return n; });
          showAlert('Deleted', `"${name}" has been removed.`);
        } catch (e: any) {
          console.error('Delete error:', e);
          showError('Could not delete design', e);
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
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={8}
          removeClippedSubviews={true}
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
                  {thumbnails[item.id] ? (
                    <Image source={{ uri: thumbnails[item.id] }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  ) : (
                    <Text style={{ fontSize: 40 }}>{ROOM_EMOJIS[item.roomType] ?? '🏠'}</Text>
                  )}
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
