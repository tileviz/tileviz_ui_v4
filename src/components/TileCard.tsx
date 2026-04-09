// TileCard — compact 100×100 thumbnail tile card for catalog grid
import React, { useCallback, useRef } from 'react';
import {
  View, Text, Image,
  StyleSheet, Pressable, Animated,
} from 'react-native';
import { Colors, Radii, Shadows } from '../config/theme';
import { Tile } from '../types';

const CARD_SIZE = 100;

interface Props {
  tile: Tile;
  selected?: boolean;
  onPress: (t: Tile) => void;
}

function TileCardInner({ tile, selected, onPress }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, []);

  return (
    <Animated.View style={[s.cardOuter, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={() => onPress(tile)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[s.card, selected && s.selected]}
      >
        {/* Image preview */}
        <View style={s.preview}>
          {tile.imageUri ? (
            <Image source={{ uri: tile.imageUri }} style={s.img} />
          ) : (
            <View style={[s.swatch, { backgroundColor: tile.color || '#ccc' }]} />
          )}

          {/* Selection check */}
          {selected && (
            <View style={s.check}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>✓</Text>
            </View>
          )}
        </View>

        {/* Name label */}
        <View style={s.meta}>
          <Text style={s.name} numberOfLines={1}>{tile.name}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const TileCard = React.memo(TileCardInner);

const s = StyleSheet.create({
  cardOuter: {
    width: CARD_SIZE,
    height: CARD_SIZE + 22,
    margin: 4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  selected: {
    borderColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  preview: {
    width: CARD_SIZE - 2,
    height: CARD_SIZE - 2,
    backgroundColor: Colors.surface2,
  },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  swatch: { width: '100%', height: '100%' },
  check: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { paddingHorizontal: 4, paddingVertical: 2 },
  name: { fontSize: 9, fontWeight: '600', color: Colors.text1 },
});
