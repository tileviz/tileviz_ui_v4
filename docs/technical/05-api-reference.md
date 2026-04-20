# API Reference

**Base URL:** `http://tilevizloadbalancer-2142620472.ap-south-1.elb.amazonaws.com`

All authenticated endpoints require:
```
Authorization: Bearer <access_token>
```

---

## Authentication

### POST /auth/login
```json
Request:  { "email": "string", "password": "string" }
Response: { "accessToken": "string", "refreshToken": "string", "user": { ...UserObject } }
```

### POST /auth/register
```json
Request:  { "name": "string", "email": "string", "password": "string", "role": "sales_person" }
Response: { "accessToken": "string", "refreshToken": "string", "user": { ...UserObject } }
```

### POST /auth/refresh
```json
Request:  { "refreshToken": "string" }
Response: { "accessToken": "string" }
```

### GET /auth/me
```json
Response: { ...UserObject }
```

### POST /auth/logout
```json
Request:  { "refreshToken": "string" }
Response: { "message": "Logged out" }
```

---

## Tiles

### GET /tiles
Returns all tiles visible to the current user's shop.
```json
Response: [
  {
    "_id": "string",
    "name": "string",
    "category": "bathroom | kitchen | bedroom | balcony | parking",
    "color": "#rrggbb",
    "pattern": "marble | wood | mosaic | stone | solid",
    "imageUri": "string | null",
    "widthIn": 12,
    "heightIn": 12
  }
]
```

### POST /tiles/request
Sales person requests a tile to be added to shop catalog.
```json
Request:  { "tileId": "string" }
Response: { "message": "Request submitted" }
```

---

## Rooms (Saved Designs)

### GET /rooms
Returns all saved designs for the current user.
```json
Response: [ { ...SavedDesign } ]
```

### POST /rooms
Save a new 3D design.
```json
Request: {
  "name": "string",
  "roomType": "string",
  "dimensions": { "width": 10, "length": 12, "height": 10 },
  "tileSize": "12x12",
  "tileName": "string",
  "tileColor": "#rrggbb",
  "tileImageUri": "string",
  "zoneRows": [ ...ZoneRow[] ],
  "wallColor": "#rrggbb",
  "selectedTileId": "string"
}
Response: { "_id": "string", ...design }
```

### DELETE /rooms/:id
Delete a saved design.
```json
Response: { "message": "Deleted" }
```

---

## Inventory

### GET /inventory
Returns all inventory items visible to the user (role-filtered on backend).
```json
Response: [ { ...InventoryItem } ]
```

### POST /inventory
Save a design as an inventory item.
```json
Request: {
  "name": "string",
  "roomType": "string",
  "dimensions": { ... },
  "tileSize": "string",
  "tileName": "string",
  "tileColor": "string",
  "tileImageUri": "string",
  "zoneRows": [ ...ZoneRow[] ],
  "wallColor": "string",
  "status": "active | draft | archived"
}
Response: { "_id": "string", ...item }
```

### DELETE /inventory/:id
```json
Response: { "message": "Deleted" }
```

---

## Admin

### GET /admin/stats
Admin only. Returns platform-wide stats.
```json
Response: {
  "tiles": { "total": 0 },
  "users": { "total": 0, "active": 0 },
  "shops": { "total": 0, "active": 0 },
  "pendingCatalogRequests": 0
}
```

### GET /admin/shops
Admin only. Returns all registered shops.

### GET /admin/users
Admin only. Returns all users.

### PATCH /admin/users/:id
Admin only. Update user (toggle active/inactive).
```json
Request:  { "isActive": true | false }
Response: { ...UpdatedUser }
```

### GET /shop/me
Shop owner only. Returns own shop data.

### GET /shop/salespersons
Shop owner only. Returns list of sales persons in shop.

### GET /catalog-requests?status=pending
Returns pending tile catalog requests.

### PATCH /catalog-requests/:id/review
Approve or reject a tile request.
```json
Request:  { "status": "approved | rejected" }
Response: { "message": "Done" }
```

---

## Token Storage Keys

| Platform | Key | Storage |
|---|---|---|
| Native | `tileviz_access_token` | expo-secure-store |
| Native | `tileviz_refresh_token` | expo-secure-store |
| Web | `tileviz_access_token` | localStorage |
| Web | `tileviz_refresh_token` | localStorage |
