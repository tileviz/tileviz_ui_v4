// ============================================================
//  types/index.ts — All shared TypeScript types
//  Matches backend models exactly (no extra/missing fields)
// ============================================================

// ── Auth ──────────────────────────────────────────────────────
export type UserRole = 'admin' | 'shop_owner' | 'sales_person';

export interface User {
  id:           string;
  name:         string;
  email:        string;
  role:         UserRole;
  initials:     string;
  shop?:        string | null;
  assignedShop?: string | null;
  isActive?:    boolean;
}

// ── Room ──────────────────────────────────────────────────────
export type RoomType = 'bathroom' | 'kitchen' | 'bedroom' | 'balcony' | 'parking';

export interface RoomDimensions {
  width:  number;   // ft  X axis
  length: number;   // ft  Z axis
  height: number;   // ft  Y axis
}

// ── Tile ──────────────────────────────────────────────────────
export type TileCategory = 'marble' | 'ceramic' | 'stone' | 'mosaic' | 'wood' | 'pending';

export interface Tile {
  id:            string;
  name:          string;
  category:      TileCategory;
  roomType?:     RoomType;
  widthIn:       number;
  heightIn:      number;
  color:         string;
  pattern:       string;
  manufacturer?: string;
  pricePerSqFt:  number;
  imageUri?:     string;
  status?:       'active' | 'pending';
  shopId?:       string;
}

// ── Zone Design ───────────────────────────────────────────────
export interface ZoneRow {
  rowIndex:      number;
  wallKey:       string;
  tileId?:       string;
  tileName?:     string;
  tileImageUri?: string;
  color?:        string;
  pattern?:      string;
}

// ── Saved Design ─────────────────────────────────────────────
export interface SavedDesign {
  id:                   string;
  name:                 string;
  roomType:             RoomType;
  dimensions:           RoomDimensions;
  emoji:                string;
  createdAt:            string;
  // Tile preview info
  tileName?:            string;
  tileImageUri?:        string;
  tileColor?:           string;
  // Full state needed for restore
  zoneRows?:            ZoneRow[];
  wallColor?:           string;
  selectedTileSize?:    string;
  selectedTileId?:      string;
  selectedTileName?:    string;
  selectedTileColor?:   string;
}

// ── Navigation ────────────────────────────────────────────────
export type NavPage =
  | 'visualizer'
  | 'catalog'
  | 'zones'
  | 'saved'
  | 'inventory'
  | 'dashboard'
  | 'admin';

// ── Inventory (saved designs library) ─────────────────────────
export interface InventoryItem {
  id:           string;
  name:         string;
  roomType:     RoomType;
  dimensions:   RoomDimensions;
  tileSize:     string;        // e.g. "12x12" or "custom"
  tileName?:    string;        // primary tile name
  tileColor?:   string;        // primary tile color for thumbnail
  zoneRows:     ZoneRow[];     // full zone assignments
  shopId?:      string;
  shopName?:    string;
  createdBy?:   string;        // user name
  createdByRole?: UserRole;
  createdAt:    string;
  status:       'draft' | 'active' | 'archived';
}

// ── Misc ──────────────────────────────────────────────────────
export interface Shop {
  _id:          string;
  name:         string;
  email?:       string;
  phone?:       string;
  plan:         'starter' | 'pro' | 'enterprise';
  isActive:     boolean;
  owner?:       { name: string; email: string };
  salesPersons?: any[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?:   T;
  message?: string;
}
