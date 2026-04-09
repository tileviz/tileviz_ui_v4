// ============================================================
//  components/SkeletonLoader.tsx — 3-column loading skeleton
// ============================================================
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors, Radii } from '../config/theme';

const GAP = 8;
const H_PAD = 12;

function Shimmer({ style }: { style: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.65] });
  return <Animated.View style={[styles.shimmer, { opacity }, style]} />;
}

export function TileCardSkeleton() {
  return (
    <View style={styles.card}>
      <Shimmer style={styles.preview} />
      <View style={styles.meta}>
        <Shimmer style={styles.line1} />
        <Shimmer style={styles.line2} />
      </View>
    </View>
  );
}

export function TileGridSkeleton({ count = 9 }: { count?: number }) {
  const rows = [];
  for (let i = 0; i < count; i += 3) {
    const row = [];
    for (let j = i; j < Math.min(i + 3, count); j++) {
      row.push(<TileCardSkeleton key={j} />);
    }
    rows.push(
      <View key={`row-${i}`} style={styles.gridRow}>
        {row}
      </View>
    );
  }
  return <View style={styles.grid}>{rows}</View>;
}

const styles = StyleSheet.create({
  grid: {
    padding: H_PAD,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 0,
  },
  meta: {
    padding: 6,
    gap: 5,
  },
  line1: { height: 10, borderRadius: 4, width: '75%' },
  line2: { height: 8, borderRadius: 4, width: '50%' },
  shimmer: { backgroundColor: Colors.surface2 },
});
