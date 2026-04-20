# 3D Engine Guide

TileViz uses **Three.js** to render a real-time 3D room with tiles applied to walls and floors.

---

## Scale System

All measurements in the 3D scene use **scene units** converted from feet:

```ts
THREE_FT_SCALE = 0.46   // 1 foot = 0.46 scene units
```

Example: A 10ft × 12ft room → 4.6 × 5.52 scene units.

---

## File Responsibilities

| File | Responsibility |
|---|---|
| `ThreeCanvas.tsx` | Platform router — renders `WebCanvas` on web, `NativeCanvas` on native |
| `scene.ts` | Creates Three.js Scene, PerspectiveCamera, lighting (ambient + point), renderer |
| `room-builder.ts` | `buildRoom()` — builds all geometry (walls, floor, fixtures) and applies materials |
| `materials.ts` | Creates and caches textures — procedural (DataTexture) and image (TextureLoader) |
| `controls.ts` | Mouse/touch orbit camera controls |

---

## Room Build Pipeline

```
RoomBuildConfig (from Zustand store)
        ↓
buildRoom(scene, config, pointLight)
        ↓
┌──────────────────────────────────┐
│  1. Floor geometry + material    │  PlaneGeometry rotated -90° on X
│  2. Ceiling (non-parking)        │  Semi-transparent, BackSide
│  3. Walls loop (N/S/E/W)         │
│     a. Plain painted wall        │  if not tiled
│     b. Tiled rows (per ZoneRow)  │  PlaneGeometry per row
│        - plain: single mesh      │
│        - pattern1/2: column loop │  THREE.Group with per-column meshes
│  4. Trim (floor + ceiling edges) │  BoxGeometry strips
│  5. Fixtures                     │  bathroom() / kitchen() / etc.
└──────────────────────────────────┘
        ↓
Returns { roomGroup, fixturesGroup }
        ↓
scene.add(roomGroup)
roomGroup.position.y = -H/2   // center room vertically
```

---

## Wall Layout

```
        wall_n (back)
        ┌────────────┐
wall_w  │            │  wall_e
(left)  │    room    │  (right)
        │            │
        └────────────┘
        wall_s (front / camera side)
```

Wall data per entry:
```ts
{ key: 'wall_n', pw: W,  rotY: 0,          px: 0,    pz: -L/2 }
{ key: 'wall_s', pw: W,  rotY: Math.PI,    px: 0,    pz:  L/2 }
{ key: 'wall_e', pw: L,  rotY: -Math.PI/2, px:  W/2, pz: 0    }
{ key: 'wall_w', pw: L,  rotY:  Math.PI/2, px: -W/2, pz: 0    }
```

---

## Tile Rows

Wall height is divided into rows based on tile height:

```ts
numRows = Math.round(heightFt / (tileHeightIn / 12))
rowH    = sceneHeight / numRows
```

For kitchen, rows start above the counter:
```ts
KITCHEN_COUNTER_FT = 2
kitchenCounterY    = (0.88 + 0.05) scene units  // matches cabinet + counter height
tileableH          = H - kitchenCounterY
```

---

## Tile Patterns

### Plain (default)
One mesh per row, full wall width.

### Pattern1 (1 in 3) — Kitchen walls
Every 3rd column is the accent tile.
```
Base Base Accent | Base Base Accent | ...
```

### Pattern2 (1 in 2) — Kitchen walls
Every 2nd column is the accent tile.
```
Base Accent | Base Accent | ...
```

### Checker — Parking floor
Checkerboard grid: `(col + row) % 2` determines base vs accent.
```
Light Dark  Light Dark
Dark  Light Dark  Light
```

All patterns use **2 shared materials + 1 shared geometry** per row/grid to minimize draw calls.

---

## Texture System

### Procedural (fallback)
`buildDataTex(color, pattern)` — generates a 256×256 `DataTexture` in memory.
Patterns: `marble`, `wood`, `mosaic`, `stone`, `solid`.
Cached by `color:pattern` key in `texCache`.

### Image (from API)
`makeImageMat(uri, repX, repY, fbColor, fbPattern)` — loads via:
- **Web**: `THREE.TextureLoader` with CORS
- **Native**: `expo-three TextureLoader`

Cached in `imgTexCache` (web) and `nativeTexCache` (native).
Falls back to procedural if load fails.

### Repeat
`repX = wallWidth / tileWidth` — how many tiles fit horizontally.
`repY = rowHeight / tileHeight` — how many tiles fit vertically.

---

## Camera & Controls

- **Camera**: PerspectiveCamera, FOV 55°, positioned inside the room
- **Orbit**: Yaw (horizontal) + Pitch (vertical) rotation around center
- **Zoom**: Mouse wheel / pinch gesture
- **Limits**: Pitch clamped to [-70°, 70°], zoom clamped to [minDist, maxDist]
- **Interior toggle**: Hides front wall (wall_s) to see inside room

---

## Screenshot Capture

```ts
// Web: renders scene to canvas, calls canvas.toDataURL()
// Native: GLView.takeSnapshotAsync({ format: 'png' })
```

Used by `ThumbnailGenerator` for automatic thumbnail generation after design save.

---

## Fixtures

Each room type has a fixture function that adds realistic 3D furniture:

| Room | Fixtures |
|---|---|
| bathroom | Bath tub, toilet, sink, mirror, towel rail |
| kitchen | Cabinets, counter, sink, overhead shelf |
| bedroom | Bed, wardrobe, window, door |
| balcony | Railing, plant pots, floor drain |
| parking | Columns, parking lines, overhead lighting |
