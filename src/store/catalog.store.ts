// ============================================================
//  store/catalog.store.ts — Tile catalog + sidebar state
// ============================================================

import { create } from 'zustand';
import { Tile, TileCategory, TilePattern } from '../types';

// ── Wall Designer types ──
export type DesignerMode = 'plain' | 'pattern';
export type DesignerSelectionStep = 'choose_mode' | 'choose_pattern' | 'select_tile_a' | 'select_tile_b' | 'preview';

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
  // Zone Arena step — persisted in store so it survives mobile modal close/reopen
  zoneStep:       1 | 2;
  setZoneStep:    (step: 1 | 2) => void;
  // Zone assignment mode
  assigningKey:   string | null;   // e.g. "wall:2", "floor:0"
  setAssigningKey:(k: string | null) => void;

  // ── Wall Designer state ──
  designerOpen:           boolean;
  setDesignerOpen:        (v: boolean) => void;
  designerActiveRow:      number | null;         // currently selected wall row index
  setDesignerActiveRow:   (r: number | null) => void;
  designerMode:           DesignerMode | null;   // plain or pattern
  setDesignerMode:        (m: DesignerMode | null) => void;
  designerPattern:        TilePattern;           // selected pattern type
  setDesignerPattern:     (p: TilePattern) => void;
  designerTileA:          Tile | null;           // first tile selection
  setDesignerTileA:       (t: Tile | null) => void;
  designerTileB:          Tile | null;           // second tile selection (for patterns)
  setDesignerTileB:       (t: Tile | null) => void;
  designerStep:           DesignerSelectionStep; // current step in selection flow
  setDesignerStep:        (s: DesignerSelectionStep) => void;
  designerColumns:        number;                // number of tile columns per row
  setDesignerColumns:     (c: number) => void;
  resetDesignerRow:       () => void;            // reset mode/pattern/tiles for new row
  resetDesigner:          () => void;            // fully reset the designer
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
  zoneStep:       1,
  setZoneStep:    (zoneStep)    => set({ zoneStep }),
  assigningKey:   null,
  setAssigningKey:(assigningKey)=> set({ assigningKey }),

  // ── Wall Designer ──
  designerOpen:           false,
  setDesignerOpen:        (designerOpen) => set({ designerOpen }),
  designerActiveRow:      null,
  setDesignerActiveRow:   (designerActiveRow) => set({ designerActiveRow }),
  designerMode:           null,
  setDesignerMode:        (designerMode) => set({ designerMode }),
  designerPattern:        'alternate',
  setDesignerPattern:     (designerPattern) => set({ designerPattern }),
  designerTileA:          null,
  setDesignerTileA:       (designerTileA) => set({ designerTileA }),
  designerTileB:          null,
  setDesignerTileB:       (designerTileB) => set({ designerTileB }),
  designerStep:           'choose_mode',
  setDesignerStep:        (designerStep) => set({ designerStep }),
  designerColumns:        8,
  setDesignerColumns:     (designerColumns) => set({ designerColumns }),
  resetDesignerRow:       () => set({
    designerMode: null, designerPattern: 'alternate',
    designerTileA: null, designerTileB: null,
    designerStep: 'choose_mode',
  }),
  resetDesigner:          () => set({
    designerOpen: false, designerActiveRow: null,
    designerMode: null, designerPattern: 'alternate',
    designerTileA: null, designerTileB: null,
    designerStep: 'choose_mode', designerColumns: 8,
  }),
}));
