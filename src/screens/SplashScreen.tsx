// SplashScreen — cinematic tile-assembly launch experience
// Theme: matches IntroScreen exactly (FuturisticBackground) for a seamless
// visual transition.  Animation sequence:
//   1. Background appears (instant — same as IntroScreen, invisible transition)
//   2. 9 tiles fly in from 8 compass directions, spring-snap into the 3×3 grid
//   3. Diagonal shimmer pulse sweeps across the assembled grid
//   4. TileVIZ logo + tagline slide up and fade in
//   5. Brief hold → screen fades out into the IntroScreen (background unchanged)
import React, { useEffect, useRef } from 'react';
import {
  View, Text, Animated, Easing, StyleSheet,
  Dimensions, Platform,
} from 'react-native';
import { FuturisticBackground } from '../components/FuturisticBackground';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Tile visual config (mirrors favicon palette) ──────────────
const TILE_COLORS = [
  '#8a60d4', '#40297a', '#9468da',  // row 0
  '#9870de', '#341f6a', '#9870de',  // row 1
  '#8a60d4', '#40297a', '#9468da',  // row 2
];

// ── Direction each tile flies in FROM (dx, dy in px) ──────────
const TILE_ORIGINS: [number, number][] = [
  [-180, -180], [   0, -220], [ 180, -180],   // row 0: corners → top, top-right
  [-220,    0], [   0,    0], [ 220,    0],   // row 1: sides (centre scales)
  [-180,  180], [   0,  220], [ 180,  180],   // row 2: bottom
];

const TILE_SIZE  = Math.min(SW * 0.185, 82);
const GAP        = Math.max(4, TILE_SIZE * 0.045);
const GRID_SIZE  = TILE_SIZE * 3 + GAP * 2;
const TILE_RAD   = TILE_SIZE * 0.22;

// ── Single animated tile ──────────────────────────────────────
function AnimatedTile({ index, progress }: { index: number; progress: Animated.Value }) {
  const [dx, dy] = TILE_ORIGINS[index];
  const isCentre = index === 4;

  const tx = progress.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] });
  const ty = progress.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] });
  const sc = isCentre
    ? progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
    : progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.6, 1] });
  const op = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] });

  return (
    <Animated.View
      style={[
        st.tile,
        {
          width: TILE_SIZE, height: TILE_SIZE,
          borderRadius: TILE_RAD,
          backgroundColor: TILE_COLORS[index],
          opacity: op,
          transform: [
            { translateX: tx as any },
            { translateY: ty as any },
            { scale: sc as any },
          ],
        },
      ]}
    />
  );
}

// ── Main splash screen ─────────────────────────────────────────
interface Props { onFinish: () => void; }

export function SplashScreen({ onFinish }: Props) {
  // One value per tile — staggered spring
  const tileProgress = useRef(
    TILE_COLORS.map(() => new Animated.Value(0))
  ).current;

  // Shimmer overlay sweeps diagonally
  const shimmerX = useRef(new Animated.Value(-GRID_SIZE)).current;
  const shimmerOp = useRef(new Animated.Value(0)).current;

  // Logo + tagline entrance
  const logoY   = useRef(new Animated.Value(30)).current;
  const logoOp  = useRef(new Animated.Value(0)).current;

  // Full-screen fade-out
  const screenOp = useRef(new Animated.Value(1)).current;

  const IS_NATIVE = Platform.OS !== 'web';

  useEffect(() => {
    // ── Phase 1 & 2: tiles fly in (staggered 45ms each) ─────
    const tileAnims = tileProgress.map((val, i) =>
      Animated.sequence([
        Animated.delay(i * 45),
        Animated.spring(val, {
          toValue: 1,
          damping: 13,
          stiffness: 180,
          useNativeDriver: IS_NATIVE,
        }),
      ])
    );

    Animated.parallel(tileAnims).start(() => {
      // ── Phase 3: diagonal shimmer ──────────────────────
      Animated.sequence([
        Animated.timing(shimmerOp,  { toValue: 0.55, duration: 80,  useNativeDriver: IS_NATIVE }),
        Animated.timing(shimmerX,   { toValue: GRID_SIZE * 1.4, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: IS_NATIVE }),
        Animated.timing(shimmerOp,  { toValue: 0, duration: 120, useNativeDriver: IS_NATIVE }),
      ]).start();

      // ── Phase 4: logo + tagline slide up (overlapping with shimmer) ──
      Animated.sequence([
        Animated.delay(180),
        Animated.parallel([
          Animated.timing(logoOp, { toValue: 1, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: IS_NATIVE }),
          Animated.timing(logoY,  { toValue: 0, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: IS_NATIVE }),
        ]),
      ]).start(() => {
        // ── Phase 5: hold then fade out ───────────────────
        Animated.sequence([
          Animated.delay(700),
          Animated.timing(screenOp, {
            toValue: 0,
            duration: 480,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: IS_NATIVE,
          }),
        ]).start(() => onFinish());
      });
    });
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: screenOp }]}>
      {/* Same background as IntroScreen — seamless visual transition */}
      <FuturisticBackground />

      <View style={st.centre}>
        {/* ── 3×3 tile grid ── */}
        <View style={[st.grid, { width: GRID_SIZE, height: GRID_SIZE, gap: GAP }]}>
          {tileProgress.map((prog, i) => (
            <AnimatedTile key={i} index={i} progress={prog} />
          ))}

          {/* Diagonal shimmer streak */}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                overflow: 'hidden',
                borderRadius: TILE_RAD,
                opacity: shimmerOp,
              },
            ]}
          >
            <Animated.View
              style={{
                position: 'absolute',
                top: -GRID_SIZE,
                width: GRID_SIZE * 0.28,
                height: GRID_SIZE * 3,
                backgroundColor: 'rgba(255,255,255,0.9)',
                transform: [
                  { translateX: shimmerX as any },
                  { rotate: '18deg' },
                ],
              }}
            />
          </Animated.View>
        </View>

        {/* ── Logo + tagline ── */}
        <Animated.View
          style={[
            st.logoWrap,
            {
              opacity: logoOp,
              transform: [{ translateY: logoY as any }],
            },
          ]}
        >
          <View style={st.titleRow}>
            <Text style={st.titleTile}>Tile</Text>
            <Text style={st.titleViz}>VIZ</Text>
          </View>
          <Text style={st.tagline}>VISUALIZE YOUR SPACE</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  tile: {
    overflow: 'hidden',
  },
  logoWrap: {
    marginTop: TILE_SIZE * 0.55,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  titleTile: {
    fontSize: 32,
    fontWeight: '300',
    color: '#e8eaf4',
    letterSpacing: 1,
  },
  titleViz: {
    fontSize: 32,
    fontWeight: '800',
    color: '#7C6FF7',
    letterSpacing: 3,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(200,169,110,0.8)',
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    marginTop: 6,
  },
});
