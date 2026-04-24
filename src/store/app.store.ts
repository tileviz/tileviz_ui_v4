// ============================================================
//  store/app.store.ts — Visualizer + Zone + Saved state (#12)
// ============================================================

import { create } from 'zustand';
import { RoomType, RoomDimensions, ZoneRow, SavedDesign, Tile } from '../types';
import { ROOM_DEFAULTS } from '../config';

// Fingerprint of design-relevant state — used to detect changes
export interface DesignFingerprint {
  roomType:         RoomType;
  dimensions:       RoomDimensions;
  selectedTileSize: string;
  wallColor:        string;
  zoneRows:         ZoneRow[];
}

// Snapshot captured when a design/inventory is loaded
export interface LoadedSnapshot {
  sourceType:  'design' | 'inventory';
  sourceId:    string;
  fingerprint: string;   // JSON-stringified DesignFingerprint
}

function buildFingerprint(state: DesignFingerprint): string {
  // Stable serialisation: sort zoneRow keys so order doesn't matter
  const rows = state.zoneRows
    .map(r => ({ ...r }))
    .sort((a, b) => `${a.wallKey}:${a.rowIndex}`.localeCompare(`${b.wallKey}:${b.rowIndex}`));
  return JSON.stringify({
    roomType: state.roomType,
    dimensions: state.dimensions,
    selectedTileSize: state.selectedTileSize,
    wallColor: state.wallColor,
    zoneRows: rows,
  });
}

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

  // Load complete design (unified method)
  loadDesign:       (design: SavedDesign, setSelectedTile?: (tile: Tile | null) => void, availableTiles?: Tile[], onComplete?: () => void, sourceType?: 'design' | 'inventory') => void;

  // Clear design state (for starting fresh)
  clearDesign:      () => void;

  // Loaded snapshot for dirty-checking
  loadedSnapshot:   LoadedSnapshot | null;

  // Get current fingerprint string
  getCurrentFingerprint: () => string;

  // Check if current state has changed from the loaded snapshot
  hasDesignChanged: () => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
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

  // Loaded snapshot
  loadedSnapshot:   null,

  getCurrentFingerprint: () => {
    const s = get();
    return buildFingerprint({
      roomType: s.roomType,
      dimensions: s.dimensions,
      selectedTileSize: s.selectedTileSize,
      wallColor: s.wallColor,
      zoneRows: s.zoneRows,
    });
  },

  hasDesignChanged: () => {
    const s = get();
    if (!s.loadedSnapshot) return true; // no snapshot means fresh design — always allow save
    return s.getCurrentFingerprint() !== s.loadedSnapshot.fingerprint;
  },

  // Load a complete design with all features
  loadDesign: (design, setSelectedTile, availableTiles = [], onComplete, sourceType = 'design') => {
    // First, set all room configuration in a single atomic update
    const updates: Partial<AppState> = {
      roomType: design.roomType,
      dimensions: design.dimensions,
      selectedTileSize: design.selectedTileSize || '12x12',
      wallColor: design.wallColor || '#f0ebe4',
      zoneRows: design.zoneRows || [],
    };

    set(updates);

    // Capture snapshot AFTER state is set so fingerprint matches loaded state
    const fp = buildFingerprint({
      roomType: design.roomType,
      dimensions: design.dimensions,
      selectedTileSize: design.selectedTileSize || '12x12',
      wallColor: design.wallColor || '#f0ebe4',
      zoneRows: design.zoneRows || [],
    });
    set({
      loadedSnapshot: {
        sourceType,
        sourceId: design.id,
        fingerprint: fp,
      },
    });

    // Use setTimeout to ensure tile selection happens after state is committed
    setTimeout(() => {
      // Set selected tile if callback provided
      if (setSelectedTile) {
        if (design.selectedTileId) {
          // Try to find the tile in available tiles
          const tile = availableTiles.find(t => t.id === design.selectedTileId);
          if (tile) {
            setSelectedTile(tile);
          } else if (design.selectedTileName) {
            // Create a temporary tile object from saved data
            const [widthStr, heightStr] = (design.selectedTileSize || '12x12').split('x');
            setSelectedTile({
              id: design.selectedTileId,
              name: design.selectedTileName,
              category: 'marble',
              widthIn: parseInt(widthStr) || 12,
              heightIn: parseInt(heightStr) || 12,
              color: design.selectedTileColor || '#cccccc',
              pattern: 'solid',
              pricePerSqFt: 0,
              imageUri: design.tileImageUri,
            });
          } else {
            setSelectedTile(null);
          }
        } else {
          setSelectedTile(null);
        }
      }

      // Navigate to visualizer after a brief delay to ensure all state is committed
      setTimeout(() => {
        set({ activePage: 'visualizer' });

        // Call completion callback if provided
        if (onComplete) {
          setTimeout(onComplete, 50);
        }
      }, 50);
    }, 0);
  },

  // Clear all design state
  clearDesign: () => set({
    roomType: 'bathroom',
    dimensions: ROOM_DEFAULTS['bathroom'],
    selectedTileSize: '12x12',
    wallColor: '#f0ebe4',
    zoneRows: [],
    focusedZoneKey: null,
    loadedSnapshot: null,
  }),
}));
