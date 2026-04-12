// ============================================================
//  components/toastConfig.tsx — Premium custom toast layout
//  Glassmorphic, non-intrusive notification toasts
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BaseToast, ErrorToast, BaseToastProps } from 'react-native-toast-message';
import { Colors, Radii, Shadows } from '../config/theme';

// ── Custom Toast Components ──────────────────────────────────

function SuccessToast(props: BaseToastProps) {
  return (
    <View style={[st.container, st.successBg]}>
      <View style={st.iconCircle}>
        <Text style={st.iconText}>✓</Text>
      </View>
      <View style={st.content}>
        <Text style={st.title} numberOfLines={1}>{props.text1}</Text>
        {props.text2 ? <Text style={st.message} numberOfLines={2}>{props.text2}</Text> : null}
      </View>
      <View style={st.progressBar}>
        <View style={[st.progressFill, st.successProgress]} />
      </View>
    </View>
  );
}

function ErrorToastCustom(props: BaseToastProps) {
  return (
    <View style={[st.container, st.errorBg]}>
      <View style={[st.iconCircle, st.errorIconCircle]}>
        <Text style={st.iconText}>✕</Text>
      </View>
      <View style={st.content}>
        <Text style={st.title} numberOfLines={1}>{props.text1}</Text>
        {props.text2 ? <Text style={st.message} numberOfLines={2}>{props.text2}</Text> : null}
      </View>
      <View style={st.progressBar}>
        <View style={[st.progressFill, st.errorProgress]} />
      </View>
    </View>
  );
}

function InfoToast(props: BaseToastProps) {
  return (
    <View style={[st.container, st.infoBg]}>
      <View style={[st.iconCircle, st.infoIconCircle]}>
        <Text style={st.iconText}>i</Text>
      </View>
      <View style={st.content}>
        <Text style={st.title} numberOfLines={1}>{props.text1}</Text>
        {props.text2 ? <Text style={st.message} numberOfLines={2}>{props.text2}</Text> : null}
      </View>
      <View style={st.progressBar}>
        <View style={[st.progressFill, st.infoProgress]} />
      </View>
    </View>
  );
}

function WarningToast(props: BaseToastProps) {
  return (
    <View style={[st.container, st.warningBg]}>
      <View style={[st.iconCircle, st.warningIconCircle]}>
        <Text style={st.iconText}>!</Text>
      </View>
      <View style={st.content}>
        <Text style={st.title} numberOfLines={1}>{props.text1}</Text>
        {props.text2 ? <Text style={st.message} numberOfLines={2}>{props.text2}</Text> : null}
      </View>
      <View style={st.progressBar}>
        <View style={[st.progressFill, st.warningProgress]} />
      </View>
    </View>
  );
}

// ── Export config ────────────────────────────────────────────

export const toastConfig = {
  success: (props: BaseToastProps) => <SuccessToast {...props} />,
  error: (props: BaseToastProps) => <ErrorToastCustom {...props} />,
  info: (props: BaseToastProps) => <InfoToast {...props} />,
  warning: (props: BaseToastProps) => <WarningToast {...props} />,
};

// ── Styles ───────────────────────────────────────────────────

const st = StyleSheet.create({
  container: {
    width: '92%',
    minHeight: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)' } as any
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 32,
          elevation: 12,
        }),
  },
  successBg: {
    backgroundColor: '#0d1f15',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 116, 0.3)',
  },
  errorBg: {
    backgroundColor: '#1f0d0d',
    borderWidth: 1,
    borderColor: 'rgba(224, 82, 82, 0.3)',
  },
  infoBg: {
    backgroundColor: '#0d141f',
    borderWidth: 1,
    borderColor: 'rgba(74, 127, 212, 0.3)',
  },
  warningBg: {
    backgroundColor: '#1f1a0d',
    borderWidth: 1,
    borderColor: 'rgba(200, 169, 110, 0.3)',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(76, 175, 116, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  errorIconCircle: {
    backgroundColor: 'rgba(224, 82, 82, 0.2)',
  },
  infoIconCircle: {
    backgroundColor: 'rgba(74, 127, 212, 0.2)',
  },
  warningIconCircle: {
    backgroundColor: 'rgba(200, 169, 110, 0.2)',
  },
  iconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    lineHeight: 16,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressFill: {
    height: '100%',
    width: '100%',
    borderRadius: 2,
  },
  successProgress: {
    backgroundColor: '#4caf74',
  },
  errorProgress: {
    backgroundColor: '#e05252',
  },
  infoProgress: {
    backgroundColor: '#4a7fd4',
  },
  warningProgress: {
    backgroundColor: '#c8a96e',
  },
});
