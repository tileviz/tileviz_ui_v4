# Environment Configuration

## API URL

Set in `src/config/index.ts`:

```ts
export const API_BASE_URL = 'http://tilevizloadbalancer-2142620472.ap-south-1.elb.amazonaws.com';
```

| Environment | URL |
|---|---|
| Production | `http://tilevizloadbalancer-2142620472.ap-south-1.elb.amazonaws.com` |
| Local dev (same machine) | `http://localhost:3000` |
| Local dev (physical device) | `http://192.168.x.x:3000` (your machine's LAN IP) |

> When testing on a physical Android/iOS device, `localhost` resolves to the device itself — use your machine's actual local network IP.

---

## Token Keys

```ts
TOKEN_KEYS = {
  access:  'tileviz_access_token',
  refresh: 'tileviz_refresh_token',
}
```

These are the storage keys used across the app. Do not change them without also clearing existing stored tokens (users would be logged out).

---

## App Constants (`src/config/index.ts`)

```ts
THREE_FT_SCALE = 0.46          // 1 foot = 0.46 Three.js scene units
KITCHEN_COUNTER_FT = 2         // Kitchen counter height in feet

ROOM_DEFAULTS = {
  bathroom: { width: 8,  length: 10, height: 10 },
  kitchen:  { width: 10, length: 12, height: 10 },
  bedroom:  { width: 12, length: 14, height: 10 },
  balcony:  { width: 6,  length: 10, height: 10 },
  parking:  { width: 16, length: 20, height: 10 },
}

TILE_SIZES = ['12x12', '18x18', '24x24', '12x24', '6x6', '3x6', 'custom']
```

---

## app.json Key Fields

```json
{
  "name": "TileViz",
  "slug": "tileviz",
  "version": "1.0.0",
  "orientation": "portrait",
  "scheme": "tileviz",
  "platforms": ["ios", "android", "web"],
  "android": {
    "package": "com.tileviz.app",
    "minSdkVersion": 23
  },
  "ios": {
    "bundleIdentifier": "com.tileviz.app"
  },
  "web": {
    "bundler": "metro"
  }
}
```

---

## Switching Between Environments

To switch the API URL without changing code, use a simple env pattern:

```ts
// src/config/index.ts
const isDev = __DEV__;  // Expo sets this automatically
export const API_BASE_URL = isDev
  ? 'http://192.168.1.100:3000'   // local dev server
  : 'http://tilevizloadbalancer-2142620472.ap-south-1.elb.amazonaws.com';
```

`__DEV__` is `true` when running via `expo start`, `false` in production builds.
