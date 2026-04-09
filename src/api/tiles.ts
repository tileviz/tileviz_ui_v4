// ============================================================
//  api/tiles.ts — /api/tiles/* endpoints
// ============================================================

import client, { getAccessToken } from './client';
import { Tile, TileCategory } from '../types';
import { API_BASE_URL } from '../config';

export interface ApiTile {
  _id: string; name: string; description?: string; category: TileCategory;
  roomType?: string;
  color: string; pattern: string;
  size: { width: number; height: number };
  manufacturer?: string; pricePerSqFt: number; imageUrl?: string;
  shop?: { _id: string; name: string };
  uploadedBy?: { _id: string; name: string; email: string };
  approvalStatus: 'pending' | 'approved' | 'rejected';
  isTemporary?: boolean; expiresAt?: string; isActive: boolean;
}

// Build the fully-qualified image URL that both the React Native Image
// component and Three.js TextureLoader can load.
// The backend stores either:
//   - /uploads/tiles/filename.jpg   (disk storage — new uploads)
//   - http://...                    (legacy absolute URL — ignored gracefully)
function buildImageUri(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined;
  // Relative path from disk storage → prepend API base
  if (imageUrl.startsWith('/')) return `${API_BASE_URL}${imageUrl}`;
  // Already an absolute URL (legacy or future CDN) → use as-is
  if (imageUrl.startsWith('http')) return imageUrl;
  return undefined;
}

export function mapTile(t: ApiTile): Tile {
  return {
    id: t._id, name: t.name, category: t.category,
    roomType: (t.roomType as any) || undefined,
    widthIn: t.size.width, heightIn: t.size.height,
    color: t.color, pattern: t.pattern,
    manufacturer: t.manufacturer, pricePerSqFt: t.pricePerSqFt,
    imageUri: buildImageUri(t.imageUrl),
    status: t.approvalStatus === 'approved' ? 'active' : 'pending',
    shopId: t.shop?._id,
  };
}

/** GET /api/tiles */
export async function getTiles(params?: { category?: string; search?: string }): Promise<Tile[]> {
  const { data } = await client.get<{ success: boolean; tiles: ApiTile[] }>('/api/tiles', { params });
  return data.tiles.map(mapTile);
}

/** GET /api/tiles/pending */
export async function getPendingTiles() {
  const { data } = await client.get('/api/tiles/pending');
  return data;
}

/** GET /api/tiles/my-temporary */
export async function getMyTemporaryTiles(): Promise<Tile[]> {
  const { data } = await client.get<{ success: boolean; tiles: ApiTile[] }>('/api/tiles/my-temporary');
  return data.tiles.map(mapTile);
}

/** POST /api/tiles — multipart/form-data
 *
 *  Uses native fetch (NOT the axios client) because the axios instance has a
 *  global default of Content-Type: application/json. In axios v1.x this causes
 *  FormData to be serialised as JSON, which means multer never sees the file.
 *  Native fetch leaves Content-Type unset so the runtime adds the correct
 *  multipart/form-data; boundary=... header automatically.
 */
export async function uploadTile(formData: FormData): Promise<Tile> {
  const token = await getAccessToken();
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // No Content-Type — browser / React Native sets multipart boundary automatically

  const response = await fetch(`${API_BASE_URL}/api/tiles`, {
    method: 'POST',
    headers,
    body: formData,
  });

  let body: any;
  try { body = await response.json(); } catch (_) { body = {}; }

  if (!response.ok) {
    const err: any = new Error(body?.message ?? 'Upload failed');
    err.response = { data: body };
    throw err;
  }

  return mapTile(body.tile);
}

/** PUT /api/tiles/approve/:requestId */
export async function approveRequest(requestId: string, status: 'approved' | 'rejected', reviewNote?: string) {
  const { data } = await client.put(`/api/tiles/approve/${requestId}`, { status, reviewNote });
  return data;
}

/** DELETE /api/tiles/:id */
export async function deleteTile(id: string) {
  const { data } = await client.delete(`/api/tiles/${id}`);
  return data;
}
