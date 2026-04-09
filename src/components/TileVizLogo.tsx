// ============================================================
//  components/TileVizLogo.tsx
//  SVG-equivalent logo drawn with RN shapes
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../config/theme';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export function TileVizLogo({ size = 'md', variant = 'light' }: Props) {
  const scale = size === 'sm' ? 0.7 : size === 'lg' ? 1.4 : 1;
  const textColor = variant === 'light' ? '#E8EAF4' : '#1A1D35';
  const subColor  = variant === 'light' ? '#4A5080' : '#7C82B0';

  const TileGrid = () => {
    const rows = [
      [0.62, 0.28, 0.62],
      [0.82, 0.45, 0.82],
      [1.00, 0.88, 0.78],
    ];
    const tileW = 11 * scale;
    const tileH = [9, 9, 11];
    const gapX = 3 * scale;
    const gapY = 2 * scale;

    return (
      <View style={{ flexDirection: 'column', gap: gapY }}>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: gapX }}>
            {row.map((opacity, ci) => (
              <View
                key={ci}
                style={{
                  width: tileW,
                  height: tileH[ri] * scale,
                  borderRadius: 2 * scale,
                  backgroundColor: ri === 0 && ci === 1 ? '#0E1221' :
                                   ri === 1 && ci === 1 ? '#1A1F3A' :
                                   Colors.accent,
                  opacity,
                }}
              />
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TileGrid />
      <View style={[styles.divider, { height: 38 * scale, marginHorizontal: 10 * scale }]} />
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={[styles.tile, { fontSize: 22 * scale, color: textColor }]}>Tile</Text>
          <Text style={[styles.viz,  { fontSize: 22 * scale }]}>VIZ</Text>
        </View>
        <Text style={[styles.sub, { fontSize: 7.5 * scale, color: subColor }]}>AR PLATFORM</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  divider:   { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  tile:      { fontWeight: '300', letterSpacing: 0.5 },
  viz:       { fontWeight: '700', letterSpacing: 2, color: Colors.accent },
  sub:       { fontWeight: '400', letterSpacing: 3, marginTop: 1 },
});
