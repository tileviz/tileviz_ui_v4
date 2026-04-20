# Build & Release Guide

## Android APK / AAB

```bash
# Development APK (for testing)
npx expo build:android -t apk

# Production AAB (for Play Store)
npx expo build:android -t app-bundle

# With EAS Build (recommended)
npm install -g eas-cli
eas build --platform android --profile production
```

### Android Build Config
Located in `app.json`:
```json
{
  "android": {
    "package": "com.tileviz.app",
    "versionCode": 1,
    "permissions": ["CAMERA", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE"]
  }
}
```

---

## iOS IPA

```bash
# With EAS Build
eas build --platform ios --profile production
```

### iOS Build Config
```json
{
  "ios": {
    "bundleIdentifier": "com.tileviz.app",
    "buildNumber": "1"
  }
}
```

---

## Web Build

```bash
# Export static web bundle
npx expo export --platform web

# Output goes to: dist/
# Deploy the dist/ folder to any static host (Netlify, Vercel, S3+CloudFront)
```

---

## EAS Build Profiles (`eas.json`)

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "ios": { "simulator": false }
    }
  }
}
```

---

## Version Bumping

Before each release:
1. Update `version` in `package.json`
2. Update `android.versionCode` in `app.json` (increment by 1)
3. Update `ios.buildNumber` in `app.json`
4. Commit: `git commit -m "chore: bump version to x.x.x"`

---

## Checklist Before Release

- [ ] API_BASE_URL points to production (not local dev)
- [ ] All `console.log` removed (already done in codebase)
- [ ] App icons updated in `assets/`
- [ ] Splash screen updated
- [ ] Version numbers bumped
- [ ] Test on physical Android device
- [ ] Test on iOS simulator (if Mac available)
- [ ] Test web build in Chrome and Safari
