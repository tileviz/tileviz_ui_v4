// ============================================================
//  config/index.ts — App-wide constants. No hardcoding elsewhere.
// ============================================================

export const API_BASE_URL = 'http://tilevizloadbalancer-2142620472.ap-south-1.elb.amazonaws.com';

export const TOKEN_KEYS = {
  access: 'tileviz_access_token',
  refresh: 'tileviz_refresh_token',
} as const;

export const TILE_SIZES = ['12x12', '18x18', '24x24', '12x24', '6x6', '3x6', 'custom'] as const;

export const ROOM_TYPES = [
  { key: 'bathroom', icon: '🛁', label: 'Bathroom' },
  { key: 'kitchen', icon: '🍳', label: 'Kitchen' },
  { key: 'bedroom', icon: '🛏', label: 'Bedroom' },
  { key: 'balcony', icon: '🌆', label: 'Balcony' },
  { key: 'parking', icon: '🅿️', label: 'Parking' },
] as const;

// Default dimensions per room type (ft)
export const ROOM_DEFAULTS: Record<string, { width: number; length: number; height: number }> = {
  bathroom: { width: 8, length: 10, height: 10 },
  kitchen: { width: 10, length: 12, height: 10 },
  bedroom: { width: 12, length: 14, height: 10 },
  balcony: { width: 6, length: 10, height: 10 },
  parking: { width: 16, length: 20, height: 10 },
};

export const CAT_TABS = [
  { key: 'all', icon: '✦', label: 'All' },
  { key: 'bathroom', icon: '🛁', label: 'Bathroom' },
  { key: 'kitchen', icon: '🍳', label: 'Kitchen' },
  { key: 'bedroom', icon: '🛏', label: 'Bedroom' },
  { key: 'balcony', icon: '🌆', label: 'Balcony' },
  { key: 'parking', icon: '🅿️', label: 'Parking' },
] as const;

// Room-specific tile size filters (displayed as sub-chips)
export const ROOM_SIZE_FILTERS: Record<string, { label: string; wIn: number; hIn: number }[]> = {
  bathroom: [
    { label: '10×15″', wIn: 10, hIn: 15 },
    { label: '12×18″', wIn: 12, hIn: 18 },
    { label: '12×12″', wIn: 12, hIn: 12 },
    { label: '24×24″', wIn: 24, hIn: 24 },
  ],
  kitchen: [
    { label: '10×15″', wIn: 10, hIn: 15 },
    { label: '12×18″', wIn: 12, hIn: 18 },
    { label: '12×12″', wIn: 12, hIn: 12 },
    { label: '12×24″', wIn: 12, hIn: 24 },
  ],
  bedroom: [
    { label: '1×1 ft', wIn: 12, hIn: 12 },
    { label: '2×2 ft', wIn: 24, hIn: 24 },
    { label: '2×4 ft', wIn: 24, hIn: 48 },
    { label: '4×6 ft', wIn: 48, hIn: 72 },
  ],
  balcony: [
    { label: '1×1 ft', wIn: 12, hIn: 12 },
    { label: '2×2 ft', wIn: 24, hIn: 24 },
    { label: '12×18″', wIn: 12, hIn: 18 },
  ],
  parking: [
    { label: '12×12″', wIn: 12, hIn: 12 },
    { label: '16×16″', wIn: 16, hIn: 16 },
    { label: '20×20″', wIn: 20, hIn: 20 },
  ],
};

export const THREE_FT_SCALE = 0.46; // 1 ft = 0.46 scene units

export const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};
