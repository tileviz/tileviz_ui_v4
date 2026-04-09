// ============================================================
//  utils/storage.ts — Cross-platform storage helpers
//  Uses localStorage on web, AsyncStorage on native
// ============================================================

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Helper functions for token storage (used by client.ts) ──
export async function storeSafe(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } catch (e) {
    console.error(`storeSafe error for key ${key}:`, e);
  }
}

export async function getSafe(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      return await AsyncStorage.getItem(key);
    }
  } catch (e) {
    console.error(`getSafe error for key ${key}:`, e);
    return null;
  }
}

export async function deleteSafe(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  } catch (e) {
    console.error(`deleteSafe error for key ${key}:`, e);
  }
}

