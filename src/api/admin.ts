// ============================================================
//  api/admin.ts — /api/admin/* + /api/shops/* + /api/catalog-requests/*
// ============================================================

import client from './client';
import { UserRole } from '../types';

// ── Stats ────────────────────────────────────────────────────
export const getAdminStats = async () => {
  const { data } = await client.get('/api/admin/stats');
  return data.stats;
};

// ── Users ────────────────────────────────────────────────────
export const getAdminUsers = async (p?: { role?: UserRole; shopId?: string; isActive?: boolean }) => {
  const { data } = await client.get('/api/admin/users', { params: p });
  return data.users as any[];
};
export const createAdminUser = async (p: { name: string; role: 'shop_owner' | 'sales_person'; email?: string; shopId?: string; password?: string }) => {
  const { data } = await client.post('/api/admin/users', p);
  return data;
};
export const patchAdminUser      = async (id: string, u: any) => { const { data } = await client.patch(`/api/admin/users/${id}`, u); return data.user; };
export const deactivateUser      = async (id: string) => { const { data } = await client.delete(`/api/admin/users/${id}`); return data; };
export const deleteUserPermanent = async (id: string) => { const { data } = await client.delete(`/api/admin/users/${id}/permanent`); return data; };
export const resetUserPassword   = async (id: string, password?: string) => { const { data } = await client.put(`/api/admin/users/${id}/reset-password`, { password }); return data; };

// ── Shops ────────────────────────────────────────────────────
export const getAdminShops    = async () => { const { data } = await client.get('/api/admin/shops'); return data.shops as any[]; };
export const createAdminShop  = async (p: any) => { const { data } = await client.post('/api/admin/shops', p); return data; };
export const updateAdminShop  = async (id: string, u: any) => { const { data } = await client.put(`/api/admin/shops/${id}`, u); return data.shop; };
export const assignSalesPerson = async (shopId: string, salesPersonId: string) => { const { data } = await client.put(`/api/admin/shops/${shopId}/assign-sp`, { salesPersonId }); return data; };
export const removeSalesPerson = async (shopId: string, salesPersonId: string) => { const { data } = await client.put(`/api/admin/shops/${shopId}/remove-sp`, { salesPersonId }); return data; };

// ── Shop Owner ───────────────────────────────────────────────
export const getMyShop            = async () => { const { data } = await client.get('/api/shops/my-shop'); return data; };
export const getMyShopSalesPersons = async () => { const { data } = await client.get('/api/shops/my-shop/sales-persons'); return data.salesPersons as any[]; };

// ── Catalog Requests ─────────────────────────────────────────
export const getCatalogRequests   = async (status?: string) => { const { data } = await client.get('/api/catalog-requests', { params: status ? { status } : {} }); return data.requests as any[]; };
export const reviewCatalogRequest = async (id: string, status: 'approved' | 'rejected', reviewNote?: string) => { const { data } = await client.put(`/api/catalog-requests/${id}/review`, { status, reviewNote }); return data; };
