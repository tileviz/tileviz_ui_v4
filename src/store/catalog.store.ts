// ============================================================
//  store/catalog.store.ts — Tile catalog + sidebar state
// ============================================================

import { create } from 'zustand';
import { Tile, TileCategory } from '../types';

interface CatalogState {
  tiles:          Tile[];
  setTiles:       (tiles: Tile[]) => void;
  search:         string;
  setSearch:      (q: string) => void;
  activeTab:      string;
  setActiveTab:   (tab: string) => void;
  activeSize:     string;
  setActiveSize:  (s: string) => void;
  selectedTile:   Tile | null;
  setSelectedTile:(t: Tile | null) => void;
  loading:        boolean;
  setLoading:     (v: boolean) => void;
  // Sidebar
  sidebarOpen:    boolean;
  setSidebarOpen: (v: boolean) => void;
  toggleSidebar:  () => void;
  // Zone assignment mode
  assigningKey:   string | null;   // e.g. "wall:2", "floor:0"
  setAssigningKey:(k: string | null) => void;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  tiles:          [],
  setTiles:       (tiles)       => set({ tiles }),
  search:         '',
  setSearch:      (search)      => set({ search }),
  activeTab:      'all',
  setActiveTab:   (activeTab)   => set({ activeTab, activeSize: 'all' }),
  activeSize:     'all',
  setActiveSize:  (activeSize)  => set({ activeSize }),
  selectedTile:   null,
  setSelectedTile:(selectedTile)=> set({ selectedTile }),
  loading:        false,
  setLoading:     (loading)     => set({ loading }),
  sidebarOpen:    false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar:  ()            => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  assigningKey:   null,
  setAssigningKey:(assigningKey)=> set({ assigningKey }),
}));
