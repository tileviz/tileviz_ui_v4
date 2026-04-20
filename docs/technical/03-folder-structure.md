# Folder Structure

```
tileviz_ui_v4/
├── src/
│   ├── api/                   — Backend API functions
│   │   ├── client.ts          — Axios instance, token injection, refresh interceptor
│   │   ├── tiles.ts           — getTiles(), requestTile()
│   │   ├── rooms.ts           — getRooms(), saveRoom(), deleteRoom()
│   │   ├── inventory.ts       — getInventory(), saveInventory(), deleteInventory()
│   │   ├── admin.ts           — Admin + shop owner management APIs
│   │   └── index.ts           — Re-exports all API functions
│   │
│   ├── auth/
│   │   └── auth.api.ts        — apiLogin(), apiLogout(), apiGetMe(), toAppUser()
│   │
│   ├── components/            — Reusable UI components
│   │   ├── AppHeader.tsx      — Top navigation bar (logo + page tabs + logout)
│   │   ├── BottomTabBar.tsx   — Mobile bottom tab bar
│   │   ├── Button.tsx         — Shared button (primary/accent/danger/outline variants)
│   │   ├── CatalogSidebar.tsx — Zone Arena panel (room config + tile assignment)
│   │   ├── FormInput.tsx      — Styled text input with label
│   │   ├── RoleBadge.tsx      — Colored role chip (Admin/Shop Owner/Sales)
│   │   ├── SaveDesignModal.tsx — Save 3D design modal
│   │   ├── SaveInventoryModal.tsx — Save inventory item modal
│   │   ├── SearchBar.tsx      — Search input with clear button
│   │   ├── SkeletonLoader.tsx — Loading placeholder animation
│   │   ├── ThumbnailGenerator.tsx — Offscreen 3D renderer for design thumbnails
│   │   ├── TileCard.tsx       — Tile grid card (image + name + color)
│   │   ├── TileVizLogo.tsx    — App logo component
│   │   ├── TutorialOverlay.tsx — Tutorial start/skip overlay
│   │   └── toastConfig.tsx    — react-native-toast-message config
│   │
│   ├── config/
│   │   ├── index.ts           — App-wide constants (API URL, room defaults, tile sizes, scale)
│   │   └── theme.ts           — Colors, border radii, shadow presets
│   │
│   ├── hooks/
│   │   └── useLayout.ts       — isPhone / isTablet / showBottomTabs detection
│   │
│   ├── navigation/
│   │   └── AppNavigator.tsx   — Root navigator: splash → intro → auth → main app
│   │
│   ├── screens/
│   │   ├── AdminScreen.tsx    — Admin: user management, shop management
│   │   ├── AuthScreen.tsx     — Login / register form
│   │   ├── CatalogScreen.tsx  — Tile grid + CatalogSidebar + 3D canvas
│   │   ├── DashboardScreen.tsx — Stats, shops, users, pending requests
│   │   ├── IntroScreen.tsx    — Welcome / onboarding screen
│   │   ├── InventoryScreen.tsx — Saved inventory library
│   │   ├── SavedDesignsScreen.tsx — Saved 3D design library
│   │   ├── SplashScreen.tsx   — Animated splash on app launch
│   │   ├── VisualizerScreen.tsx — 3D visualizer with settings panel
│   │   └── ZonesScreen.tsx    — Zone assignment (used inside CatalogScreen)
│   │
│   ├── store/
│   │   ├── app.store.ts       — Room config, tile state, zone rows, wall color
│   │   ├── auth.store.ts      — User object, ready state
│   │   └── catalog.store.ts   — Tiles list, assigningKey, sidebar state
│   │
│   ├── three/
│   │   ├── ThreeCanvas.tsx    — Platform router → WebCanvas or NativeCanvas
│   │   ├── room-builder.ts    — buildRoom(): walls, floor, fixtures, patterns
│   │   ├── materials.ts       — Procedural + image textures, texture cache
│   │   ├── scene.ts           — Three.js scene, camera, lights, renderer setup
│   │   └── controls.ts        — Touch/mouse orbit controls
│   │
│   ├── tutorial/
│   │   ├── TutorialContext.tsx — Tutorial state, step tracking, target registration
│   │   ├── TutorialSpotlight.tsx — Animated spotlight overlay with cutout
│   │   └── steps.ts           — Tutorial step definitions (key, title, body, target)
│   │
│   ├── types/
│   │   └── index.ts           — All TypeScript types: User, Tile, ZoneRow, SavedDesign, etc.
│   │
│   └── utils/
│       ├── alert.ts           — showAlert(), showConfirm(), showError() cross-platform
│       ├── format.ts          — formatDate(), calcTileStats(), ROOM_EMOJIS
│       ├── pendingCapture.ts  — Flag for auto-capturing thumbnail after design load
│       ├── sharePdf.ts        — Generate and share design as PDF
│       ├── storage.ts         — AsyncStorage helpers
│       ├── thumbnail.ts       — saveThumbnail(), loadThumbnail(), deleteThumbnail()
│       └── trie.ts            — Trie data structure for fast search indexing
│
├── assets/                    — App icons, splash images
├── docs/                      — This documentation
├── scripts/                   — Build/utility scripts
├── App.tsx                    — Entry point, providers setup
├── app.json                   — Expo app config (name, bundleId, permissions)
├── babel.config.js            — Babel config (expo preset + reanimated plugin)
├── tsconfig.json              — TypeScript config (strict mode)
└── package.json               — Dependencies
```

---

## Rules

| Rule | Reason |
|---|---|
| Screens go in `screens/`, not `components/` | Screens are page-level, components are reusable |
| All constants in `config/index.ts` | No hardcoded values anywhere else |
| All colors/spacing in `config/theme.ts` | Consistent theming |
| API calls only in `api/` files | Never call fetch/axios directly in screens |
| Store mutations only through Zustand setters | Predictable state updates |
| No platform-specific code in `screens/` | Use hooks or components to abstract it |
