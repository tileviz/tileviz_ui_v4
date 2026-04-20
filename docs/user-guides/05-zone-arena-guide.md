# Zone Arena Guide

Zone Arena is the tile assignment system inside the Catalog screen. It lets you assign different tiles to different walls and floor rows.

---

## Opening Zone Arena

- **Web / Tablet**: The sidebar is always visible on the left
- **Mobile**: Tap the sidebar toggle button to open it

---

## Step 1: Room Setup

1. Select your **room type** (Bathroom / Kitchen / Bedroom / Balcony / Parking)
2. Set **dimensions** — Width, Length, Height in feet
3. Choose **tile size** (12×12, 18×18, 24×24, 12×24, 6×6, 3×6, or custom)

Room type determines which surfaces are available:
| Room | Surfaces |
|---|---|
| Bathroom | Floor + 4 Walls |
| Kitchen | Floor + 3 Walls (no back wall) |
| Bedroom | Floor only |
| Balcony | Floor only |
| Parking | Floor only |

---

## Step 2: Assign Tiles

Each surface shows rows that can be assigned a tile.

### Assigning a tile (basic)
1. Tap a row chip (e.g. "ROW 1" or "FLOOR TILE")
2. The row highlights — the catalog grid is now waiting for your selection
3. Tap any tile in the catalog grid
4. The tile is applied to that row in the 3D view

### Clearing a tile
- Tap the ✕ on a row chip to remove the tile

---

## Kitchen Wall Patterns

Kitchen walls support multi-tile patterns for a more realistic look.

### How to use
1. Tap a wall row → it expands with pattern options
2. Choose a pattern:

| Pattern | Description | Layout |
|---|---|---|
| Plain | Single tile across full row | `▬▬▬▬▬▬▬▬` |
| 1 in 3 | Accent tile every 3rd column | `▬▬◼▬▬◼▬▬◼` |
| 1 in 2 | Accent tile every 2nd column | `▬◼▬◼▬◼` |

3. Assign **Base Tile** — the main tile (most columns)
4. Assign **Accent Tile** — the highlight tile (every 3rd or 2nd column)

> All walls in a kitchen share the same row configuration — assigning to "Walls" applies to all 3 tiled walls.

---

## Parking Floor Checker Pattern

Parking floors support a checkerboard pattern — common in Indian parking areas.

### How to use
1. Tap "FLOOR TILE" row in Parking → it expands
2. Choose:
   - **Plain** — single tile across entire floor
   - **Checker** — alternating light/dark tile grid
3. For Checker: assign **Light Tile** + **Dark Tile**

The checker pattern creates a grid where:
```
Light Dark  Light Dark
Dark  Light Dark  Light
Light Dark  Light Dark
```

---

## Row Count Logic

The number of rows shown equals how many tiles fit vertically:

```
rowCount = ceil(roomHeight / (tileHeight / 12))
```

For kitchen, the 2ft counter height is subtracted:
```
rowCount = ceil((roomHeight - 2) / (tileHeight / 12))
```

This matches exactly what the 3D scene renders.

---

## Tips

- Use different tiles on lower rows vs upper rows for a two-tone wall look
- For bathrooms, a smaller tile (12×12) on the lower half and larger (24×24) on the top looks realistic
- For parking, the checker pattern works best with 20×20 inch tiles
- Kitchen counter starts at 2ft — tiles above the counter are what the customer sees
