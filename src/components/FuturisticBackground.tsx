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

// ── Animated tile grid ────────────────────────────────────────
function AnimatedTileGrid() {
  const { width, height } = useWindowDimensions();

  const tiles = [
    { size: 64, color: 'rgba(124,111,247,0.15)', x: width * 0.05, y: height * 0.12, delay: 0, duration: 3200 },
    { size: 48, color: 'rgba(59,130,246,0.12)', x: width * 0.82, y: height * 0.08, delay: 400, duration: 3800 },
    { size: 56, color: 'rgba(124,111,247,0.10)', x: width * 0.7, y: height * 0.72, delay: 200, duration: 3400 },
    { size: 40, color: 'rgba(200,169,110,0.12)', x: width * 0.15, y: height * 0.78, delay: 600, duration: 4000 },
    { size: 36, color: 'rgba(124,111,247,0.18)', x: width * 0.42, y: height * 0.06, delay: 300, duration: 2800 },
    { size: 32, color: 'rgba(59,130,246,0.14)', x: width * 0.88, y: height * 0.45, delay: 500, duration: 3600 },
    { size: 28, color: 'rgba(200,169,110,0.15)', x: width * 0.08, y: height * 0.48, delay: 100, duration: 3000 },
    { size: 34, color: 'rgba(124,111,247,0.12)', x: width * 0.58, y: height * 0.85, delay: 700, duration: 3200 },
    { size: 20, color: 'rgba(124,111,247,0.20)', x: width * 0.28, y: height * 0.22, delay: 450, duration: 2600 },
    { size: 18, color: 'rgba(59,130,246,0.18)', x: width * 0.75, y: height * 0.32, delay: 250, duration: 2400 },
    { size: 22, color: 'rgba(200,169,110,0.16)', x: width * 0.35, y: height * 0.62, delay: 350, duration: 2800 },
    { size: 16, color: 'rgba(124,111,247,0.22)', x: width * 0.92, y: height * 0.68, delay: 550, duration: 3000 },
    { size: 12, color: 'rgba(124,111,247,0.25)', x: width * 0.5, y: height * 0.35, delay: 150, duration: 2200 },
    { size: 14, color: 'rgba(59,130,246,0.20)', x: width * 0.2, y: height * 0.55, delay: 650, duration: 2600 },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {tiles.map((t, i) => <FloatingTile key={i} {...t} />)}
    </View>
  );
}

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
      <View style={styles.bgBase} />
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
