// ============================================================
//  utils/alert.ts — Platform-aware alert & toast utilities
//  All dialogs (info, confirm, multi-button) route through a
//  themed modal rendered by GlobalConfirmProvider.
//  Success/info/error toasts use react-native-toast-message.
// ============================================================

import Toast from 'react-native-toast-message';

// ── Types ────────────────────────────────────────────────────
export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive' | 'primary';
}

export type AlertEvent = {
  title: string;
  message: string;
  buttons: AlertButton[];
};

type AlertListener = (e: AlertEvent) => void;

// ── Global event bus ─────────────────────────────────────────
const listeners: AlertListener[] = [];

export function onShowAlert(listener: AlertListener) {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function emit(e: AlertEvent) {
  listeners.forEach(fn => fn(e));
}

// ── Public API ───────────────────────────────────────────────

/**
 * Non-intrusive toast notification. Auto-dismisses.
 */
export function showAlert(
  title: string,
  message?: string,
  onDismiss?: () => void,
): void {
  const lower = title.toLowerCase();
  let type: 'success' | 'error' | 'info' = 'info';
  if (
    lower.includes('success') || lower.includes('saved') ||
    lower.includes('deleted') || lower.includes('done') ||
    lower.includes('created') || title.includes('✅')
  ) type = 'success';
  else if (
    lower.includes('error') || lower.includes('fail') ||
    lower.includes('denied') || title.includes('❌')
  ) type = 'error';

  const cleanTitle = title.replace(/^[✅❌⚠️ℹ️🎉💾📤🔍]+\s*/g, '').trim() || title;

  Toast.show({
    type,
    text1: cleanTitle,
    text2: message || undefined,
    position: 'top',
    visibilityTime: type === 'error' ? 4000 : 3000,
    autoHide: true,
    topOffset: 50,
  });

  if (onDismiss) onDismiss();
}

/**
 * Themed confirmation dialog (Cancel + Confirm).
 */
export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
): void {
  emit({
    title,
    message,
    buttons: [
      { text: 'Cancel', style: 'cancel', onPress: onCancel },
      { text: 'Confirm', style: 'destructive', onPress: onConfirm },
    ],
  });
}

/**
 * Themed dialog with custom buttons. ALL buttons render inside the
 * themed modal — no native Alert.alert or window.confirm.
 */
export function showAlertWithButtons(
  title: string,
  message: string,
  buttons: AlertButton[],
): void {
  emit({ title, message, buttons });
}

// ── Toast conveniences ───────────────────────────────────────
export function showSuccess(title: string, message?: string, onDismiss?: () => void): void {
  Toast.show({ type: 'success', text1: title, text2: message || undefined, position: 'top', visibilityTime: 3000, autoHide: true, topOffset: 50 });
  if (onDismiss) onDismiss();
}

export function showError(title: string, message?: string): void {
  Toast.show({ type: 'error', text1: title, text2: message || undefined, position: 'top', visibilityTime: 4000, autoHide: true, topOffset: 50 });
}

export function showWarning(title: string, message?: string): void {
  Toast.show({ type: 'warning', text1: title, text2: message || undefined, position: 'top', visibilityTime: 3500, autoHide: true, topOffset: 50 });
}

// ── Legacy re-export for backward compat ─────────────────────
// onShowConfirm is now onShowAlert — keep old name working
export const onShowConfirm = onShowAlert;
