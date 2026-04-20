# Tutorial Guide

The in-app tutorial runs automatically on first login and guides new users through the key features.

---

## Tutorial Steps

| Step | Target | What it teaches |
|---|---|---|
| 1. Welcome | — | Overview of TileViz |
| 2. Select Room | Room type buttons | How to choose a room type |
| 3. Browse Catalog | Catalog tab button | How to open the tile catalog |
| 4. Filter Bathroom | Bathroom filter chip | How to filter tiles by room |
| 5. Select a Tile | First tile card | How to tap a tile to select it |
| 6. Save Design | Save button (💾) | How to save a visualization |

---

## How the Spotlight Works

Each step highlights a specific UI element with:
- A dark overlay covering everything else
- A cutout showing the target element
- A tooltip card (top / bottom / left / right) with title and description
- A **Next** button to advance, **Skip** button to exit

---

## Tutorial Behavior

- Runs once automatically on first login
- State is stored locally — won't show again after completion or skip
- The spotlight renders above all other UI elements (including the bottom tab bar)

---

## For Developers

Tutorial targets are registered using:
```tsx
const { registerTarget, unregisterTarget, completeStep } = useTutorial();
const ref = useRef(null);

useEffect(() => {
  registerTarget('filter_bathroom', ref);
  return () => unregisterTarget('filter_bathroom');
}, []);

// On press:
completeStep('filter_bathroom');
```

Step definitions are in `src/tutorial/steps.ts`:
```ts
{
  key: 'filter_bathroom',
  title: 'Filter by Room',
  body: 'Tap Bathroom to filter tiles for your bathroom',
  side: 'bottom',   // tooltip position: top | bottom | left | right
}
```

### Android Note
Tutorial overlay must have `elevation: 20` on the spotlight `Animated.View` to render above `BottomTabBar` (`elevation: 10`). Without this, the spotlight is hidden behind the tab bar on Android.
