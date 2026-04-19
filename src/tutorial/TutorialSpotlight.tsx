// tutorial/TutorialSpotlight.tsx — Global spotlight overlay
// Renders 4 dark panels creating a transparent "hole" around the target element.
// Tooltip with arrow points to the highlighted element.
// The target element itself remains fully interactive (tappable).
import React, { useEffect, useRef } from 'react';
import {
  Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useTutorial } from './TutorialContext';

const PAD   = 10;   // spotlight padding around the target
const ARROW = 12;   // arrow size

export function TutorialSpotlight() {
  const { active, step, stepIndex, totalSteps, spotlightRect, skip } = useTutorial();
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const pulseLoop  = useRef<Animated.CompositeAnimation | null>(null);

  const { width: SW, height: SH } = Dimensions.get('window');

  useEffect(() => {
    if (active && spotlightRect) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      // Pulse ring around the spotlight
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      pulseLoop.current?.stop();
    }
    return () => { pulseLoop.current?.stop(); };
  }, [active, spotlightRect, stepIndex]);

  if (!active || !step) return null;

  // ── Welcome step: no spotlight, centred card ─────────────────
  if (step.key === 'welcome' || !spotlightRect) {
    return (
      <Animated.View style={[StyleSheet.absoluteFillObject, s.backdrop, { opacity: fadeAnim, elevation: 20 }]}
        pointerEvents="box-none">
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}
          // Dark overlay — no interactivity on the backdrop for welcome
        />
        <View style={s.welcomeCard} pointerEvents="box-none">
          <Text style={s.welcomeTitle}>{step.title}</Text>
          <Text style={s.welcomeBody}>{step.body}</Text>
          <View style={s.progressRow}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View key={i} style={[s.dot, i === stepIndex && s.dotActive]} />
            ))}
          </View>
          <TouchableOpacity style={s.skipBtn} onPress={skip}>
            <Text style={s.skipTx}>Skip Tutorial</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // ── Spotlight step ───────────────────────────────────────────
  const { x, y, width, height } = spotlightRect;
  const sx = x - PAD, sy = y - PAD, sw = width + PAD * 2, sh = height + PAD * 2;

  // 4 dark panels surrounding the spotlight hole
  const top    = { left: 0,       top: 0,          width: SW,   height: sy };
  const bottom = { left: 0,       top: sy + sh,    width: SW,   height: SH - sy - sh };
  const left   = { left: 0,       top: sy,         width: sx,   height: sh };
  const right  = { left: sx + sw, top: sy,         width: SW - sx - sw, height: sh };

  // Tooltip position
  const OVERLAY = 'rgba(0,0,0,0.78)';
  const tipW = 230;
  const tipH = 110;
  let tipStyle: any = {};
  let arrowStyle: any = {};
  const cx = sx + sw / 2;

  switch (step.side) {
    case 'left':
      tipStyle = { right: SW - sx + 10, top: sy + sh / 2 - tipH / 2 };
      arrowStyle = { right: -ARROW, top: tipH / 2 - ARROW / 2, borderLeftColor: '#1a1a2e', borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightWidth: 0 };
      break;
    case 'right':
      tipStyle = { left: sx + sw + 10, top: sy + sh / 2 - tipH / 2 };
      arrowStyle = { left: -ARROW, top: tipH / 2 - ARROW / 2, borderRightColor: '#1a1a2e', borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftWidth: 0 };
      break;
    case 'top':
      tipStyle = { left: Math.min(Math.max(cx - tipW / 2, 8), SW - tipW - 8), bottom: SH - sy + 10 };
      arrowStyle = { bottom: -ARROW, left: tipW / 2 - ARROW / 2, borderTopColor: '#1a1a2e', borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomWidth: 0 };
      break;
    case 'bottom':
    default:
      tipStyle = { left: Math.min(Math.max(cx - tipW / 2, 8), SW - tipW - 8), top: sy + sh + 10 };
      arrowStyle = { top: -ARROW, left: tipW / 2 - ARROW / 2, borderBottomColor: '#1a1a2e', borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopWidth: 0 };
      break;
  }

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim, zIndex: 900, elevation: 20 }]}
      pointerEvents="box-none"
    >
      {/* Dark panels — block interaction outside spotlight */}
      <View style={[s.panel, top,    { backgroundColor: OVERLAY }]} />
      <View style={[s.panel, bottom, { backgroundColor: OVERLAY }]} />
      <View style={[s.panel, left,   { backgroundColor: OVERLAY }]} />
      <View style={[s.panel, right,  { backgroundColor: OVERLAY }]} />

      {/* Pulsing ring highlight around target */}
      <Animated.View pointerEvents="none" style={[
        s.ring, { left: sx, top: sy, width: sw, height: sh,
          transform: [{ scale: pulseAnim }] }
      ]} />

      {/* Tooltip bubble with arrow */}
      <View style={[s.tooltip, { width: tipW }, tipStyle]} pointerEvents="none">
        {/* Arrow */}
        <View style={[s.arrow, arrowStyle]} />
        {/* Step counter */}
        <Text style={s.counter}>{stepIndex} / {totalSteps - 1}</Text>
        <Text style={s.tipTitle}>{step.title}</Text>
        <Text style={s.tipBody}>{step.body}</Text>
      </View>

      {/* Skip button — always accessible */}
      <TouchableOpacity style={s.skipFloat} onPress={skip}>
        <Text style={s.skipTx}>Skip</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  backdrop: {
    zIndex: 900,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: { position: 'absolute' },
  ring: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#7C6FF7',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,111,247,0.5)',
    shadowColor: '#7C6FF7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  arrow: {
    position: 'absolute',
    width: 0, height: 0,
    borderWidth: 10,
  },
  counter: {
    fontSize: 10,
    color: 'rgba(124,111,247,0.8)',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E0E3F5',
    marginBottom: 5,
  },
  tipBody: {
    fontSize: 12,
    color: 'rgba(200,200,230,0.85)',
    lineHeight: 17,
  },
  skipFloat: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: 'rgba(26,26,46,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,111,247,0.3)',
  },
  skipTx: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(200,200,230,0.7)',
  },
  // Welcome card styles
  welcomeCard: {
    width: '88%',
    maxWidth: 360,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 26,
    borderWidth: 1,
    borderColor: 'rgba(124,111,247,0.4)',
    alignItems: 'center',
    zIndex: 901,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E0E3F5',
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeBody: {
    fontSize: 14,
    color: 'rgba(200,200,230,0.85)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(124,111,247,0.3)',
  },
  dotActive: {
    backgroundColor: '#7C6FF7',
    width: 18,
  },
  skipBtn: {
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(124,111,247,0.3)',
  },
});
