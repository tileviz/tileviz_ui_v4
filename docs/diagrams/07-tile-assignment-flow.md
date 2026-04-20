# Tile Assignment Flow

## Zone Arena → 3D Update

```mermaid
flowchart TD
    START([User opens Zone Arena]) --> STEP1

    subgraph STEP1["Step 1 — Room Setup"]
        RT["Select room type"]
        DIM["Enter dimensions"]
        TS["Choose tile size"]
        RT --> DIM --> TS
    end

    STEP1 --> STEP2

    subgraph STEP2["Step 2 — Assign Tiles"]
        TAP["Tap a zone row\ne.g. 'ROW 1'"]
        EXPAND{"Kitchen walls\nor Parking floor?"}
        DIRECT["Direct assign mode\nassigningKey = 'walls:0'"]
        PANELEXP["Pattern panel expands\nPattern selector shown"]

        TAP --> EXPAND
        EXPAND -->|No| DIRECT
        EXPAND -->|Yes| PANELEXP

        PANELEXP --> PSELECT["Choose pattern\nPlain / 1in3 / 1in2 / Checker"]
        PSELECT --> BSLOT["Tap Base Tile slot\nassigningKey = 'walls:0'"]
        PSELECT --> ASLOT["Tap Accent Tile slot\nassigningKey = 'walls:0:accent'"]
    end

    DIRECT --> CATGRID
    BSLOT --> CATGRID
    ASLOT --> CATGRID

    CATGRID["Catalog Grid\nwaiting for tile tap"]
    CATGRID --> TILEPRESS["handleTilePress(tile)"]

    TILEPRESS --> PARSE["Parse assigningKey\nparts = key.split(':')"]
    PARSE --> SLOT{"parts[2]\n=== 'accent'?"}

    SLOT -->|Yes| ACCENT["Update ZoneRow\ntileBId, tileBColor,\ntileBImageUri"]
    SLOT -->|No| BASE["Update ZoneRow\ntileId, tileColor,\ntileImageUri"]

    ACCENT --> SETROWS["setZoneRows()"]
    BASE --> SETROWS

    SETROWS --> PROP["ThreeCanvas receives\nnew zoneRows prop"]
    PROP --> BUILD["buildRoom() called\n3D scene rebuilds"]
    BUILD --> VIEW["Updated 3D view"]
```

## assigningKey Format Reference

```
'floor:0'           → Floor base tile
'floor:0:accent'    → Floor accent tile (checker pattern)
'walls:0'           → All walls row 0 base tile
'walls:0:accent'    → All walls row 0 accent tile
'walls:2'           → All walls row 2 base tile
'wall_n:1'          → North wall only, row 1 base tile
```
