// ============================================================
//  api/audit.ts — Audit log endpoints (admin only)
// ============================================================

import client from './client';
import { API_BASE_URL } from '../config';

export interface AuditLog {
  _id: string;
  timestamp: string;
  userId:    string | null;
  userName:  string;
  userRole:  string | null;
  userEmail: string | null;
  shopId:    string | null;
  shopName:  string | null;
  action:    string;
  category:  string;
  resource:  string | null;
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
  platform:  'mobile' | 'web' | 'unknown';
  method:    string | null;
  path:      string | null;
  statusCode: number | null;
  durationMs: number | null;
  metadata:  Record<string, any> | null;
}

export interface AuditLogsResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  pages: number;
  logs: AuditLog[];
}

export interface AuditStatsResponse {
  success: boolean;
  stats: {
    loginsToday:       number;
    failedLoginsToday: number;
    tileUploadsWeek:   number;
    totalEventsMonth:  number;
    byCategory: { _id: string; count: number }[];
    byPlatform:  { _id: string; count: number }[];
    recentActions: { _id: string; count: number }[];
  };
}

export interface AuditFilters {
  page?:     number;
  limit?:    number;
  userId?:   string;
  shopId?:   string;
  category?: string;
  action?:   string;
  search?:   string;
  platform?: string;
  from?:     string; // ISO date string
  to?:       string; // ISO date string
}

/** GET /api/audit — paginated list */
export async function getAuditLogs(filters: AuditFilters = {}): Promise<AuditLogsResponse> {
  const { data } = await client.get<AuditLogsResponse>('/api/audit', { params: filters });
  return data;
}

/** GET /api/audit/stats — dashboard counts */
export async function getAuditStats(): Promise<AuditStatsResponse> {
  const { data } = await client.get<AuditStatsResponse>('/api/audit/stats');
  return data;
}

/**
 * GET /api/audit/export — download CSV.
 * Builds the URL with query params and returns it so the caller can open
 * it in a browser tab (web) or use Linking.openURL (native).
 */
export function buildAuditExportUrl(filters: AuditFilters = {}): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return `${API_BASE_URL}/api/audit/export${qs ? `?${qs}` : ''}`;
}
