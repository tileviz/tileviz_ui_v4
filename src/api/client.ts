// ============================================================
//  api/client.ts — Axios instance + JWT refresh interceptor
//  Session FIX (#10): tokens persisted via secure storage.
//  Silent refresh on TOKEN_EXPIRED (15m access / 7d refresh).
// ============================================================

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL, TOKEN_KEYS } from '../config';
import { storeSafe, getSafe, deleteSafe } from '../utils/storage';

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Token helpers ────────────────────────────────────────────
export async function storeTokens(access: string, refresh: string) {
  await storeSafe(TOKEN_KEYS.access,  access);
  await storeSafe(TOKEN_KEYS.refresh, refresh);
}
export async function clearTokens() {
  await deleteSafe(TOKEN_KEYS.access);
  await deleteSafe(TOKEN_KEYS.refresh);
}
export const getAccessToken  = () => getSafe(TOKEN_KEYS.access);
export const getRefreshToken = () => getSafe(TOKEN_KEYS.refresh);

// ── Request interceptor ──────────────────────────────────────
client.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  err => Promise.reject(err),
);

// ── Response interceptor — silent refresh ────────────────────
let isRefreshing = false;
let queue: { resolve: (v: string) => void; reject: (e: any) => void }[] = [];

function drainQueue(err: any, token: string | null) {
  queue.forEach(({ resolve, reject }) => err ? reject(err) : resolve(token!));
  queue = [];
}

client.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error) => {
    const req = error.config;
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !req._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject }))
          .then(token => { req.headers.Authorization = `Bearer ${token}`; return client(req); });
      }
      req._retry   = true;
      isRefreshing = true;
      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) throw new Error('no_refresh');
        const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken });
        await storeTokens(data.accessToken, data.refreshToken);
        client.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
        drainQueue(null, data.accessToken);
        req.headers.Authorization = `Bearer ${data.accessToken}`;
        return client(req);
      } catch (e) {
        drainQueue(e, null);
        await clearTokens();
        authBus.emit('unauthorized');
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

// ── Auth event bus ───────────────────────────────────────────
class EventBus {
  private map: Record<string, (() => void)[]> = {};
  on(ev: string, cb: () => void)  { (this.map[ev] ??= []).push(cb); }
  off(ev: string, cb: () => void) { this.map[ev] = (this.map[ev] ?? []).filter(l => l !== cb); }
  emit(ev: string)                { (this.map[ev] ?? []).forEach(cb => cb()); }
}
export const authBus = new EventBus();

export default client;
