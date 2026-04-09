// ============================================================
//  components/RoleBadge.tsx — matches backend roles exactly
//  Backend roles: admin | shop_owner | sales_person
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../config/theme';
import { UserRole } from '../types';

const ROLE_LABELS: Record<UserRole, string> = {
  admin:        'Admin',
  shop_owner:   'Shop Owner',
  sales_person: 'Sales Person',
};

const ROLE_STYLES: Record<UserRole, { bg: string; text: string; border: string }> = {
  admin:        { bg: 'rgba(248,113,113,0.13)', text: '#F87171', border: 'rgba(248,113,113,0.22)' },
  shop_owner:   { bg: 'rgba(124,111,247,0.14)', text: '#A78BFA', border: 'rgba(124,111,247,0.24)' },
  sales_person: { bg: 'rgba(59,130,246,0.13)',  text: '#60A5FA', border: 'rgba(59,130,246,0.22)'  },
};

interface Props { role: UserRole; }

export function RoleBadge({ role }: Props) {
  const s = ROLE_STYLES[role] ?? ROLE_STYLES.sales_person;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.text, { color: s.text }]}>{ROLE_LABELS[role] ?? role}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 20, borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 10, fontWeight: '600', letterSpacing: 0.4 },
});
