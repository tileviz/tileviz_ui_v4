// ============================================================
//  utils/storage.ts
//  Platform-safe key-value storage.
//
//  ROOT CAUSE OF BLANK SCREEN FIX:
//  expo-secure-store uses a static top-level import which
//  throws on web because native modules aren't available.
//  Solution: dynamic require() inside each function, wrapped
//  in try/catch, with in-memory fallback for web/web-errors.
// ============================================================

import { Platform } from 'react-native';

// In-memory fallback (web + any SecureStore failure)
const mem: Record<string, string> = {};

function getSecureStore(): any | null {
  if (Platform.OS === 'web') return null;
  try {
    // Dynamic require avoids static import crash on web
    return require('expo-secure-store');
  } catch {
    return null;
  }
}

export async function storeSafe(key: string, value: string): Promise<void> {
  const SS = getSecureStore();
  if (!SS) {
    if (Platform.OS === 'web') { try { localStorage.setItem(key, value); } catch { mem[key] = value; } return; }
    mem[key] = value; return;
  }
  try { await SS.setItemAsync(key, value); } catch { mem[key] = value; }
}

export async function getSafe(key: string): Promise<string | null> {
  const SS = getSecureStore();
  if (!SS) {
    if (Platform.OS === 'web') { try { return localStorage.getItem(key); } catch {} }
    return mem[key] ?? null;
  }
  try { return await SS.getItemAsync(key); } catch { return mem[key] ?? null; }
}

export async function deleteSafe(key: string): Promise<void> {
  const SS = getSecureStore();
  delete mem[key];
  if (!SS) {
    if (Platform.OS === 'web') { try { localStorage.removeItem(key); } catch {} }
    return;
  }
  try { await SS.deleteItemAsync(key); } catch {}
}
