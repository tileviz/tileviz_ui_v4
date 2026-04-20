# Tile Pattern Diagrams

## Kitchen Wall Patterns

### Plain
All columns use the same base tile.
```
┌────┬────┬────┬────┬────┬────┐
│ B  │ B  │ B  │ B  │ B  │ B  │
├────┼────┼────┼────┼────┼────┤
│ B  │ B  │ B  │ B  │ B  │ B  │
└────┴────┴────┴────┴────┴────┘
B = Base tile
```

### Pattern 1 — 1 in 3 (Accent every 3rd column)
```
┌────┬────┬────┬────┬────┬────┐
│ B  │ B  │ A  │ B  │ B  │ A  │
├────┼────┼────┼────┼────┼────┤
│ B  │ B  │ A  │ B  │ B  │ A  │
└────┴────┴────┴────┴────┴────┘
B = Base tile   A = Accent tile   Ratio: 2:1 (Base:Accent)
Column index: col % 3 === 2 → Accent
```

### Pattern 2 — 1 in 2 (Accent every 2nd column)
```
┌────┬────┬────┬────┬────┬────┐
│ B  │ A  │ B  │ A  │ B  │ A  │
├────┼────┼────┼────┼────┼────┤
│ B  │ A  │ B  │ A  │ B  │ A  │
└────┴────┴────┴────┴────┴────┘
B = Base tile   A = Accent tile   Ratio: 1:1 (Base:Accent)
Column index: col % 2 === 1 → Accent
```

---

## Parking Floor Checker Pattern

```
┌────┬────┬────┬────┬────┬────┐
│ L  │ D  │ L  │ D  │ L  │ D  │   Row 0
├────┼────┼────┼────┼────┼────┤
│ D  │ L  │ D  │ L  │ D  │ L  │   Row 1
├────┼────┼────┼────┼────┼────┤
│ L  │ D  │ L  │ D  │ L  │ D  │   Row 2
├────┼────┼────┼────┼────┼────┤
│ D  │ L  │ D  │ L  │ D  │ L  │   Row 3
└────┴────┴────┴────┴────┴────┘
L = Light tile   D = Dark tile
Formula: (col + row) % 2 === 1 → Dark tile
```

---

## How Patterns Are Rendered in 3D

### Kitchen Patterns (walls)
```
THREE.Group
  position = (wallPx, tileY, wallPz)
  rotation.y = wallRotY           ← handles all 4 wall orientations
  children:
    Mesh[0]  position.x = -wallW/2 + 0*colW + colW/2   (Base)
    Mesh[1]  position.x = -wallW/2 + 1*colW + colW/2   (Base)
    Mesh[2]  position.x = -wallW/2 + 2*colW + colW/2   (Accent)
    ...
```

### Parking Checker (floor)
```
Each tile = separate Mesh
  rotation.x = -Math.PI/2         ← lies flat on floor
  position = (
    -W/2 + col*cellW + cellW/2,   ← X position
    0,                             ← floor height
    -L/2 + row*cellL + cellL/2    ← Z position
  )
```

### Performance Optimization
Both patterns use **2 shared materials + 1 shared geometry**:
```ts
const geo = new THREE.PlaneGeometry(cellW, cellH);
const matBase   = resolveRowMat(row, tile, 1, 1);
const matAccent = resolveRowMatB(row, tile, 1, 1);
// All meshes reuse geo, matBase, or matAccent
```
Without this: N meshes × N materials = N draw calls
With this:    N meshes × 2 materials = much fewer state changes per frame
