// components/toastConfig.tsx — Compact right-side notification pills
// Appear below the navbar, right-aligned, auto-dismiss like Android notifications.
import React from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { BaseToastProps } from 'react-native-toast-message';

const PILL_W = Math.min(Dimensions.get('window').width * 0.78, 320);

// ── Accent colours per type ──────────────────────────────────
const TYPE = {
  success: { accent: '#22c55e', bg: '#0a1f12', icon: '✓', iconBg: 'rgba(34,197,94,0.18)'  },
  error:   { accent: '#ef4444', bg: '#1f0a0a', icon: '✕', iconBg: 'rgba(239,68,68,0.18)'  },
  info:    { accent: '#3b82f6', bg: '#0a1020', icon: 'i', iconBg: 'rgba(59,130,246,0.18)' },
  warning: { accent: '#f59e0b', bg: '#1f170a', icon: '!', iconBg: 'rgba(245,158,11,0.18)' },
};

function Pill({ props, type }: { props: BaseToastProps; type: keyof typeof TYPE }) {
  const t = TYPE[type];
  return (
    <View style={[st.pill, { backgroundColor: t.bg, borderColor: t.accent + '40', width: PILL_W }]}>
      {/* Left accent stripe */}
      <View style={[st.stripe, { backgroundColor: t.accent }]} />

      {/* Icon badge */}
      <View style={[st.iconBadge, { backgroundColor: t.iconBg }]}>
        <Text style={[st.iconText, { color: t.accent }]}>{t.icon}</Text>
      </View>

      {/* Text */}
      <View style={st.textWrap}>
        <Text style={st.title} numberOfLines={1}>{props.text1}</Text>
        {props.text2 ? (
          <Text style={st.body} numberOfLines={2}>{props.text2}</Text>
        ) : null}
      </View>
    </View>
  );
}

export const toastConfig = {
  success: (p: BaseToastProps) => <Pill props={p} type="success" />,
  error:   (p: BaseToastProps) => <Pill props={p} type="error"   />,
  info:    (p: BaseToastProps) => <Pill props={p} type="info"    />,
  warning: (p: BaseToastProps) => <Pill props={p} type="warning" />,
};

const st = StyleSheet.create({
  pill: {
    alignSelf: 'flex-end',          // right-align inside the toast container
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 52,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 20px rgba(0,0,0,0.3)' } as any
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 10 }),
  },
  stripe: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  iconText: {
    fontSize: 13,
    fontWeight: '800',
  },
  textWrap: {
    flex: 1,
    paddingRight: 12,
    paddingVertical: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f0f0f0',
    letterSpacing: 0.1,
  },
  body: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.62)',
    marginTop: 2,
    lineHeight: 15,
  },
});
