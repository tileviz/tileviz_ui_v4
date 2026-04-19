// ============================================================
//  components/BottomTabBar.tsx — Mobile bottom navigation
//  Shown on phone screens (<600px). Replaces top header tabs.
// ============================================================

import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../config/theme';
import { useAppStore } from '../store/app.store';
import { useAuthStore } from '../store/auth.store';
import { NavPage, UserRole } from '../types';
import { useTutorial } from '../tutorial/TutorialContext';

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

// Tutorial target key map for nav tabs
const TAB_TUTORIAL_KEYS: Partial<Record<NavPage, string>> = {
  catalog:    'nav_catalog',
  visualizer: 'nav_visualizer',
};

function TutorialTabRef({ navKey, children }: { navKey: NavPage; children: (ref: React.RefObject<any>) => React.ReactNode }) {
  const tutKey = TAB_TUTORIAL_KEYS[navKey];
  const { registerTarget, unregisterTarget } = useTutorial();
  const ref = useRef<any>(null);
  useEffect(() => {
    if (!tutKey) return;
    registerTarget(tutKey, ref);
    return () => unregisterTarget(tutKey);
  }, [tutKey]);
  return <>{children(tutKey ? ref : { current: null })}</>;
}

export function BottomTabBar() {
  const insets = useSafeAreaInsets();
  const { activePage, setActivePage } = useAppStore();
  const { user } = useAuthStore();
  const { completeStep } = useTutorial();

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
        const tutKey = TAB_TUTORIAL_KEYS[tab.key];
        return (
          <TutorialTabRef key={tab.key} navKey={tab.key}>
            {(tabRef) => (
              <TouchableOpacity
                ref={tabRef}
                collapsable={false}
                onPress={() => {
                  setActivePage(tab.key);
                  if (tutKey) completeStep(tutKey);
                }}
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
            )}
          </TutorialTabRef>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124,111,247,0.15)',
    paddingTop: 6,
    // ── Stick to bottom of screen ──
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 -2px 12px rgba(0,0,0,0.3)',
    } as any : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 10,
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  iconWrap: {
    width: 36,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(124,111,247,0.18)',
  },
  icon: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.38)',
  },
  iconActive: {
    color: Colors.accent,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.38)',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: '#E0E3F5',
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.accent,
  },
});
