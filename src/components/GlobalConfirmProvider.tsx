// GlobalConfirmProvider — themed modal for ALL app dialogs
// Listens for events from showConfirm / showAlertWithButtons
// Renders a premium dark-glass modal matching the TileViz theme
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
  Animated, useWindowDimensions,
} from 'react-native';
import { onShowAlert, AlertButton } from '../utils/alert';
import { Colors, Radii } from '../config/theme';

interface DialogState {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
}

const INITIAL: DialogState = {
  visible: false,
  title: '',
  message: '',
  buttons: [],
};

export function GlobalConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>(INITIAL);
  const { width } = useWindowDimensions();
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsub = onShowAlert(({ title, message, buttons }) => {
      setState({ visible: true, title, message, buttons });
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
    return unsub;
  }, []);

  function dismiss(callback?: () => void) {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setState(INITIAL);
      callback?.();
    });
  }

  function handleButton(btn: AlertButton) {
    dismiss(btn.onPress);
  }

  function handleBackdrop() {
    const cancelBtn = state.buttons.find(b => b.style === 'cancel');
    dismiss(cancelBtn?.onPress);
  }

  const modalWidth = Math.min(width - 48, 420);

  // Determine button styling
  function btnStyle(btn: AlertButton, idx: number) {
    if (btn.style === 'destructive') return s.btnDestructive;
    if (btn.style === 'primary') return s.btnPrimary;
    if (btn.style === 'cancel') return s.btnCancel;
    // Default: if it's the last non-cancel button, make it primary
    const nonCancel = state.buttons.filter(b => b.style !== 'cancel');
    if (idx === state.buttons.indexOf(nonCancel[nonCancel.length - 1])) return s.btnPrimary;
    return s.btnDefault;
  }

  function btnTextStyle(btn: AlertButton, idx: number) {
    if (btn.style === 'destructive') return s.btnDestructiveText;
    if (btn.style === 'primary') return s.btnPrimaryText;
    if (btn.style === 'cancel') return s.btnCancelText;
    const nonCancel = state.buttons.filter(b => b.style !== 'cancel');
    if (idx === state.buttons.indexOf(nonCancel[nonCancel.length - 1])) return s.btnPrimaryText;
    return s.btnDefaultText;
  }

  // Order: cancel buttons last
  const orderedButtons = [
    ...state.buttons.filter(b => b.style !== 'cancel'),
    ...state.buttons.filter(b => b.style === 'cancel'),
  ];

  return (
    <>
      {children}
      <Modal
        visible={state.visible}
        transparent
        animationType="none"
        onRequestClose={handleBackdrop}
        statusBarTranslucent
      >
        <Pressable style={s.backdrop} onPress={handleBackdrop}>
          <Animated.View
            style={[
              s.dialog,
              { width: modalWidth, opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
            ]}
          >
            <Pressable onPress={() => {}}>
              {/* Accent bar */}
              <View style={s.accentBar} />

              {/* Content */}
              <View style={s.content}>
                <Text style={s.title}>{state.title}</Text>
                {!!state.message && <Text style={s.message}>{state.message}</Text>}
              </View>

              {/* Divider */}
              <View style={s.divider} />

              {/* Buttons */}
              <View style={s.actions}>
                {orderedButtons.map((btn, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[s.btn, btnStyle(btn, state.buttons.indexOf(btn))]}
                    onPress={() => handleButton(btn)}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.btnText, btnTextStyle(btn, state.buttons.indexOf(btn))]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 12, 24, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: Colors.primary2,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(124, 111, 247, 0.2)',
    shadowColor: '#7C6FF7',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 20,
  },
  accentBar: {
    height: 3,
    backgroundColor: Colors.accent,
    opacity: 0.6,
  },
  content: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E8EAF4',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: 'rgba(232, 234, 244, 0.6)',
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(124, 111, 247, 0.12)',
    marginHorizontal: 16,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: Radii.md,
    minWidth: 80,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Primary action (purple gradient feel)
  btnPrimary: {
    backgroundColor: Colors.accent,
  },
  btnPrimaryText: {
    color: '#fff',
  },
  // Destructive action (red)
  btnDestructive: {
    backgroundColor: '#DC2626',
  },
  btnDestructiveText: {
    color: '#fff',
  },
  // Cancel
  btnCancel: {
    backgroundColor: 'rgba(232, 234, 244, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232, 234, 244, 0.15)',
  },
  btnCancelText: {
    color: 'rgba(232, 234, 244, 0.6)',
  },
  // Default
  btnDefault: {
    backgroundColor: 'rgba(124, 111, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124, 111, 247, 0.25)',
  },
  btnDefaultText: {
    color: '#E8EAF4',
  },
});
