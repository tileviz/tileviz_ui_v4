// ============================================================
//  api/rooms.ts — /api/rooms/* endpoints
// ============================================================

import client from './client';
import { RoomType, RoomDimensions, SavedDesign, ZoneRow } from '../types';
import { ROOM_EMOJIS } from '../utils/format';

// ── ZoneRow pattern packing ─────────────────────────────────
// The backend Mongoose schema only stores a fixed set of ZoneRow
// fields.  Pattern fields (patternType, tileBId, tileBName,
// tileBImageUri, tileBColor) are NOT in the schema and get
// stripped on save.  To survive the round-trip we serialise them
// into the `pattern` string field (which IS persisted) as JSON
// and restore them on load.
//
// Packed format:  JSON string  { p, pt, bi, bn, bu, bc }
//   p  = original pattern value (e.g. "solid")
//   pt = patternType
//   bi = tileBId
//   bn = tileBName
//   bu = tileBImageUri
//   bc = tileBColor

function hasPatternMeta(row: any): boolean {
  return !!(row.patternType || row.tileBId || row.tileBName || row.tileBImageUri || row.tileBColor);
}

/** Pack pattern fields into the `pattern` string for persistence. */
export function packZoneRows(rows: ZoneRow[]): ZoneRow[] {
  return rows.map(row => {
    if (!hasPatternMeta(row)) return row;
    const packed = JSON.stringify({
      p:  row.pattern ?? 'solid',
      pt: row.patternType,
      bi: row.tileBId,
      bn: row.tileBName,
      bu: row.tileBImageUri,
      bc: row.tileBColor,
    });
    // Return a copy with pattern fields removed (backend would strip
    // them anyway) and the packed JSON in `pattern`.
    const { patternType, tileBId, tileBName, tileBImageUri, tileBColor, ...rest } = row as any;
    return { ...rest, pattern: packed };
  });
}

/** Unpack pattern fields from the `pattern` string after loading. */
export function unpackZoneRows(rows: ZoneRow[]): ZoneRow[] {
  return rows.map(row => {
    const p = row.pattern;
    if (!p || !p.startsWith('{')) return row; // plain string like "solid" — nothing to unpack
    try {
      const meta = JSON.parse(p);
      return {
        ...row,
        pattern:       meta.p ?? 'solid',
        patternType:   meta.pt,
        tileBId:       meta.bi,
        tileBName:     meta.bn,
        tileBImageUri: meta.bu,
        tileBColor:    meta.bc,
      };
    } catch {
      return row; // corrupt JSON — leave as-is
    }
  });
}

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
  const rawRows = r.zoneRows ?? [];
  const rows = unpackZoneRows(rawRows);
  const firstImgRow = rows.find(zr => !!zr.tileImageUri);
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
    zoneRows:         rows,
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
export const saveRoom    = async (p: SaveRoomPayload): Promise<SavedDesign> => { const packed = { ...p, zoneRows: p.zoneRows ? packZoneRows(p.zoneRows) : [] }; const { data } = await client.post<{ success: boolean; room: ApiRoom }>('/api/rooms', packed); return mapRoom(data.room); };
export const updateRoom  = async (id: string, p: Partial<SaveRoomPayload>): Promise<SavedDesign> => { const packed = p.zoneRows ? { ...p, zoneRows: packZoneRows(p.zoneRows) } : p; const { data } = await client.put<{ success: boolean; room: ApiRoom }>(`/api/rooms/${id}`, packed); return mapRoom(data.room); };
export const deleteRoom  = async (id: string): Promise<void> => { await client.delete(`/api/rooms/${id}`); };
export const calcTilesApi = async (dimensions: any, tileSize: any) => { const { data } = await client.post('/api/rooms/calculate', { dimensions, tileSize }); return data; };
