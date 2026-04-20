# Device & Platform Compatibility

Complete reference for which devices, OS versions, and browsers TileViz supports.

---

## Tech Stack Versions

| Package | Version | Purpose |
|---|---|---|
| Expo SDK | 55.0.15 | App toolchain |
| React Native | 0.83.4 | Mobile framework |
| React | 19.2.0 | UI library |
| Three.js | 0.166.0 | 3D rendering |
| expo-gl | 55.0.13 | OpenGL ES on native |
| react-native-web | 0.21.0 | Web rendering |

---

## Android

### Supported Versions

| Android Version | API Level | Support | Notes |
|---|---|---|---|
| Android 6.0 Marshmallow | API 23 | ✅ Minimum | Minimum required by Expo SDK 55 + React Native 0.83 |
| Android 7.0 / 7.1 Nougat | API 24–25 | ✅ Supported | |
| Android 8.0 / 8.1 Oreo | API 26–27 | ✅ Supported | |
| Android 9.0 Pie | API 28 | ✅ Supported | HTTP traffic allowed via `usesCleartextTraffic: true` |
| Android 10 | API 29 | ✅ Supported | |
| Android 11 | API 30 | ✅ Supported | |
| Android 12 / 12L | API 31–32 | ✅ Supported | |
| Android 13 | API 33 | ✅ Supported | |
| Android 14 | API 34 | ✅ Supported | |
| Android 15 | API 35 | ✅ Supported | |

> **Minimum: Android 6.0 (API 23)**
> Below API 23 is not supported — expo-secure-store and expo-gl require API 23+.

### Android Hardware Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| RAM | 2 GB | 3 GB+ |
| OpenGL ES | 3.0 | 3.1+ |
| Storage | 150 MB free | 300 MB free |
| CPU | Quad-core 1.4 GHz | Octa-core 2.0 GHz+ |

> OpenGL ES 3.0 is required for `expo-gl` (3D rendering). All Android devices shipped since 2015 with Android 5.0+ include OpenGL ES 3.0.

### Tested Android Devices

| Device Category | Examples |
|---|---|
| Budget phones | Samsung Galaxy A15, Redmi 12, Realme C55 |
| Mid-range phones | Samsung Galaxy A54, Redmi Note 13, Realme 11 |
| Flagship phones | Samsung Galaxy S24, OnePlus 12, Pixel 8 |
| Tablets | Samsung Galaxy Tab A8, Tab S6 Lite, Tab S9 |

---

## iOS

### Supported Versions

| iOS Version | Support | Notes |
|---|---|---|
| iOS 16.0 | ✅ Minimum | Minimum required by Expo SDK 55 |
| iOS 16.x | ✅ Supported | |
| iOS 17.x | ✅ Supported | |
| iOS 18.x | ✅ Supported | |
| Below iOS 16 | ❌ Not supported | Expo SDK 55 dropped support for iOS 15 and below |

> **Minimum: iOS 16.0**

### iOS Hardware Requirements

| Requirement | Details |
|---|---|
| iPhone | iPhone 8 or newer (ships with iOS 16 support) |
| iPad | iPad (6th gen) or newer — `supportsTablet: true` in app config |
| Metal GPU | Required for rendering (all supported devices have Metal) |

### Supported iOS Devices

| Type | Models |
|---|---|
| iPhone | iPhone 8, 8+, X, XS, XR, 11, 12, 13, 14, 15 series |
| iPad | iPad 6th gen+, iPad Air 3rd gen+, iPad mini 5th gen+, iPad Pro all sizes |

---

## Web (Browser)

TileViz uses **WebGL** for 3D rendering in the browser. The browser must support WebGL 1.0 (minimum) and preferably WebGL 2.0 for best quality.

### Supported Browsers

| Browser | Minimum Version | Support | Notes |
|---|---|---|---|
| Google Chrome | 88+ | ✅ Full | Recommended — best WebGL performance |
| Microsoft Edge | 88+ | ✅ Full | Chromium-based, same as Chrome |
| Mozilla Firefox | 78+ | ✅ Full | |
| Safari | 14+ | ✅ Supported | WebGL 2 from Safari 15+ |
| Opera | 74+ | ✅ Supported | Chromium-based |
| Samsung Internet | 15+ | ✅ Supported | Android tablet/phone browser |
| Internet Explorer | Any | ❌ Not supported | No WebGL 2, no ES6 modules |
| Chrome < 88 | — | ❌ Not supported | Too old |

### Browser Hardware Requirements

| Feature | Requirement |
|---|---|
| WebGL | Must be enabled (enabled by default in all supported browsers) |
| GPU | Dedicated or integrated GPU with WebGL driver support |
| RAM | 4 GB+ recommended for smooth 3D rendering |
| JavaScript | ES2020+ support required |

### Tested Browsers

| Browser | Platform | Status |
|---|---|---|
| Chrome 120+ | Windows, macOS, Android | ✅ Fully tested |
| Edge 120+ | Windows | ✅ Fully tested |
| Firefox 120+ | Windows, macOS | ✅ Tested |
| Safari 17+ | macOS, iPad | ✅ Tested |
| Chrome (Android) | Android 10+ | ✅ Tested |
| Safari (iOS) | iOS 16+ | ✅ Tested |

---

## Device Types & Screen Layouts

TileViz is fully responsive across all device types.

### Phone (Portrait)

| Screen Width | Layout |
|---|---|
| < 500px | 1-column grid, bottom tab bar, full-screen 3D canvas |

**Features:**
- Bottom tab navigation bar
- Catalog sidebar slides in/out as overlay
- 3D canvas occupies full screen
- Settings panel slides up from bottom
- Zone Arena opens as overlay

---

### Tablet (Portrait & Landscape)

| Screen Width | Layout |
|---|---|
| 500px – 800px | 2-column grid |
| 800px – 1200px | 3-column grid |

**Features:**
- Bottom tab bar (portrait) or top nav bar (landscape, wide tablet)
- Catalog sidebar always visible alongside tile grid
- 3D canvas and settings panel side by side

---

### Desktop / Web

| Screen Width | Layout |
|---|---|
| 800px – 1200px | 3-column grid |
| 1200px+ | 4-column grid |

**Features:**
- Top navigation header (no bottom tabs)
- Full sidebar always visible
- Wide 3D canvas with side panel
- Mouse controls for 3D (drag to rotate, scroll to zoom)

---

## Screen Breakpoints (from code)

Defined in `src/hooks/useLayout.ts` and screens:

| Breakpoint | Width | Behavior |
|---|---|---|
| Phone | < ~768px | `isPhone = true`, bottom tabs shown |
| Tablet / Desktop | ≥ ~768px | `isPhone = false`, top nav shown |

FlatList columns (`SavedDesigns`, `Inventory`):
```
width > 1200px → 4 columns
width > 800px  → 3 columns
width > 500px  → 2 columns
≤ 500px        → 1 column
```

---

## Orientation

| Platform | Orientation |
|---|---|
| Android | Portrait only (locked in `app.json`) |
| iOS | Portrait only (locked in `app.json`) |
| Web | Portrait + Landscape (browser window resizable) |

---

## Summary Table

| Platform | Minimum | Recommended | Status |
|---|---|---|---|
| Android | 6.0 (API 23) | Android 10+ | ✅ Supported |
| iOS | iOS 16.0 | iOS 17+ | ✅ Supported |
| Chrome | v88 | v115+ | ✅ Supported |
| Firefox | v78 | v115+ | ✅ Supported |
| Safari | v14 | v16+ | ✅ Supported |
| Edge | v88 | v115+ | ✅ Supported |
| Internet Explorer | — | — | ❌ Not supported |
| Android < 6.0 | — | — | ❌ Not supported |
| iOS < 16 | — | — | ❌ Not supported |
