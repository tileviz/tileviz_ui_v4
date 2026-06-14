# TileViz

A 3D tile visualization app for previewing tile designs in realistic room layouts. Built with **React Native + Expo** and runs on **iOS, Android, and Web** from a single codebase.

## What it does

- Browse a catalog of tiles (marble, ceramic, stone, mosaic, wood) by room type and size.
- Configure a room (bathroom, kitchen, bedroom, balcony, parking) with custom dimensions.
- See your tile choice rendered in a real-time 3D room with walls, floor, ceiling, and fixtures.
- Walk through the room in 360° interior view, toggle lights/fixtures/windows, and rotate freely.
- Save designs, manage inventory, and share PDFs.
- Multi-role support: admin, shop owner, sales person.

## Tech stack

- **Expo SDK 55** / React Native 0.83 / React 19
- **Three.js 0.166** for 3D rendering
  - Web: `WebGLRenderer` on a native `<canvas>`
  - Native: `expo-gl` + `expo-three`
- **Zustand** for state, **Axios** for API, **react-hook-form** for forms
- **TypeScript** (strict mode)

## Project structure

```
src/
  api/           REST clients (auth, tiles, rooms, inventory, admin, audit)
  auth/          Auth API + token handling
  components/    Shared UI (TileCard, modals, headers, etc.)
  config/        App-wide constants (API URL, room defaults, tile sizes)
  hooks/         Reusable React hooks
  navigation/    AppNavigator (tab + screen routing)
  screens/       Top-level screens (Visualizer, Catalog, Zones, Saved, ...)
  store/         Zustand stores (auth, app, catalog)
  three/         3D engine
    scene.ts            renderer, camera, lights, tone mapping
    room-builder.ts     walls/floor/ceiling/fixtures meshes per room type
    materials.ts        tile texture + material factories
    controls.ts         camera helpers
    ThreeCanvas.tsx     React component (web + native variants)
    hooks/              decoupled scene hooks (mount, input, screenshot)
  types/         Shared TypeScript types
  utils/         Helpers (storage, formatting, PDF, screenshots)
App.tsx          Root with ErrorBoundary + providers
```

## Getting started

### Prerequisites

- Node.js 18+
- npm or yarn
- For iOS: Xcode + CocoaPods
- For Android: Android Studio + an emulator or device
- For web: any modern browser

### Install

```bash
npm install
```

### Run

```bash
# Start the Expo dev server (choose platform from the menu)
npm start

# Or jump straight to a platform:
npx expo start --web        # browser
npx expo start --ios        # iOS simulator
npx expo start --android    # Android emulator
```

### Type check

```bash
npx tsc --noEmit
```

## Configuration

The API base URL lives in `src/config/index.ts`:

```ts
export const API_BASE_URL = "https://tileviz-server.onrender.com";
```

Switch to a local backend by uncommenting the `localhost:5000` line.

Auth tokens are stored under `tileviz_access_token` / `tileviz_refresh_token` (SecureStore on native, AsyncStorage on web).

## Notes on the 3D renderer

- **Tile materials are unlit (`MeshBasicMaterial`) on purpose** — this guarantees the tile color rendered on a wall matches the catalog thumbnail exactly. Walls, ceiling, floor, and fixtures still use `MeshStandardMaterial` so the room feels lit and 3D.
- Mobile high-DPI containers can briefly report zero size on first paint. The web canvas defers init by one `requestAnimationFrame` to fix this.
- The render loop is paused when the app backgrounds (native) to avoid ANRs.

## License

Private / proprietary.
