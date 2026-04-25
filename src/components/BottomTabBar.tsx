// ============================================================
//  components/BottomTabBar.tsx — Mobile bottom navigation
//  Shown on phone screens (<600px). Replaces top header tabs.
// ============================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../config/theme';
import { useAppStore } from '../store/app.store';
import { useAuthStore } from '../store/auth.store';
import { NavPage, UserRole } from '../types';

// Fixed content area height (icons + labels). Safe area is added below.
export const TAB_BAR_CONTENT_H = 56;
// Minimum bottom padding for devices without safe area (3-button nav)
const MIN_BOTTOM_PAD = 6;

interface TabItem {
  key: NavPage;
  icon: string;
  label: string;
  roles?: UserRole[]; // undefined = visible to all
}

const PRIMARY_TABS: TabItem[] = [
  { key: 'visualizer', icon: '▣', label: 'Visualizer' },
  { key: 'catalog',    icon: '⊞', label: 'Catalog' },
  { key: 'saved',      icon: '⊟', label: 'Saved' },
  { key: 'dashboard',  icon: '▦', label: 'Dashboard', roles: ['admin', 'shop_owner'] },
];

const MORE_TABS: TabItem[] = [
  { key: 'inventory', icon: '📦', label: 'Inventory', roles: ['admin', 'shop_owner', 'sales_person'] },
  { key: 'admin',     icon: '◉',  label: 'Admin',     roles: ['admin'] },
];

/** Returns the total tab bar height (content + safe area) for layout calculations. */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_CONTENT_H + Math.max(insets.bottom, MIN_BOTTOM_PAD);
}

export function BottomTabBar() {
  const insets = useSafeAreaInsets();
  const { activePage, setActivePage } = useAppStore();
  const { user } = useAuthStore();

  const bottomPad = Math.max(insets.bottom, MIN_BOTTOM_PAD);

  // Filter tabs by user role
  const visibleTabs = PRIMARY_TABS.filter(
    tab => !tab.roles || (user && tab.roles.includes(user.role))
  );
  const visibleMore = MORE_TABS.filter(
    tab => !tab.roles || (user && tab.roles.includes(user.role))
  );

  // Merge all visible tabs — limit to 5 max in bottom bar
  const tabs = [...visibleTabs, ...visibleMore].slice(0, 5);

  return (
    <View style={[s.container, { height: TAB_BAR_CONTENT_H + bottomPad, paddingBottom: bottomPad }]}>
      {tabs.map(tab => {
        const isActive = activePage === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActivePage(tab.key)}
            style={s.tab}
            activeOpacity={0.7}
          >
            <View style={[s.iconWrap, isActive && s.iconWrapActive]}>
              <Text style={[s.icon, isActive && s.iconActive]}>{tab.icon}</Text>
            </View>
            <Text style={[s.label, isActive && s.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
            {isActive && <View style={s.indicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124,111,247,0.15)',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 -2px 8px rgba(0,0,0,0.15)' } as any
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 12,
        }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(124,111,247,0.15)',
  },
  icon: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.55)',
  },
  iconActive: {
    color: Colors.gold,
  },
  label: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  labelActive: {
    color: Colors.gold,
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 3,
    backgroundColor: Colors.gold,
    borderRadius: 2,
  },
});
