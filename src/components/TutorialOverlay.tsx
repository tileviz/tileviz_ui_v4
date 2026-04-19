// TutorialOverlay — first-time-only step-by-step guide for the Visualizer
// Shown once after the 3D canvas is ready. AsyncStorage flag prevents repeat.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@tileviz_tutorial_done_v1';
const { width: SW, height: SH } = Dimensions.get('window');

interface Step {
  icon: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: '👋',
    title: 'Welcome to TileVIZ!',
    body: 'Visualize your room in stunning 3D before you buy a single tile. Let\'s take a quick tour of the controls.',
  },
  {
    icon: '👁',
    title: 'Interior View',
    body: 'Tap the eye button to step inside your room and look around 360°. Drag to pan the view.',
  },
  {
    icon: '◁  ▷',
    title: 'Rotate',
    body: 'Use the rotate buttons — or simply drag the canvas — to spin the room and see every angle.',
  },
  {
    icon: '+  −',
    title: 'Zoom',
    body: 'Pinch with two fingers or tap +/− to zoom in for tile detail or zoom out for the full picture.',
  },
  {
    icon: '⊙',
    title: 'Reset View',
    body: 'Tap Reset View to snap the camera back to the default angle at any time.',
  },
  {
    icon: '☀',
    title: 'Lighting',
    body: 'Toggle room lighting on or off to see how your tiles look in different light conditions.',
  },
  {
    icon: '🚫',
    title: 'Fixtures',
    body: 'Show or hide built-in fixtures like toilets, showers, and cabinets so you can focus on the tiles.',
  },
  {
    icon: '💾',
    title: 'Save Your Design',
    body: 'Happy with the look? Tap the Save button in the settings panel to store your design and share it.',
  },
];

interface Props {
  /** Called when the user finishes or skips the tutorial */
  onDone: () => void;
}

export function TutorialOverlay({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  // Animate in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  // Animate card change between steps
  function animateStep(nextStep: number) {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: 20, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0.6, duration: 80, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(-20);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }

  async function finish() {
    try { await AsyncStorage.setItem(STORAGE_KEY, '1'); } catch {}
    Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(onDone);
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, s.backdrop, { opacity: fadeAnim }]} pointerEvents="box-none">
      {/* Dark overlay — tappable to skip */}
      <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={finish} />

      {/* Card — centered */}
      <Animated.View
        style={[s.card, { transform: [{ translateY: slideAnim }] }]}
        pointerEvents="box-none"
      >
        {/* Step icon */}
        <View style={s.iconWrap}>
          <Text style={s.iconText}>{current.icon}</Text>
        </View>

        {/* Content */}
        <Text style={s.title}>{current.title}</Text>
        <Text style={s.body}>{current.body}</Text>

        {/* Progress dots */}
        <View style={s.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[s.dot, i === step && s.dotActive]} />
          ))}
        </View>

        {/* Buttons */}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.skipBtn} onPress={finish}>
            <Text style={s.skipTx}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.nextBtn}
            onPress={() => isLast ? finish() : animateStep(step + 1)}
          >
            <Text style={s.nextTx}>{isLast ? 'Get Started' : 'Next →'}</Text>
          </TouchableOpacity>
        </View>

        {/* Step counter */}
        <Text style={s.counter}>{step + 1} / {STEPS.length}</Text>
      </Animated.View>
    </Animated.View>
  );
}

// Check AsyncStorage — returns true if tutorial should be shown
export async function shouldShowTutorial(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    return val === null; // null = never shown
  } catch {
    return false;
  }
}

const s = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  card: {
    width: Math.min(SW - 40, 380),
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,111,247,0.35)',
    shadowColor: '#7C6FF7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 20,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(124,111,247,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(124,111,247,0.4)',
  },
  iconText: {
    fontSize: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E0E3F5',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 14,
    color: 'rgba(200,200,230,0.8)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(124,111,247,0.3)',
  },
  dotActive: {
    backgroundColor: '#7C6FF7',
    width: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(124,111,247,0.3)',
    alignItems: 'center',
  },
  skipTx: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(200,200,230,0.7)',
  },
  nextBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#7C6FF7',
    alignItems: 'center',
  },
  nextTx: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  counter: {
    fontSize: 11,
    color: 'rgba(150,150,180,0.6)',
    marginTop: 14,
    letterSpacing: 0.5,
  },
});
