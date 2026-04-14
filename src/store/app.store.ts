// ============================================================
//  store/app.store.ts — Visualizer + Zone + Saved state (#12)
// ============================================================

import { create } from 'zustand';
import { RoomType, RoomDimensions, ZoneRow, SavedDesign, Tile } from '../types';
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

  // Load complete design (unified method)
  loadDesign:       (design: SavedDesign, setSelectedTile?: (tile: Tile | null) => void, availableTiles?: Tile[], onComplete?: () => void) => void;

  // Clear design state (for starting fresh)
  clearDesign:      () => void;
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

  // Load a complete design with all features
  loadDesign: (design, setSelectedTile, availableTiles = [], onComplete) => {
    // First, set all room configuration in a single atomic update
    const updates: Partial<AppState> = {
      roomType: design.roomType,
      dimensions: design.dimensions,
      selectedTileSize: design.selectedTileSize || '12x12',
      wallColor: design.wallColor || '#f0ebe4',
      zoneRows: design.zoneRows || [],
    };

    set(updates);

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
  }),
}));
