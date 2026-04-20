// ============================================================
//  navigation/AppNavigator.tsx
//  Web blank screen fix: robust boot with timeout fallback.
//  If session check takes >3s, proceed to auth screen anyway.
//  IntroScreen → AuthScreen → Main App flow.
//  Responsive: Phone shows bottom tab bar, Desktop/Tablet shows top nav.
// ============================================================
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, Platform, Animated, Text, StyleSheet } from 'react-native';
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

// ── Full-screen overlay shown while the 3D scene loads ────────
function SceneLoadingOverlay() {
  const { isSceneLoading } = useAppStore();
  const progress = useRef(new Animated.Value(0)).current;
  const opacity  = useRef(new Animated.Value(0)).current;
  const [pct, setPct] = useState(0);
  const [visible, setVisible] = useState(false);
  const progressAnim = useRef<Animated.CompositeAnimation | null>(null);
  const fadeAnim     = useRef<Animated.CompositeAnimation | null>(null);
  const listenerRef  = useRef<string | null>(null);

  useEffect(() => {
    if (isSceneLoading) {
      setVisible(true);
      progress.setValue(0);
      setPct(0);

      // Remove old listener before adding new one
      if (listenerRef.current) progress.removeListener(listenerRef.current);
      listenerRef.current = progress.addListener(({ value }) => setPct(Math.round(value)));

      // Fade in
      fadeAnim.current?.stop();
      fadeAnim.current = Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true });
      fadeAnim.current.start();

      // Animate progress to 80% (remaining 20% waits for onRenderComplete)
      progressAnim.current?.stop();
      progressAnim.current = Animated.timing(progress, { toValue: 80, duration: 1200, useNativeDriver: false });
      progressAnim.current.start();
    } else {
      // Snap to 100% then fade out
      progressAnim.current?.stop();
      progressAnim.current = Animated.timing(progress, { toValue: 100, duration: 150, useNativeDriver: false });
      progressAnim.current.start(() => {
        fadeAnim.current?.stop();
        fadeAnim.current = Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true });
        fadeAnim.current.start(() => setVisible(false));
      });
    }

    return () => {
      if (listenerRef.current) { progress.removeListener(listenerRef.current); listenerRef.current = null; }
    };
  }, [isSceneLoading]);

  if (!visible) return null;

  const barWidth = progress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={[navStyles.overlay, { opacity }]} pointerEvents="none">
      <View style={navStyles.card}>
        <Text style={navStyles.title}>Building 3D Room</Text>
        <Text style={navStyles.subtitle}>Placing tiles and lighting…</Text>
        <View style={navStyles.barBg}>
          <Animated.View style={[navStyles.barFill, { width: barWidth }]} />
        </View>
        <Text style={navStyles.pctText}>{pct}%</Text>
      </View>
    </Animated.View>
  );
}

const navStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,8,28,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 18,
    paddingHorizontal: 36,
    paddingVertical: 32,
    width: 280,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,111,247,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#E0E3F5',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(224,227,245,0.5)',
    marginBottom: 22,
    textAlign: 'center',
  },
  barBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(124,111,247,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    backgroundColor: '#f5c842',
    borderRadius: 3,
  },
  pctText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#f5c842',
  },
});

export function AppNavigator() {
  const insets = useSafeAreaInsets();
  const { user, setUser, isReady, setReady } = useAuthStore();
  const { activePage, setActivePage } = useAppStore();
  const { isPhone, showBottomTabs } = useLayout();
  const bootDone = useRef(false);

  // Lazy persistent mounting: mount each screen once on first visit, then keep alive.
  // display:'none' hides inactive screens without unmounting — preserves state & avoids re-fetches.
  const [visitedPages, setVisitedPages] = useState<Set<string>>(() => new Set([activePage]));

  // Track newly visited pages to mount them (but never unmount once mounted)
  useEffect(() => {
    setVisitedPages(prev => {
      if (prev.has(activePage)) return prev;
      const next = new Set(prev);
      next.add(activePage);
      return next;
    });
  }, [activePage]);

  // Reset visited pages on logout so stale data doesn't persist across user switches
  useEffect(() => {
    if (!user) setVisitedPages(new Set());
  }, [user]);

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
    let cancelled = false;

    const timeout = setTimeout(() => {
      if (!bootDone.current && !cancelled) setReady(true);
      }
    }, 3000);

    (async () => {
      try {
        const token = await getAccessToken();
        if (token && !cancelled) {
          try {
            const u = await apiGetMe();
            if (!cancelled) {
              setUser(toAppUser(u));
              setShowIntro(false);
            }
          } catch {
            // Token invalid — go to auth
          }
        }
      } catch {
        // Boot error — go to auth
      } finally {
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
    return <IntroScreen onContinue={handleIntroContinue} />;
  }

  // ── Auth screen ─────────────────────────────────────────────
  if (!user) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  // ── Main app — lazy persistent mounting ─────────────────────
  // Each screen is mounted once on first visit and kept alive with display:'none'
  // when inactive. This eliminates re-fetch on every tab switch.
  const headerHeight = isPhone ? 52 : 62;
  const PAGES: { key: string; element: React.ReactElement }[] = [
    { key: 'visualizer', element: <VisualizerScreen /> },
    { key: 'catalog',    element: <CatalogScreen /> },
    { key: 'saved',      element: <SavedDesignsScreen /> },
    { key: 'inventory',  element: <InventoryScreen /> },
    { key: 'dashboard',  element: <DashboardScreen /> },
    { key: 'admin',      element: <AdminScreen /> },
  ];

  return (
    <TutorialProvider>
      <View style={{ flex: 1, backgroundColor: Colors.surface }}>
        <AppHeader onLogout={handleLogout} />
        <View style={{ flex: 1, paddingTop: insets.top + headerHeight, paddingBottom: showBottomTabs ? 68 : 0 }}>
          {PAGES.map(({ key, element }) =>
            visitedPages.has(key) ? (
              <View key={key} style={{ flex: 1, display: activePage === key ? 'flex' : 'none' }}>
                {element}
              </View>
            ) : null
          )}
        </View>
        {showBottomTabs && <BottomTabBar />}
        <TutorialSpotlight />
        <SceneLoadingOverlay />
      </View>
    </TutorialProvider>
  );
}
