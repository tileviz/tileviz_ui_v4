// ============================================================
//  api/rooms.ts — /api/rooms/* endpoints
// ============================================================

import client from './client';
import { RoomType, RoomDimensions, SavedDesign, ZoneRow } from '../types';
import { ROOM_EMOJIS } from '../utils/format';

export interface ApiRoom {
  _id: string; name: string; roomType: RoomType;
  dimensions: { length: number; width: number; height: number };
  tileSize: { width: number; height: number };
  zoneRows?: ZoneRow[];
  wallColor?: string;
  selectedTileSize?: string;
  selectedTileId?: string;
  selectedTileName?: string;
  selectedTileImageUri?: string;
  selectedTileColor?: string;
  rowConfigs: {
    back:  { tileId: any; color: string }[];
    left:  { tileId: any; color: string }[];
    right: { tileId: any; color: string }[];
    floor: { tileId: any; color: string }[];
  };
  calculatedTiles: { floorTiles: number; wallTiles: number; totalTiles: number; totalAreaSqFt: number; };
  createdAt: string;
}

export function mapRoom(r: ApiRoom): SavedDesign {
  // Pick the best tile preview — prefer selected tile, then first zone row with an image
  const firstImgRow = r.zoneRows?.find(zr => !!zr.tileImageUri);
  return {
    id: r._id, name: r.name, roomType: r.roomType,
    emoji: ROOM_EMOJIS[r.roomType] ?? '🏠',
    dimensions: r.dimensions,
    createdAt: r.createdAt?.substring(0, 10) ?? '',
    // Tile preview
    tileName:       r.selectedTileName  || firstImgRow?.tileName,
    tileImageUri:   r.selectedTileImageUri || firstImgRow?.tileImageUri,
    tileColor:      r.selectedTileColor || firstImgRow?.color,
    // Full restore state
    zoneRows:         r.zoneRows ?? [],
    wallColor:        r.wallColor ?? '#f0ebe4',
    selectedTileSize: r.selectedTileSize ?? '12x12',
    selectedTileId:   r.selectedTileId ?? '',
    selectedTileName: r.selectedTileName ?? '',
    selectedTileColor: r.selectedTileColor ?? '#cccccc',
  };
}

export interface SaveRoomPayload {
  name: string; roomType: RoomType;
  dimensions: { length: number; width: number; height: number };
  tileSize: { width: number; height: number };
  zoneRows?: ZoneRow[];
  wallColor?: string;
  selectedTileSize?: string;
  selectedTileId?: string;
  selectedTileName?: string;
  selectedTileImageUri?: string;
  selectedTileColor?: string;
}

export const getRooms    = async (): Promise<SavedDesign[]> => { const { data } = await client.get<{ success: boolean; rooms: ApiRoom[] }>('/api/rooms'); return data.rooms.map(mapRoom); };
export const getRoomById = async (id: string): Promise<ApiRoom> => { const { data } = await client.get<{ success: boolean; room: ApiRoom }>(`/api/rooms/${id}`); return data.room; };
export const saveRoom    = async (p: SaveRoomPayload): Promise<SavedDesign> => { const { data } = await client.post<{ success: boolean; room: ApiRoom }>('/api/rooms', p); return mapRoom(data.room); };
export const updateRoom  = async (id: string, p: Partial<SaveRoomPayload>): Promise<SavedDesign> => { const { data } = await client.put<{ success: boolean; room: ApiRoom }>(`/api/rooms/${id}`, p); return mapRoom(data.room); };
export const deleteRoom  = async (id: string): Promise<void> => { await client.delete(`/api/rooms/${id}`); };
export const calcTilesApi = async (dimensions: any, tileSize: any) => { const { data } = await client.post('/api/rooms/calculate', { dimensions, tileSize }); return data; };
