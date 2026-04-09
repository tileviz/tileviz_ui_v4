// ============================================================
//  screens/IntroScreen.tsx
//  Futuristic AR-themed landing page with TileViz logo,
//  glassmorphism card, aurora gradient background, and
//  a prominent login CTA button.
// ============================================================
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform,
  Animated, Easing, useWindowDimensions,
} from 'react-native';
import { Colors } from '../config/theme';
import { TileVizLogo } from '../components/TileVizLogo';
import { FuturisticBackground } from '../components/FuturisticBackground';
import { useStaticDocumentTitle } from '../utils/useDocumentTitle';

// ── Main IntroScreen ──────────────────────────────────────────
interface Props { onContinue: () => void; }

export function IntroScreen({ onContinue }: Props) {
  useStaticDocumentTitle('Welcome');
  const { width } = useWindowDimensions();
  const isSmall = width < 600;

  // Button hover / press animation
  const btnScale = useRef(new Animated.Value(1)).current;
  const btnGlow  = useRef(new Animated.Value(0)).current;

  // Card entrance animation
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(40)).current;

  // Logo entrance animation
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance: scale up + fade in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1, friction: 6, tension: 80, delay: 100,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(logoOpacity, {
        toValue: 1, duration: 800, delay: 100,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // Card entrance
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1, duration: 1200, delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0, duration: 1200, delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // Button glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(btnGlow, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(btnGlow, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: Platform.OS !== 'web' }).start();
  };
  const handlePressOut = () => {
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  const glowOpacity = btnGlow.interpolate({
    inputRange: [0, 1], outputRange: [0.4, 0.9],
  });

  return (
    <View style={styles.container}>
      <FuturisticBackground />

      {/* Main content */}
      <View style={styles.content}>
        <Animated.View style={[
          styles.glassCard,
          {
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslateY }],
            maxWidth: isSmall ? '92%' as any : 560,
            paddingHorizontal: isSmall ? 28 : 52,
            paddingVertical: isSmall ? 40 : 60,
          },
        ]}>
          {/* TileViz Logo — animated entrance */}
          <Animated.View style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}>
            <TileVizLogo size="lg" variant="light" />
          </Animated.View>

          {/* Tagline */}
          <Text style={[styles.subtitle, { fontSize: isSmall ? 12 : 14 }]}>
            Visualize. Design. Transform.
          </Text>

          {/* Description */}
          <Text style={[styles.description, { fontSize: isSmall ? 13 : 15 }]}>
            Transform your spaces with augmented reality. Visualize tiles in 3D rooms, explore catalogs, 
            and design your dream interiors — all in real time.
          </Text>

          {/* Feature pills */}
          <View style={styles.pillRow}>
            {['3D Rooms', 'AR Preview', 'Tile Catalog', 'Design & Share'].map((label, i) => (
              <View key={i} style={styles.featurePill}>
                <Text style={styles.featurePillText}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Login Button */}
          <Pressable
            onPress={onContinue}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.btnWrapper}
          >
            <Animated.View style={[
              styles.btnGlowLayer,
              { opacity: glowOpacity },
            ]} />
            <Animated.View style={[
              styles.loginBtn,
              { transform: [{ scale: btnScale }] },
            ]}>
              <Text style={styles.loginBtnText}>Get Started</Text>
              <Text style={styles.loginBtnArrow}>→</Text>
            </Animated.View>
          </Pressable>
        </Animated.View>

        {/* Footer links */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Privacy Policy</Text>
          <Text style={styles.footerDivider}>|</Text>
          <Text style={styles.footerText}>Terms of Service</Text>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  glassCard: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: 'rgba(12, 25, 40, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(124, 111, 247, 0.18)',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    } as any : {}),
    shadowColor: 'rgba(124, 111, 247, 0.3)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  logoContainer: {
    marginBottom: 12,
  },
  subtitle: {
    color: 'rgba(200,169,110,0.9)',
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  description: {
    color: 'rgba(232,234,244,0.65)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 420,
    marginBottom: 24,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  featurePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124, 111, 247, 0.25)',
    backgroundColor: 'rgba(124, 111, 247, 0.08)',
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(124, 111, 247, 0.85)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  btnWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  btnGlowLayer: {
    position: 'absolute',
    top: -6, left: -6, right: -6, bottom: -6,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 111, 247, 0.25)',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 44,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    gap: 10,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  loginBtnArrow: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    gap: 12,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(232,234,244,0.4)',
  },
  footerDivider: {
    fontSize: 12,
    color: 'rgba(232,234,244,0.2)',
  },
});
