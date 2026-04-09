// ============================================================
//  theme/index.ts — TileViz Design Tokens
//  Mirrors CSS variables from the original web UI exactly
// ============================================================

export const Colors = {
  // Core palette
  primary:   '#0b0f1e',   // deep navy (header bg, auth bg)
  primary2:  '#1a1a2e',   // slightly lighter navy
  accent:    '#7C6FF7',   // purple (gradient start)
  accent2:   '#3B82F6',   // blue  (gradient end)
  gold:      '#c8a96e',   // gold accent
  gold2:     '#e8c98e',   // gold hover

  // Surfaces
  surface:   '#f8f6f2',   // warm cream
  surface2:  '#f0ece4',   // slightly darker cream
  white:     '#ffffff',

  // Borders
  border:    '#ddd8ce',

  // Text
  text1:     '#1a1a2e',
  text2:     '#5a5550',
  text3:     '#9e9890',

  // Semantic
  success:   '#4caf74',
  danger:    '#e05252',
  info:      '#4a7fd4',

  // Role colours
  roleAdmin:       '#F87171',
  roleShopOwner:   '#A78BFA',
  roleSalesPerson: '#60A5FA',

  // Header subtle tones
  headerBorder:    'rgba(124, 111, 247, 0.15)',
  headerShadowTop: 'rgba(124, 111, 247, 0.45)',
};

export const Fonts = {
  regular:  'DM_Sans_400Regular',
  medium:   'DM_Sans_500Medium',
  semiBold: 'DM_Sans_600SemiBold',
  // Playfair Display not available in expo-google-fonts DM_Sans bundle
  // Use system serif as fallback for display headings
  display:  'serif',
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
};

export const Radii = {
  sm:  6,
  md:  8,
  lg:  10,
  xl:  12,
  xxl: 14,
  pill: 20,
  full: 9999,
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '600' as const },
  h2: { fontSize: 22, fontWeight: '600' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  h4: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  tiny: { fontSize: 10, fontWeight: '400' as const },
  label: { fontSize: 10, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 1.2 },
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 8,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
};
