// ============================================================
//  components/BottomTabBar.tsx — Mobile bottom navigation
//  Shown on phone screens (<600px). Replaces top header tabs.
// ============================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../config/theme';
import { useAppStore } from '../store/app.store';
import { useAuthStore } from '../store/auth.store';
import { NavPage, UserRole } from '../types';

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

export function BottomTabBar() {
  const insets = useSafeAreaInsets();
  const { activePage, setActivePage } = useAppStore();
  const { user } = useAuthStore();

  // Filter tabs by user role
  const visibleTabs = PRIMARY_TABS.filter(
    tab => !tab.roles || (user && tab.roles.includes(user.role))
  );
  const visibleMore = MORE_TABS.filter(
    tab => !tab.roles || (user && tab.roles.includes(user.role))
  );

  // If there are "more" tabs, we show them inline if ≤2, otherwise we'd need a "More" tab
  // For simplicity, merge all visible tabs
  const allTabs = [...visibleTabs, ...visibleMore];

  // Limit to 5 tabs max in bottom bar
  const tabs = allTabs.slice(0, 5);

  return (
    <View style={[s.container, { paddingBottom: Math.max(insets.bottom, 6) }]}>
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
    height: 68,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124,111,247,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
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
