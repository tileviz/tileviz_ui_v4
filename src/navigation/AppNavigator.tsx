// ============================================================
//  navigation/AppNavigator.tsx
//  Web blank screen fix: robust boot with timeout fallback.
//  If session check takes >3s, proceed to auth screen anyway.
//  IntroScreen → AuthScreen → Main App flow.
//  Responsive: Phone shows bottom tab bar, Desktop/Tablet shows top nav.
// ============================================================
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, Platform } from 'react-native';
import { TutorialProvider } from '../tutorial/TutorialContext';
import { TutorialSpotlight } from '../tutorial/TutorialSpotlight';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../config/theme';
import { useAuthStore } from '../store/auth.store';
import { useAppStore } from '../store/app.store';
import { useLayout } from '../hooks/useLayout';
import { getAccessToken, authBus } from '../api/client';
import { apiGetMe, apiLogout, toAppUser } from '../auth/auth.api';
import { SplashScreen }       from '../screens/SplashScreen';
import { IntroScreen }        from '../screens/IntroScreen';
import { AuthScreen }         from '../screens/AuthScreen';
import { VisualizerScreen }   from '../screens/VisualizerScreen';
import { CatalogScreen }      from '../screens/CatalogScreen';
import { SavedDesignsScreen } from '../screens/SavedDesignsScreen';
import { DashboardScreen }    from '../screens/DashboardScreen';
import { AdminScreen }        from '../screens/AdminScreen';
import { InventoryScreen }    from '../screens/InventoryScreen';
import { AppHeader }          from '../components/AppHeader';
import { BottomTabBar }       from '../components/BottomTabBar';

export function AppNavigator() {
  console.log('[TileViz] AppNavigator rendering');
  const insets = useSafeAreaInsets();
  const { user, setUser, isReady, setReady } = useAuthStore();
  const { activePage, setActivePage } = useAppStore();
  const { isPhone, showBottomTabs } = useLayout();
  const bootDone = useRef(false);

  // ── Splash animation gate ────────────────────────────────────
  // Both flags must be true before we move past the splash screen:
  //   splashDone  — animation finished
  //   isReady     — session restore finished
  const [splashDone, setSplashDone] = useState(false);

  // ── Intro → Auth flow state ─────────────────────────────────
  const [showIntro, setShowIntro] = useState(true);

  // Stable callback refs to avoid re-mounting screens on re-render
  const handleIntroContinue = useCallback(() => setShowIntro(false), []);
  const handleAuthenticated = useCallback(() => setActivePage('visualizer'), [setActivePage]);

  // ── Dynamic page title for browser tab ──────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const pageTitles: Record<string, string> = {
      visualizer: 'Visualizer',
      catalog: 'Catalog',
      saved: 'Saved Designs',
      inventory: 'Inventory',
      dashboard: 'Dashboard',
      admin: 'Admin',
    };
    let title = 'TileVIZ';
    if (!isReady) {
      title = 'Loading... | TileVIZ';
    } else if (!user && showIntro) {
      title = 'Welcome | TileVIZ';
    } else if (!user) {
      title = 'Sign In | TileVIZ';
    } else {
      title = `${pageTitles[activePage] || 'Visualizer'} | TileVIZ`;
    }
    document.title = title;

    // Set favicon programmatically to ensure correct icon shows
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = require('../../assets/favicon.png');
  }, [isReady, user, showIntro, activePage]);

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

  // ── Animated splash (plays its full animation first) ────────
  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  // ── After splash: wait for boot if still running (rare / slow network) ──
  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: '#13102a' }} />;
  }

  // ── Intro screen (shown first) ─────────────────────────────
  if (!user && showIntro) {
    console.log('[TileViz] Showing intro screen');
    return <IntroScreen onContinue={handleIntroContinue} />;
  }

  // ── Auth screen ─────────────────────────────────────────────
  if (!user) {
    console.log('[TileViz] Showing auth screen');
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
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

  const headerHeight = isPhone ? 52 : 62;

  return (
    <TutorialProvider>
      <View style={{ flex: 1, backgroundColor: Colors.surface }}>
        <AppHeader onLogout={handleLogout} />
        <View style={{ flex: 1, paddingTop: insets.top + headerHeight, paddingBottom: showBottomTabs ? 68 : 0 }}>
          {renderPage()}
        </View>
        {showBottomTabs && <BottomTabBar />}
        {/* Tutorial spotlight — renders on top of everything */}
        <TutorialSpotlight />
      </View>
    </TutorialProvider>
  );
}
