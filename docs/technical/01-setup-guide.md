# Setup Guide

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 18+ | JavaScript runtime |
| npm | 9+ | Package manager |
| Expo CLI | Latest | App toolchain |
| Android Studio | Latest | Android emulator / build |
| Xcode | 14+ (Mac only) | iOS simulator / build |

---

## Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd tileviz_ui_v4

# 2. Install dependencies
npm install

# 3. Start the development server
npx expo start
```

---

## Running on Each Platform

### Web
```bash
npx expo start --web
# Opens at http://localhost:8081
```

### Android
```bash
# Option A — Physical device (USB debugging enabled)
npx expo start --android

# Option B — Android emulator (open AVD first in Android Studio)
npx expo start --android

# Option C — Expo Go app on your phone
# Scan the QR code shown by npx expo start
```

### iOS (Mac only)
```bash
npx expo start --ios
```

---

## Environment Configuration

The API base URL is set in `src/config/index.ts`:

```ts
export const API_BASE_URL = 'http://tilevizloadbalancer-2142620472.ap-south-1.elb.amazonaws.com';
```

To point to a different backend (e.g. local dev server):
```ts
export const API_BASE_URL = 'http://192.168.1.x:3000'; // your local IP
```

> Use your machine's local network IP, not `localhost`, when testing on a physical device.

---

## Clear Metro Cache

Run this when you add new files, change `babel.config.js`, or see stale module errors:

```bash
npx expo start --clear
```

---

## Common Issues

| Issue | Fix |
|---|---|
| `Unable to resolve module` | Run `npx expo start --clear` |
| Android build fails | Run `cd android && ./gradlew clean` |
| Blank screen on web | Clear browser cache, hard reload |
| API calls fail on device | Ensure device and server are on same network, use local IP not localhost |
| expo-gl crash on Android | Ensure `minSdkVersion >= 23` in `android/build.gradle` |
