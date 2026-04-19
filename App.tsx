// ============================================================
//  App.tsx — Root entry point
//  Web fix: ErrorBoundary catches silent crashes that cause
//  blank white screen. GestureHandlerRootView needs web check.
// ============================================================
import React from 'react';
import { View, Text, StatusBar, Platform, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/toastConfig';
import { AppNavigator } from './src/navigation/AppNavigator';
import { GlobalConfirmProvider } from './src/components/GlobalConfirmProvider';

// ── Error Boundary — shows error instead of blank white screen ──
interface EBState { hasError: boolean; error: string }
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { hasError: false, error: '' };
  static getDerivedStateFromError(e: any): EBState {
    return { hasError: true, error: e?.message ?? String(e) };
  }
  componentDidCatch(e: any, info: any) {
    console.error('[TileViz] Render error:', e, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errScreen}>
          <Text style={styles.errTitle}>⚠️ Something went wrong</Text>
          <Text style={styles.errMsg}>{this.state.error}</Text>
          <Text style={styles.errHint}>Check browser console for details.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  console.log('[TileViz] App.tsx rendering');
  // GestureHandlerRootView needs flex:1 on all platforms
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          {Platform.OS !== 'web' && (
            <StatusBar barStyle="light-content" backgroundColor="#0b0f1e" />
          )}
          <GlobalConfirmProvider>
            <AppNavigator />
          </GlobalConfirmProvider>
          <Toast config={toastConfig} topOffset={92} visibilityTime={3000} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errScreen: { flex:1, backgroundColor:'#0b0f1e', alignItems:'center', justifyContent:'center', padding:32 },
  errTitle:  { fontSize:20, fontWeight:'700', color:'#F87171', marginBottom:16 },
  errMsg:    { fontSize:13, color:'#E0E3F5', textAlign:'center', lineHeight:22, marginBottom:12, fontFamily:'monospace' },
  errHint:   { fontSize:11, color:'#4A5080', textAlign:'center' },
});
