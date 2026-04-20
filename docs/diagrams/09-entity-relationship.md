# Entity Relationship Diagram

```mermaid
erDiagram
    USER {
        string id PK
        string name
        string email
        string passwordHash
        string role "admin|shop_owner|sales_person"
        boolean isActive
        string shopId FK
        string plan "starter|pro|enterprise"
        datetime createdAt
    }

    SHOP {
        string id PK
        string name
        string ownerId FK
        string plan
        datetime createdAt
    }

    TILE {
        string id PK
        string name
        string category "bathroom|kitchen|bedroom|balcony|parking"
        string color
        string pattern "marble|wood|mosaic|stone|solid"
        string imageUri
        number widthIn
        number heightIn
        string shopId FK
        boolean isApproved
    }

    ROOM {
        string id PK
        string name
        string userId FK
        string roomType
        object dimensions "width,length,height"
        string tileSize
        string tileName
        string tileColor
        string tileImageUri
        array zoneRows
        string wallColor
        string selectedTileId FK
        datetime createdAt
    }

    INVENTORY {
        string id PK
        string name
        string shopId FK
        string createdById FK
        string roomType
        object dimensions
        string tileSize
        string tileName
        string tileColor
        array zoneRows
        string wallColor
        string status "active|draft|archived"
        datetime createdAt
    }

    CATALOG_REQUEST {
        string id PK
        string tileId FK
        string requestedById FK
        string shopId FK
        string status "pending|approved|rejected"
        datetime createdAt
    }

    SHOP ||--o{ USER : "employs"
    USER ||--o{ ROOM : "saves"
    SHOP ||--o{ TILE : "has"
    SHOP ||--o{ INVENTORY : "owns"
    USER ||--o{ INVENTORY : "creates"
    USER ||--o{ CATALOG_REQUEST : "submits"
    TILE ||--o{ CATALOG_REQUEST : "requested in"
    TILE ||--o{ ROOM : "used in"
```

---

## ZoneRow (embedded in Room / Inventory)

```
ZoneRow {
  wallKey:       'floor' | 'walls' | 'wall_n' | 'wall_s' | 'wall_e' | 'wall_w'
  rowIndex:      number
  tileId:        string (ref → Tile)
  tileName:      string
  tileImageUri:  string
  color:         string (hex)
  patternType:   'plain' | 'pattern1' | 'pattern2' | 'checker'
  tileBId:       string (ref → Tile, accent)
  tileBName:     string
  tileBImageUri: string
  tileBColor:    string (hex)
}
```
