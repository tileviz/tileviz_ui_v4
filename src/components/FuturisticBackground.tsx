// ============================================================
//  components/FuturisticBackground.tsx
//  Shared animated background: aurora gradient orbs + floating tiles
//  Used by IntroScreen and AuthScreen for consistent look.
// ============================================================
import React, { useEffect, useRef } from 'react';
import {
  View, StyleSheet, Platform,
  Animated, Easing, useWindowDimensions,
} from 'react-native';

// ── Animated floating tile ─────────────────────────────────────
function FloatingTile({
  size, color, x, y, delay, duration,
}: {
  size: number; color: string; x: number; y: number;
  delay: number; duration: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const rotate     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1, duration: 800, delay,
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -18, duration, easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(translateY, {
          toValue: 18, duration, easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1, duration: duration * 4,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ).start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1], outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute', left: x, top: y,
        width: size, height: size,
        borderRadius: size * 0.18,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { rotate: spin }],
      }}
    />
  );
}

// ── Tile definitions (static — avoids re-creating on every render) ──
const TILE_DEFS = [
  { size: 64, color: 'rgba(124,111,247,0.15)', xPct: 0.05, yPct: 0.12, delay: 0, duration: 3200 },
  { size: 48, color: 'rgba(59,130,246,0.12)', xPct: 0.82, yPct: 0.08, delay: 400, duration: 3800 },
  { size: 56, color: 'rgba(124,111,247,0.10)', xPct: 0.70, yPct: 0.72, delay: 200, duration: 3400 },
  { size: 40, color: 'rgba(200,169,110,0.12)', xPct: 0.15, yPct: 0.78, delay: 600, duration: 4000 },
  { size: 36, color: 'rgba(124,111,247,0.18)', xPct: 0.42, yPct: 0.06, delay: 300, duration: 2800 },
  { size: 32, color: 'rgba(59,130,246,0.14)', xPct: 0.88, yPct: 0.45, delay: 500, duration: 3600 },
  { size: 28, color: 'rgba(200,169,110,0.15)', xPct: 0.08, yPct: 0.48, delay: 100, duration: 3000 },
  { size: 34, color: 'rgba(124,111,247,0.12)', xPct: 0.58, yPct: 0.85, delay: 700, duration: 3200 },
  { size: 20, color: 'rgba(124,111,247,0.20)', xPct: 0.28, yPct: 0.22, delay: 450, duration: 2600 },
  { size: 18, color: 'rgba(59,130,246,0.18)', xPct: 0.75, yPct: 0.32, delay: 250, duration: 2400 },
  { size: 22, color: 'rgba(200,169,110,0.16)', xPct: 0.35, yPct: 0.62, delay: 350, duration: 2800 },
  { size: 16, color: 'rgba(124,111,247,0.22)', xPct: 0.92, yPct: 0.68, delay: 550, duration: 3000 },
  { size: 12, color: 'rgba(124,111,247,0.25)', xPct: 0.50, yPct: 0.35, delay: 150, duration: 2200 },
  { size: 14, color: 'rgba(59,130,246,0.20)', xPct: 0.20, yPct: 0.55, delay: 650, duration: 2600 },
] as const;

// ── Animated tile grid (memoised to avoid keyboard-triggered re-renders) ──
const AnimatedTileGrid = React.memo(function AnimatedTileGrid() {
  const { width, height } = useWindowDimensions();

  // Capture initial dimensions so keyboard open/close doesn't remount tiles
  const dims = useRef({ width, height });

  const tiles = TILE_DEFS.map(t => ({
    size: t.size, color: t.color, delay: t.delay, duration: t.duration,
    x: dims.current.width * t.xPct,
    y: dims.current.height * t.yPct,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {tiles.map((t, i) => <FloatingTile key={i} {...t} />)}
    </View>
  );
});

// ── Aurora gradient orbs ──────────────────────────────────────
function AuroraBackground() {
  const pulse1 = useRef(new Animated.Value(0.6)).current;
  const pulse2 = useRef(new Animated.Value(0.4)).current;
  const pulse3 = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animate = (val: Animated.Value, min: number, max: number, dur: number) =>
      Animated.loop(Animated.sequence([
        Animated.timing(val, { toValue: max, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(val, { toValue: min, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      ])).start();
    animate(pulse1, 0.4, 0.8, 4000);
    animate(pulse2, 0.3, 0.6, 5000);
    animate(pulse3, 0.35, 0.7, 6000);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={{
        position: 'absolute', top: -120, left: -100,
        width: 500, height: 500, borderRadius: 250,
        backgroundColor: 'rgba(20, 80, 80, 0.5)',
        opacity: pulse1,
      }} />
      <Animated.View style={{
        position: 'absolute', top: '30%', right: -150,
        width: 450, height: 450, borderRadius: 225,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        opacity: pulse2,
      }} />
      <Animated.View style={{
        position: 'absolute', bottom: -100, left: '20%',
        width: 400, height: 400, borderRadius: 200,
        backgroundColor: 'rgba(20, 80, 70, 0.35)',
        opacity: pulse3,
      }} />
    </View>
  );
}

// ── Main export: full-screen animated background ──────────────
export function FuturisticBackground() {
  return (
    <>
      <View style={styles.bgBase} pointerEvents="none" />
      <AuroraBackground />
      <AnimatedTileGrid />
    </>
  );
}

const styles = StyleSheet.create({
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#060d1a',
  },
});
