// tutorial/steps.ts — Interactive tutorial step definitions
// Each step spotlights a specific element and waits for user action.

export type TutorialScreen = 'visualizer' | 'catalog' | null;
export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

export interface TutorialStep {
  key: string;                 // matches the registered target key
  screen: TutorialScreen;      // navigate here before showing step
  title: string;
  body: string;
  side: TooltipSide;           // which side of the element the tooltip appears
  autoAdvance?: number;        // ms — advance automatically (no tap needed)
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    key:         'welcome',
    screen:      'visualizer',
    title:       'Welcome to TileVIZ! 👋',
    body:        "Let's walk you through the app step by step. We've set up a bathroom design to get you started.",
    side:        'bottom',
    autoAdvance: 3000,
  },
  {
    key:    'nav_catalog',
    screen: 'visualizer',
    title:  'Step 1 — Browse Tiles',
    body:   'Tap the Catalog tab to explore tiles.',
    side:   'top',
  },
  {
    key:    'filter_bathroom',
    screen: 'catalog',
    title:  'Step 2 — Bathroom Tiles',
    body:   'Select the Bathroom category to see bathroom tiles.',
    side:   'bottom',
  },
  {
    key:    'select_tile',
    screen: 'catalog',
    title:  'Step 3 — Pick a Tile',
    body:   'Tap any tile card to apply it to the Back wall of your bathroom.',
    side:   'bottom',
  },
  {
    key:    'nav_visualizer',
    screen: 'catalog',
    title:  'Step 4 — See It in 3D',
    body:   'Great! Now tap Visualizer to see how the tile looks in your room.',
    side:   'top',
  },
  {
    key:    'btn_interior',
    screen: 'visualizer',
    title:  'Step 5 — Interior View',
    body:   'Tap the Eye button to step inside your room and look around 360°.',
    side:   'left',
  },
  {
    key:    'btn_rotate_left',
    screen: 'visualizer',
    title:  'Step 6 — Rotate',
    body:   'Rotate left to inspect the side walls.',
    side:   'left',
  },
  {
    key:    'btn_zoom_in',
    screen: 'visualizer',
    title:  'Step 7 — Zoom',
    body:   'Zoom in to examine the tile detail up close.',
    side:   'left',
  },
  {
    key:    'btn_reset',
    screen: 'visualizer',
    title:  'Step 8 — Reset View',
    body:   'Tap Reset to snap the camera back to the default angle.',
    side:   'left',
  },
  {
    key:    'btn_light',
    screen: 'visualizer',
    title:  'Step 9 — Lighting',
    body:   'Toggle room lighting to see how tiles look in different conditions.',
    side:   'left',
  },
  {
    key:    'btn_objects',
    screen: 'visualizer',
    title:  'Step 10 — Fixtures',
    body:   'Show or hide room fixtures like toilets and showers.',
    side:   'left',
  },
  {
    key:    'save_design',
    screen: 'visualizer',
    title:  'Step 11 — Save Design',
    body:   'Tap the 💾 button to save your design and find it later in Saved Designs.',
    side:   'top',
  },
];
