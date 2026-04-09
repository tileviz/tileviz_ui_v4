// ============================================================
//  utils/format.ts — Shared formatting utilities
// ============================================================

import { RoomType } from '../types';

export function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export const ROOM_EMOJIS: Record<RoomType, string> = {
  bathroom: '🛁',
  kitchen:  '🍳',
  bedroom:  '🛏',
  balcony:  '🌆',
  parking:  '🅿️',
};

export const ROOM_BG: Record<RoomType, string> = {
  bathroom: '#e8f4ff',
  kitchen:  '#fff8e8',
  bedroom:  '#f0e8ff',
  balcony:  '#e8ffe8',
  parking:  '#f5f5f5',
};

export function calcTileStats(
  widthFt: number, lengthFt: number, heightFt: number,
  tileWidthIn: number, tileHeightIn: number,
) {
  const tileArea  = tileWidthIn * tileHeightIn;
  const floorArea = lengthFt * widthFt;
  const wallArea  = 2 * (lengthFt * heightFt) + 2 * (widthFt * heightFt);
  const totalSqFt = floorArea + wallArea;
  const tilesNeeded = Math.ceil((totalSqFt * 144 / tileArea) * 1.1);
  return { tilesNeeded, totalSqFt: +totalSqFt.toFixed(1) };
}
