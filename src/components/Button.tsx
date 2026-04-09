// ============================================================
//  components/Button.tsx
//  Matches btn-primary, btn-accent, btn-outline, btn-danger
// ============================================================

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { Colors, Radii, Spacing } from '../config/theme';

type Variant = 'primary' | 'accent' | 'outline' | 'danger' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md';
}

export function Button({
  label, onPress, variant = 'primary', fullWidth,
  disabled, loading, style, textStyle, size = 'md',
}: Props) {
  const base = styles.base;
  const varStyle = styles[variant];
  const sizeStyle = size === 'sm' ? styles.sm : styles.md;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      style={[base, varStyle, sizeStyle, fullWidth && styles.fullWidth, disabled && styles.disabled, style]}
    >
      {loading
        ? <ActivityIndicator color={variant === 'outline' ? Colors.text1 : '#fff'} size="small" />
        : <Text style={[styles.text, textStyles[variant], textStyle]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  md: { paddingVertical: 10, paddingHorizontal: 18 },
  sm: { paddingVertical: 6,  paddingHorizontal: 12 },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },

  primary: { backgroundColor: Colors.primary2 },
  accent:  { backgroundColor: Colors.gold },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border },
  danger:  { backgroundColor: Colors.danger },
  ghost:   { backgroundColor: 'transparent' },

  text: { fontSize: 13, fontWeight: '500' },
});

const textStyles: Record<Variant, TextStyle> = {
  primary: { color: '#fff' },
  accent:  { color: Colors.primary2 },
  outline: { color: Colors.text1 },
  danger:  { color: '#fff' },
  ghost:   { color: Colors.text2 },
};
