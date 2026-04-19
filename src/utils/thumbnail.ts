// utils/thumbnail.ts — save/load 3D screenshot thumbnails locally
import { Platform } from 'react-native';

const THUMB_PREFIX = 'thumb_';

async function getDir(): Promise<string> {
  const fs = require('expo-file-system');
  return fs.cacheDirectory + 'thumbnails/';
}

export async function saveThumbnail(designId: string, dataUri: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(THUMB_PREFIX + designId, dataUri); } catch {}
    return;
  }
  try {
    const fs = require('expo-file-system');
    const dir = await getDir();
    await fs.makeDirectoryAsync(dir, { intermediates: true });
    // dataUri is "data:image/png;base64,<b64>" — strip prefix
    const b64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
    await fs.writeAsStringAsync(dir + designId + '.jpg', b64, { encoding: fs.EncodingType.Base64 });
  } catch (e) {
    console.warn('[Thumbnail] save failed:', e);
  }
}

export async function loadThumbnail(designId: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(THUMB_PREFIX + designId); } catch {}
    return null;
  }
  try {
    const fs = require('expo-file-system');
    const path = (await getDir()) + designId + '.jpg';
    const info = await fs.getInfoAsync(path);
    if (!info.exists) return null;
    return path;
  } catch {
    return null;
  }
}

export async function deleteThumbnail(designId: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(THUMB_PREFIX + designId); } catch {}
    return;
  }
  try {
    const fs = require('expo-file-system');
    const path = (await getDir()) + designId + '.jpg';
    await fs.deleteAsync(path, { idempotent: true });
  } catch {}
}
