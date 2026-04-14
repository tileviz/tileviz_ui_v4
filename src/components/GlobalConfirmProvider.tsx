// GlobalConfirmProvider — listens for showConfirm events and renders a modal dialog
// Replaces platform-specific Alert.alert / window.confirm with a unified custom UI
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
} from 'react-native';
import { onShowConfirm } from '../utils/alert';
import { Colors, Radii, Shadows } from '../config/theme';

interface ConfirmState {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

const INITIAL: ConfirmState = {
  visible: false,
  title: '',
  message: '',
  onConfirm: () => {},
  onCancel: undefined,
};

export function GlobalConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>(INITIAL);

  useEffect(() => {
    const unsub = onShowConfirm(({ title, message, onConfirm, onCancel }) => {
      setState({ visible: true, title, message, onConfirm, onCancel });
    });
    return unsub;
  }, []);

  function handleConfirm() {
    setState(INITIAL);
    state.onConfirm();
  }

  function handleCancel() {
    setState(INITIAL);
    state.onCancel?.();
  }

  return (
    <>
      {children}
      <Modal
        visible={state.visible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <Pressable style={s.backdrop} onPress={handleCancel}>
          <Pressable style={s.dialog} onPress={() => {}}>
            <Text style={s.title}>{state.title}</Text>
            {!!state.message && <Text style={s.message}>{state.message}</Text>}
            <View style={s.actions}>
              <TouchableOpacity style={[s.btn, s.btnCancel]} onPress={handleCancel}>
                <Text style={s.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.btnConfirm]} onPress={handleConfirm}>
                <Text style={s.btnConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    ...Shadows.card,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text1,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.text2,
    lineHeight: 20,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  btn: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: Radii.md,
    minWidth: 80,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text1,
  },
  btnConfirm: {
    backgroundColor: '#EF4444',
  },
  btnConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
