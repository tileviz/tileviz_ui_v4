# State Management

TileViz uses **Zustand** — 3 separate stores, each with a single responsibility.

---

## Store Overview

| Store | File | Owns |
|---|---|---|
| `useAppStore` | `store/app.store.ts` | Room config, zone rows, wall color, selected tile, active page |
| `useCatalogStore` | `store/catalog.store.ts` | Tiles list, assigning key, sidebar open state, zone step |
| `useAuthStore` | `store/auth.store.ts` | Logged-in user, ready flag |

---

## app.store.ts

Controls everything about the current 3D room configuration.

```ts
// Key state
roomType: RoomType                // 'bathroom' | 'kitchen' | 'bedroom' | 'balcony' | 'parking'
dimensions: { width, length, height }  // in feet
selectedTileSize: string          // '12x12' | '18x18' | ... | 'custom'
selectedTile: Tile | null         // currently selected tile from catalog
zoneRows: ZoneRow[]               // tile assignments per wall/floor row
wallColor: string                 // hex color for untiled walls
activePage: string                // which screen is active

// Key actions
setRoomType(rt)
setDimensions(d)
setTileSize(s)
setSelectedTile(t)
setZoneRows(rows)
setWallColor(hex)
setActivePage(page)
loadDesign(design, setTile, tiles, callback)  // loads a saved design into the visualizer
```

### ZoneRow shape
```ts
{
  wallKey: string        // 'floor' | 'walls' | 'wall_n' | 'wall_s' | 'wall_e' | 'wall_w'
  rowIndex: number       // 0-based row index from bottom
  tileId?: string        // base tile ID
  tileName?: string
  tileImageUri?: string
  color?: string         // base tile color hex
  patternType?: TilePattern  // 'plain' | 'pattern1' | 'pattern2' | 'checker'
  tileBId?: string       // accent tile ID (for pattern/checker)
  tileBName?: string
  tileBImageUri?: string
  tileBColor?: string
}
```

---

## catalog.store.ts

Controls the catalog browsing and tile assignment flow.

```ts
// Key state
tiles: Tile[]                // full tile catalog from API
assigningKey: string | null  // which zone slot is waiting for tile selection
                             // format: 'wallKey:rowIndex' or 'wallKey:rowIndex:accent'
sidebarOpen: boolean         // whether CatalogSidebar is visible (mobile)
zoneStep: 1 | 2              // Zone Arena step (1 = room select, 2 = tile assign)

// Key actions
setTiles(tiles)
setAssigningKey(key | null)
setSidebarOpen(bool)
setZoneStep(step)
```

### assigningKey format
```
'floor:0'           → assign base tile to floor
'walls:2'           → assign base tile to row 2 on all walls
'walls:2:accent'    → assign accent tile to row 2 on all walls
'wall_n:1'          → assign base tile to row 1 on north wall only
```

---

## auth.store.ts

Controls authentication state.

```ts
// Key state
user: AppUser | null    // null = not logged in
isReady: boolean        // false until session restore check completes on boot

// AppUser shape
{
  id: string
  name: string
  email: string
  role: 'admin' | 'shop_owner' | 'sales_person'
  plan?: string
  shopId?: string
}

// Key actions
setUser(user | null)
setReady(bool)
```

---

## Data Flow Pattern

```
User action (tap tile in catalog)
        ↓
CatalogScreen.handleTilePress()
        ↓
Reads assigningKey from useCatalogStore
        ↓
Updates zoneRows in useAppStore
        ↓
ThreeCanvas receives new config via prop
        ↓
buildRoom() rebuilds 3D scene
```

---

## Rules

- Never use functional updaters (`prev => ...`) with Zustand setters — pass the new value directly
- Read store values by destructuring: `const { roomType, setRoomType } = useAppStore()`
- Never store derived data in the store — compute it in the component with `useMemo`
