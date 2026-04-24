// ============================================================
//  api/inventory.ts — Inventory (saved room designs) API
// ============================================================

import client from './client';
import { InventoryItem, ApiResponse } from '../types';
import { packZoneRows, unpackZoneRows } from './rooms';

export interface CreateInventoryPayload {
  name:                 string;
  roomType:             string;
  dimensions:           { width: number; length: number; height: number };
  tileSize:             string;
  tileName?:            string;
  tileColor?:           string;
  tileImageUri?:        string;
  zoneRows:             any[];
  wallColor?:           string;
  selectedTileId?:      string;
  selectedTileName?:    string;
  selectedTileColor?:   string;
  selectedTileImageUri?: string;
  status?:              'draft' | 'active' | 'archived';
  quantity?:            number;
  price?:               number;
  availability?:        'in-stock' | 'out-of-stock' | 'low-stock';
}

export interface UpdateInventoryPayload extends Partial<CreateInventoryPayload> {
  id: string;
}

// ── List inventory items ──
export async function getInventory(filters?: {
  status?: string;
  roomType?: string;
  shopId?: string;
}): Promise<InventoryItem[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.roomType) params.append('roomType', filters.roomType);
  if (filters?.shopId) params.append('shopId', filters.shopId);

  const query = params.toString();
  const url = query ? `/api/inventory?${query}` : '/api/inventory';

  const res = await client.get<ApiResponse<InventoryItem[]>>(url);
  const items = res.data.data || [];
  return items.map(item => ({ ...item, zoneRows: unpackZoneRows(item.zoneRows ?? []) }));
}

// ── Get single inventory item ──
export async function getInventoryItem(id: string): Promise<InventoryItem> {
  const res = await client.get<ApiResponse<InventoryItem>>(`/api/inventory/${id}`);
  if (!res.data.success || !res.data.data) {
    throw new Error('Inventory item not found');
  }
  const item = res.data.data;
  return { ...item, zoneRows: unpackZoneRows(item.zoneRows ?? []) };
}

// ── Create inventory item ──
export async function createInventory(payload: CreateInventoryPayload): Promise<InventoryItem> {
  const packed = { ...payload, zoneRows: packZoneRows(payload.zoneRows ?? []) };
  const res = await client.post<ApiResponse<InventoryItem>>('/api/inventory', packed);
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message || 'Failed to create inventory item');
  }
  const item = res.data.data;
  return { ...item, zoneRows: unpackZoneRows(item.zoneRows ?? []) };
}

// ── Update inventory item ──
export async function updateInventory(id: string, payload: Partial<CreateInventoryPayload>): Promise<InventoryItem> {
  const packed = payload.zoneRows ? { ...payload, zoneRows: packZoneRows(payload.zoneRows) } : payload;
  const res = await client.put<ApiResponse<InventoryItem>>(`/api/inventory/${id}`, packed);
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message || 'Failed to update inventory item');
  }
  const item = res.data.data;
  return { ...item, zoneRows: unpackZoneRows(item.zoneRows ?? []) };
}

// ── Delete inventory item ──
export async function deleteInventory(id: string): Promise<void> {
  const res = await client.delete<ApiResponse<void>>(`/api/inventory/${id}`);
  if (!res.data.success) {
    throw new Error(res.data.message || 'Failed to delete inventory item');
  }
}
