// ============================================================
//  navigation/AppNavigator.tsx
//  Web blank screen fix: robust boot with timeout fallback.
//  If session check takes >3s, proceed to auth screen anyway.
//  IntroScreen → AuthScreen → Main App flow.
// ============================================================
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../config/theme';
import { useAuthStore } from '../store/auth.store';
import { useAppStore } from '../store/app.store';
import { getAccessToken, authBus } from '../api/client';
import { apiGetMe, apiLogout, toAppUser } from '../auth/auth.api';
import { IntroScreen }        from '../screens/IntroScreen';
import { AuthScreen }         from '../screens/AuthScreen';
import { VisualizerScreen }   from '../screens/VisualizerScreen';
import { CatalogScreen }      from '../screens/CatalogScreen';
import { SavedDesignsScreen } from '../screens/SavedDesignsScreen';
import { DashboardScreen }    from '../screens/DashboardScreen';
import { AdminScreen }        from '../screens/AdminScreen';
import { InventoryScreen }    from '../screens/InventoryScreen';
import { AppHeader }          from '../components/AppHeader';

export function AppNavigator() {
  console.log('[TileViz] AppNavigator rendering');
  const insets = useSafeAreaInsets();
  const { user, setUser, isReady, setReady } = useAuthStore();
  const { activePage, setActivePage } = useAppStore();
  const bootDone = useRef(false);

  // ── Intro → Auth flow state ─────────────────────────────────
  const [showIntro, setShowIntro] = useState(true);

  // ── Session restore on boot ─────────────────────────────────
  useEffect(() => {
    console.log('[TileViz] Boot useEffect starting');
    let cancelled = false;

    // Safety timeout: if boot takes >3s, show auth screen anyway
    const timeout = setTimeout(() => {
      if (!bootDone.current) {
        console.warn('[TileViz] Boot timeout — showing auth screen');
        if (!cancelled) setReady(true);
      }
    }, 3000);

    (async () => {
      try {
        console.log('[TileViz] Checking for existing token...');
        const token = await getAccessToken();
        console.log('[TileViz] Token check result:', token ? 'found' : 'not found');
        if (token && !cancelled) {
          try {
            console.log('[TileViz] Fetching user data...');
            const u = await apiGetMe();
            console.log('[TileViz] User data received:', u?.email);
            if (!cancelled) {
              setUser(toAppUser(u));
              setShowIntro(false); // skip intro if already logged in
            }
          } catch (err) {
            console.warn('[TileViz] Token invalid:', err);
            // Token invalid — just go to auth
          }
        }
      } catch (e) {
        console.warn('[TileViz] Boot error:', e);
      } finally {
        console.log('[TileViz] Boot complete, setting ready');
        bootDone.current = true;
        clearTimeout(timeout);
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);

  // ── Global unauthorized handler ─────────────────────────────
  useEffect(() => {
    const h = () => { setUser(null); setActivePage('visualizer'); setShowIntro(true); };
    authBus.on('unauthorized', h);
    return () => authBus.off('unauthorized', h);
  }, []);

  const handleLogout = useCallback(async () => {
    try { await apiLogout(); } catch {}
    setUser(null);
    setActivePage('visualizer');
    setShowIntro(true);
  }, []);

  // ── Loading splash ───────────────────────────────────────────
  if (!isReady) {
    console.log('[TileViz] Showing loading splash');
    return (
      <View style={{ flex: 1, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        {/* Tile grid logo placeholder */}
        <View style={{ width: 48, height: 48, backgroundColor: Colors.accent, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 24 }}>⊞</Text>
        </View>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Loading TileVIZ…</Text>
      </View>
    );
  }

  // ── Intro screen (shown first) ─────────────────────────────
  if (!user && showIntro) {
    console.log('[TileViz] Showing intro screen');
    return <IntroScreen onContinue={() => setShowIntro(false)} />;
  }

  // ── Auth screen ─────────────────────────────────────────────
  if (!user) {
    console.log('[TileViz] Showing auth screen');
    return <AuthScreen onAuthenticated={() => setActivePage('visualizer')} />;
  }

  // ── Main app ────────────────────────────────────────────────
  console.log('[TileViz] Showing main app, page:', activePage);
  const renderPage = () => {
    switch (activePage) {
      case 'catalog':   return <CatalogScreen />;
      case 'saved':     return <SavedDesignsScreen />;
      case 'inventory': return <InventoryScreen />;
      case 'dashboard': return <DashboardScreen />;
      case 'admin':     return <AdminScreen />;
      default:          return <VisualizerScreen />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface }}>
      <AppHeader onLogout={handleLogout} />
      <View style={{ flex: 1, paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom }}>
        {renderPage()}
      </View>
    </View>
  );
}
