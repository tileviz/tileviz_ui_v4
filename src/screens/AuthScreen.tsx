
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, KeyboardAvoidingView,
  Platform, TextInput, Pressable, ActivityIndicator,
  Animated, Easing, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../config/theme';
import { TileVizLogo } from '../components/TileVizLogo';
import { FuturisticBackground } from '../components/FuturisticBackground';
import { useAuthStore } from '../store/auth.store';
import { apiLogin, toAppUser } from '../auth/auth.api';

// ── Eye icon SVG paths ────────────────────────────────────────
const EyeOpenIcon = () => (
  <View style={{ width: 22, height: 22 }}>
    {Platform.OS === 'web' ? (
      <div dangerouslySetInnerHTML={{ __html: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(232,234,244,0.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>` }} />
    ) : (
      <Text style={{ fontSize: 18, color: 'rgba(232,234,244,0.5)' }}>👁</Text>
    )}
  </View>
);

const EyeClosedIcon = () => (
  <View style={{ width: 22, height: 22 }}>
    {Platform.OS === 'web' ? (
      <div dangerouslySetInnerHTML={{ __html: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(232,234,244,0.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>` }} />
    ) : (
      <Text style={{ fontSize: 18, color: 'rgba(232,234,244,0.5)' }}>🙈</Text>
    )}
  </View>
);

// ── Futuristic text input ─────────────────────────────────────
const GlassInput = React.memo(function GlassInput({
  label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; secureTextEntry?: boolean;
  keyboardType?: any; autoCapitalize?: any;
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = secureTextEntry === true;

  // Use animated border instead of state to avoid re-renders on focus/blur
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = useCallback(() => {
    Animated.timing(borderAnim, {
      toValue: 1, duration: 200, useNativeDriver: false,
    }).start();
  }, [borderAnim]);

  const handleBlur = useCallback(() => {
    Animated.timing(borderAnim, {
      toValue: 0, duration: 200, useNativeDriver: false,
    }).start();
  }, [borderAnim]);

  const togglePassword = useCallback(() => {
    setPasswordVisible(v => !v);
  }, []);

  const animatedBorderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(124,111,247,0.2)', 'rgba(124,111,247,0.5)'],
  });

  return (
    <View style={gi.container}>
      <Text style={gi.label}>{label}</Text>
      <Animated.View style={[gi.inputWrap, { borderColor: animatedBorderColor }]}>
        <View style={gi.inputRow}>
          <TextInput
            style={[gi.input, isPassword && gi.inputWithIcon]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="rgba(232,234,244,0.3)"
            secureTextEntry={isPassword && !passwordVisible}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {isPassword && (
            <Pressable
              onPress={togglePassword}
              style={gi.eyeBtn}
              hitSlop={8}
            >
              {passwordVisible ? <EyeOpenIcon /> : <EyeClosedIcon />}
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
});

const gi = StyleSheet.create({
  container: { marginBottom: 16, width: '100%' },
  label: {
    fontSize: 11, fontWeight: '600', color: 'rgba(232,234,244,0.6)',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: 'rgba(124,111,247,0.2)',
    borderRadius: 12,
    backgroundColor: 'rgba(10,18,30,0.6)',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    } as any : {}),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#E8EAF4',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  inputWithIcon: {
    paddingRight: 4,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ── Main AuthScreen ───────────────────────────────────────────
interface Props { onAuthenticated: () => void; }

export const AuthScreen = React.memo(function AuthScreen({ onAuthenticated }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmall = width < 600;
  const setUser = useAuthStore(s => s.setUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Card entrance animation
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(30)).current;

  // Button animation
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Card entrance
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1, duration: 1000, delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0, duration: 1000, delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  async function handleLogin() {
    if (!email || !password) { setError('Please enter email and password'); return; }
    setLoading(true); setError('');
    try {

      const res = await apiLogin({ email, password });
      setUser(toAppUser(res.user));
      onAuthenticated();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  const handlePressIn = () => {
    Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.container}>
      <FuturisticBackground />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[
            styles.glassCard,
            {
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }],
              maxWidth: isSmall ? '94%' as any : 440,
              paddingHorizontal: isSmall ? 24 : 40,
              paddingVertical: isSmall ? 32 : 44,
            },
          ]}>
            {/* Logo */}
            <View style={styles.logoSection}>
              <TileVizLogo size="lg" variant="light" />
            </View>

            <Text style={styles.tagline}>Visualize. Design. Transform.</Text>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Sign In title */}
            <Text style={styles.formTitle}>Sign In</Text>

            {/* Form fields */}
            <GlassInput
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <GlassInput
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {/* Error message */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {error}</Text>
              </View>
            ) : null}

            {/* Sign In button */}
            <Pressable
              onPress={handleLogin}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={loading}
              style={{ width: '100%', marginTop: 4 }}
            >
              <Animated.View style={[
                styles.signInBtn,
                { transform: [{ scale: btnScale }] },
                loading && { opacity: 0.7 },
              ]}>
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.signInBtnText}>Sign In</Text>
                )}
              </Animated.View>
            </Pressable>


          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
});

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  glassCard: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: 'rgba(12, 25, 40, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(124, 111, 247, 0.18)',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    } as any : {}),
    shadowColor: 'rgba(124, 111, 247, 0.3)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 120, height: 120,
    borderRadius: 60,
    backgroundColor: Colors.accent,
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(200,169,110,0.8)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  divider: {
    width: '80%',
    height: 1,
    backgroundColor: 'rgba(124, 111, 247, 0.15)',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E8EAF4',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  errorBox: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(224, 82, 82, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(224, 82, 82, 0.25)',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#F87171',
  },
  signInBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  signInBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },

});
