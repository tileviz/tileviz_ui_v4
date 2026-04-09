// ============================================================
//  store/app.store.ts — Visualizer + Zone + Saved state (#12)
// ============================================================

import { create } from 'zustand';
import { RoomType, RoomDimensions, ZoneRow, SavedDesign } from '../types';
import { ROOM_DEFAULTS } from '../config';

interface AppState {
  // Room config
  roomType:         RoomType;
  dimensions:       RoomDimensions;
  selectedTileSize: string;
  wallColor:        string;
  setRoomType:      (r: RoomType) => void;
  setDimensions:    (d: RoomDimensions) => void;
  setTileSize:      (s: string) => void;
  setWallColor:     (c: string) => void;

  // Zone rows (zone design screen)
  zoneRows:         ZoneRow[];
  setZoneRows:      (rows: ZoneRow[]) => void;
  focusedZoneKey:   string | null;
  setFocusedZoneKey:(k: string | null) => void;

  // Saved designs
  savedDesigns:     SavedDesign[];
  setSavedDesigns:  (d: SavedDesign[]) => void;

  // Active nav page
  activePage:       string;
  setActivePage:    (p: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  roomType:         'bathroom',
  dimensions:       ROOM_DEFAULTS['bathroom'],
  selectedTileSize: '12x12',
  wallColor:        '#f0ebe4',
  setRoomType:      (roomType) => set({ roomType, dimensions: ROOM_DEFAULTS[roomType] || { width: 10, length: 12, height: 10 } }),
  setDimensions:    (dimensions)       => set({ dimensions }),
  setTileSize:      (selectedTileSize) => set({ selectedTileSize }),
  setWallColor:     (wallColor)        => set({ wallColor }),

  zoneRows:         [],
  setZoneRows:      (zoneRows)         => set({ zoneRows }),
  focusedZoneKey:   null,
  setFocusedZoneKey:(focusedZoneKey)   => set({ focusedZoneKey }),

  savedDesigns:     [],
  setSavedDesigns:  (savedDesigns)     => set({ savedDesigns }),

  activePage:       'visualizer',
  setActivePage:    (activePage)       => set({ activePage }),
}));
