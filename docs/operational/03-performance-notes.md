# Performance Notes

Decisions made in the codebase to keep the app fast — and why.

---

## Screen Persistence (AppNavigator)

**Problem:** Every tab switch remounted the screen component, destroying state and triggering fresh API calls. Dashboard, Inventory, and Saved Designs each had 3+ API calls on mount.

**Solution:** Lazy persistent mounting.
```tsx
// Screen mounts once on first visit
visitedPages.has(page) && (
  <View style={{ display: activePage === page ? 'flex' : 'none' }}>
    {element}
  </View>
)
```

- `display: 'none'` hides the screen without unmounting it
- API calls happen once — data stays in component state
- Tab switches are instant

**Trade-off:** All visited screens stay in memory. Acceptable on modern devices (2GB+ RAM).

---

## Progressive Thumbnail Loading (SavedDesigns + Inventory)

**Problem:** Loading spinner blocked the entire UI until every thumbnail resolved — even if there were 30+ designs.

**Solution:** Show designs immediately, load thumbnails independently:
```ts
setDesigns(fetched);
setLoading(false);   // UI shows now

// Thumbnails appear one by one as they load
fetched.forEach(async d => {
  const uri = await loadThumbnail(d.id);
  if (uri) setThumbnails(prev => ({ ...prev, [d.id]: uri }));
});
```

---

## Shared Materials in 3D Patterns

**Problem:** Kitchen pattern rendering created 1 new material per tile column. For 10 columns × 4 rows × 3 walls = 120 separate materials. Parking checker created 1 per tile cell — up to 320 materials.

**Solution:** 2 shared materials + 1 shared geometry per row:
```ts
const geo       = new THREE.PlaneGeometry(colW, rowH);
const matBase   = resolveRowMat(row, tile, 1, repY);    // created once
const matAccent = resolveRowMatB(row, tile, 1, repY);   // created once

for (let col = 0; col < numCols; col++) {
  const mesh = new THREE.Mesh(geo, isAccent ? matAccent : matBase);
  // ...
}
```

**Impact:** Dramatically fewer WebGL state changes per frame.

---

## FlatList Optimization

Both SavedDesigns and Inventory FlatLists use:
```tsx
initialNumToRender={8}      // render 8 items on mount (not all)
maxToRenderPerBatch={8}     // render 8 at a time while scrolling
windowSize={8}              // keep 8 screen-heights of items in memory
removeClippedSubviews={true} // unmount views far off screen (Android)
```

**Impact:** Smooth scroll performance with 50+ items.

---

## Texture Caching

Three texture caches prevent redundant loads:

| Cache | Contents |
|---|---|
| `texCache` | Procedural DataTextures (color + pattern key) |
| `imgTexCache` | Web image textures (URI key) |
| `nativeTexCache` | Native expo-three textures (URI key) |
| `imgLoadingPromises` | In-flight load promises (prevents duplicate loads) |

When the expo-gl context is recreated (native canvas remount), `clearTextureCache()` discards GL-context-bound textures.

---

## console.log Removal

All `console.log` and `console.warn` debug statements removed from production code. On Android, console I/O runs on the JS thread and blocks rendering. Specifically:
- 8 logs in `AppNavigator.tsx` (fired on every render)
- 12 logs in `InventoryScreen.tsx` (fired on button press + delete flow)

---

## Mipmap Fix (Web)

Procedural and image textures on web now use `LinearMipmapLinearFilter`:
```ts
if (Platform.OS === 'web') {
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
}
```

Mipmaps pre-generate downscaled versions of the texture so Three.js samples the correct resolution at any camera distance — tiles stay sharp instead of blurry when zoomed out.

Native (expo-gl) does not support mipmap generation — this is a hardware limitation of expo-gl's WebGL subset.
