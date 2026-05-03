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
export type TilePattern = 'plain' | 'alternate' | 'checker' | 'block' | 'pattern1' | 'pattern2' | 'circle';

export interface ZoneRow {
  rowIndex:      number;
  wallKey:       string;
  tileId?:       string;
  tileName?:     string;
  tileImageUri?: string;
  color?:        string;
  pattern?:      string;
  tileWidthIn?:  number;
  tileHeightIn?: number;
  // ── Pattern fields (Wall Designer) ──
  patternType?:       TilePattern;    // how tiles are arranged in this row
  tileBId?:           string;         // second tile ID (for patterns)
  tileBName?:         string;
  tileBImageUri?:     string;
  tileBColor?:        string;
  // ── Circle pattern: 4 quadrant tiles (Q1=top-left, Q2=top-right, Q3=bottom-left, Q4=bottom-right) ──
  tileCId?:           string;         // third tile (Q3 — bottom-left)
  tileCName?:         string;
  tileCImageUri?:     string;
  tileCColor?:        string;
  tileDId?:           string;         // fourth tile (Q4 — bottom-right)
  tileDName?:         string;
  tileDImageUri?:     string;
  tileDColor?:        string;
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
  tileImageUri?: string;       // primary tile image URI
  zoneRows:     ZoneRow[];     // full zone assignments
  shopId?:      string;
  shopName?:    string;
  createdBy?:   string;        // user name
  createdByRole?: UserRole;
  createdAt:    string;
  updatedAt?:   string;        // last update timestamp
  status:       'draft' | 'active' | 'archived';
  // Full design restoration fields
  wallColor?:            string;
  selectedTileId?:       string;
  selectedTileName?:     string;
  selectedTileColor?:    string;
  selectedTileImageUri?: string;
  // Admin screen fields
  quantity?:      number;
  price?:         number;
  availability?:  'in-stock' | 'out-of-stock' | 'low-stock';
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
