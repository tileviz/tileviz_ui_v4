# Known Limitations

## Native (Android / iOS)

| Limitation | Cause | Workaround |
|---|---|---|
| Tile textures slightly blurry at angles | expo-gl does not support mipmap generation | None — hardware limitation of expo-gl |
| No anisotropic filtering | expo-gl WebGL subset missing `EXT_texture_filter_anisotropic` | None currently |
| PDF share opens system share sheet | `expo-sharing` limitation on Android | Expected behavior — user selects WhatsApp, email, etc. |
| Tutorial spotlight on Android can go behind tab bar | Android elevation stacking | Fixed: spotlight has `elevation: 20`, tab bar has `elevation: 10` |
| Screen readers / accessibility | Not implemented | Future work |

---

## Web

| Limitation | Cause | Workaround |
|---|---|---|
| No push notifications | Web push API not implemented | Not needed for current feature set |
| PDF download instead of share | Web has no system share sheet | File downloads to browser's download folder |
| expo-secure-store unavailable | Native-only package | Tokens stored in `localStorage` on web |

---

## 3D Scene

| Limitation | Cause | Workaround |
|---|---|---|
| Scene fully rebuilds on any config change | `buildRoom()` recreates all geometry | Acceptable for current room complexity |
| No real-time shadows | Shadow maps are expensive on mobile | Point light provides ambient shading |
| Fixtures are simplified models | Not photorealistic meshes | Serves the purpose of spatial reference |
| Kitchen back wall always plain (no tiles) | Design decision — back wall hidden by cabinets | By design |

---

## API

| Limitation | Cause | Workaround |
|---|---|---|
| HTTP only (no HTTPS on load balancer) | Current AWS LB config | Upgrade to HTTPS with ACM certificate |
| No pagination on tile catalog | API returns all tiles at once | Works up to ~500 tiles; add pagination beyond that |
| No offline mode | All data requires network | Future: cache last-fetched data in AsyncStorage |

---

## Platform Differences

| Feature | Web | Android | iOS |
|---|---|---|---|
| Token storage | localStorage | SecureStore | SecureStore |
| Image texture loader | THREE.TextureLoader | expo-three | expo-three |
| Mipmap support | ✅ Yes | ❌ No | ❌ No |
| Screenshot capture | canvas.toDataURL() | GLView.takeSnapshotAsync | GLView.takeSnapshotAsync |
| PDF share | Download file | System share sheet | System share sheet |
| Tutorial elevation fix | Not needed (no elevation) | Required (elevation: 20) | Not needed (z-index) |
