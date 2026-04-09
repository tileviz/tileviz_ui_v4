// ============================================================
//  components/FormInput.tsx
//  Matches .form-group input style from old UI
// ============================================================

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { Colors, Radii, Spacing } from '../config/theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function FormInput({ label, error, containerStyle, ...props }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.group, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, focused && styles.focused, error ? styles.errored : null]}
        placeholderTextColor={Colors.text3}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 14 },
  label: {
    fontSize: 12, fontWeight: '500',
    color: Colors.text2, marginBottom: 5,
  },
  input: {
    width: '100%',
    paddingVertical: 9, paddingHorizontal: 12,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radii.md,
    fontSize: 13, color: Colors.text1,
    backgroundColor: Colors.surface,
  },
  focused: { borderColor: Colors.accent },
  errored: { borderColor: Colors.danger },
  error: { fontSize: 12, color: Colors.danger, marginTop: 4 },
});
