# Architecture Overview

## System Layers

```
┌─────────────────────────────────────────────────────┐
│                  TileViz Client App                  │
│         React Native + Expo (Android/iOS/Web)        │
├──────────────┬──────────────────┬───────────────────┤
│  UI Layer    │  State Layer     │  3D Engine Layer  │
│  (screens/  │  (Zustand stores)│  (Three.js +      │
│  components) │  app / catalog / │  expo-gl / WebGL) │
│              │  auth            │                   │
├──────────────┴──────────────────┴───────────────────┤
│               API Client Layer (src/api/)            │
│         Axios + JWT token refresh interceptor        │
└─────────────────────────┬───────────────────────────┘
                          │  HTTP/HTTPS
                          ▼
┌─────────────────────────────────────────────────────┐
│         AWS Application Load Balancer                │
│  tilevizloadbalancer-2142620472.ap-south-1.elb...   │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              Backend API Server (Node.js)            │
│  /auth   /tiles   /rooms   /inventory   /admin      │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                    Database                          │
│         Users / Shops / Tiles / Rooms / Inventory   │
└─────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Navigation
- Single `AppNavigator` component manages all screens
- **Lazy persistent mounting** — screens mount on first visit and stay alive (no remount on tab switch)
- No external navigation library — custom tab bar with Zustand `activePage` state

### State Management
- **Zustand** (3 stores) — see [State Management Guide](04-state-management.md)
- No Redux, no Context API for app state (only `TutorialContext` uses React Context)

### 3D Rendering
- **Web**: Three.js on a raw HTML `<canvas>` via `WebCanvas` component
- **Native**: Three.js on `expo-gl` `GLView` via `NativeCanvas` component
- Both use the same `buildRoom()` function from `room-builder.ts`
- Platform is detected at runtime via `Platform.OS`

### API Communication
- All requests go through `src/api/client.ts` (Axios instance)
- JWT access token sent in `Authorization: Bearer` header
- Auto refresh on 401 using refresh token stored in SecureStore (native) / localStorage (web)

---

## Key Technical Decisions

| Decision | Why |
|---|---|
| Expo over bare React Native | Faster dev cycle, expo-gl for 3D on native, OTA updates |
| Three.js for 3D | Mature library, works on both web (WebGL) and native (expo-gl) |
| Zustand over Redux | Simpler boilerplate, no providers, direct store access |
| Custom navigation | Avoids React Navigation overhead, simpler screen persistence |
| AWS Load Balancer | Scalability, HTTPS termination, target group routing |
