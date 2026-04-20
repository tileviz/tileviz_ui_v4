# TileViz Documentation

Complete documentation for the TileViz application — a cross-platform (Android, iOS, Web) tile visualization tool built with React Native + Expo + Three.js.

---

## Structure

```
docs/
├── technical/
│   ├── 01-setup-guide.md          — Installation and running the app
│   ├── 02-architecture.md         — System architecture overview
│   ├── 03-folder-structure.md     — What every folder and file does
│   ├── 04-state-management.md     — Zustand stores explained
│   ├── 05-api-reference.md        — All backend endpoints
│   ├── 06-3d-engine.md            — How the 3D room builder works
│   └── 07-authentication.md       — Auth flow and role system
│
├── user-guides/
│   ├── 01-user-manual.md          — End-to-end guide for all users
│   ├── 02-admin-guide.md          — Admin-specific features
│   ├── 03-shop-owner-guide.md     — Shop owner features
│   ├── 04-sales-person-guide.md   — Sales person features
│   ├── 05-zone-arena-guide.md     — Tile zone assignment system
│   └── 06-tutorial-guide.md       — In-app tutorial walkthrough
│
├── diagrams/
│   ├── 01-system-architecture.md  — App ↔ API ↔ DB overview
│   ├── 02-screen-navigation.md    — How screens connect
│   ├── 03-role-permissions.md     — Who can do what
│   ├── 04-component-hierarchy.md  — Component tree
│   ├── 05-state-flow.md           — Zustand data flow
│   ├── 06-3d-scene-flow.md        — Room build pipeline
│   ├── 07-tile-assignment-flow.md — Zone Arena → 3D update
│   ├── 08-api-sequence.md         — Auth and API call sequences
│   ├── 09-entity-relationship.md  — Data model relationships
│   └── 10-pattern-diagram.md      — Kitchen/Parking tile patterns
│
└── operational/
    ├── 01-build-release.md        — Build APK / IPA / web bundle
    ├── 02-environment-config.md   — API URL, tokens, env setup
    ├── 03-performance-notes.md    — Performance decisions and why
    ├── 04-known-limitations.md    — Platform limitations and workarounds
    └── 05-device-compatibility.md — Supported Android, iOS, browsers, devices
```

---

## Quick Links

| I want to... | Go to |
|---|---|
| Run the app locally | [Setup Guide](technical/01-setup-guide.md) |
| Understand the codebase | [Folder Structure](technical/03-folder-structure.md) |
| Learn the API | [API Reference](technical/05-api-reference.md) |
| Understand 3D rendering | [3D Engine Guide](technical/06-3d-engine.md) |
| Learn Zone Arena | [Zone Arena Guide](user-guides/05-zone-arena-guide.md) |
| See how screens connect | [Screen Navigation](diagrams/02-screen-navigation.md) |
| Check role permissions | [Role Permissions](diagrams/03-role-permissions.md) |
| Build for production | [Build & Release](operational/01-build-release.md) |
| Check device support | [Device Compatibility](operational/05-device-compatibility.md) |
