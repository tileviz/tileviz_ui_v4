// ============================================================
//  utils/alert.ts — Platform-aware alert & toast utilities
//  Success/info/error → non-intrusive toast (react-native-toast-message)
//  Confirmations → native Alert (requires user decision)
// ============================================================

import { Alert, Platform } from 'react-native'; // Alert/Platform still used by showAlertWithButtons
import Toast from 'react-native-toast-message';

// Simple event emitter for global confirm modal
type ConfirmEvent = {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
};
type ConfirmListener = (e: ConfirmEvent) => void;
const confirmListeners: ConfirmListener[] = [];
export function onShowConfirm(listener: ConfirmListener) {
  confirmListeners.push(listener);
  return () => {
    const idx = confirmListeners.indexOf(listener);
    if (idx !== -1) confirmListeners.splice(idx, 1);
  };
}
function emitShowConfirm(e: ConfirmEvent) {
  confirmListeners.forEach(fn => fn(e));
}

/**
 * Show a non-intrusive toast notification (replaces blocking Alert.alert)
 * Auto-dismisses after ~3 seconds. Does NOT block the UI.
 * @param title - Toast title
 * @param message - Toast body (optional)
 * @param onDismiss - Optional callback, fires immediately (non-blocking)
 */
export function showAlert(
  title: string,
  message?: string,
  onDismiss?: () => void
): void {
  // Determine toast type from title keywords
  const lower = title.toLowerCase();
  let type: 'success' | 'error' | 'info' = 'info';
  if (lower.includes('success') || lower.includes('saved') || lower.includes('deleted') || lower.includes('done') || lower.includes('created') || title.includes('✅')) {
    type = 'success';
  } else if (lower.includes('error') || lower.includes('fail') || lower.includes('denied') || title.includes('❌')) {
    type = 'error';
  }

  // Strip emoji prefixes from title for cleaner display
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

  // Fire callback immediately — non-blocking
  if (onDismiss) {
    onDismiss();
  }
}

/**
 * Show a confirmation dialog that works on both web and native platforms
 * This remains a blocking dialog since confirmations require user decision.
 * @param title - Dialog title
 * @param message - Dialog message
 * @param onConfirm - Callback when user confirms
 * @param onCancel - Optional callback when user cancels
 */
export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): void {
  emitShowConfirm({ title, message, onConfirm, onCancel });
}

/**
 * Show an alert with custom buttons (native only, falls back to confirm on web)
 * @param title - Alert title
 * @param message - Alert message
 * @param buttons - Array of button configurations
 */
export function showAlertWithButtons(
  title: string,
  message: string,
  buttons: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>
): void {
  if (Platform.OS === 'web') {
    // Web: Fallback to simple confirm/alert based on button count
    if (buttons.length === 1) {
      window.alert(`${title}\n\n${message}`);
      buttons[0].onPress?.();
    } else {
      // Show confirm for 2 buttons
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) {
        // Find the non-cancel button
        const confirmButton = buttons.find(b => b.style !== 'cancel');
        confirmButton?.onPress?.();
      } else {
        // Find the cancel button
        const cancelButton = buttons.find(b => b.style === 'cancel');
        cancelButton?.onPress?.();
      }
    }
  } else {
    // Native: Use React Native Alert with custom buttons
    Alert.alert(title, message, buttons);
  }
}

/**
 * Convenience: show a success toast
 */
export function showSuccess(title: string, message?: string, onDismiss?: () => void): void {
  Toast.show({
    type: 'success',
    text1: title,
    text2: message || undefined,
    position: 'top',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 50,
  });
  if (onDismiss) onDismiss();
}

/**
 * Convenience: show an error toast
 */
export function showError(title: string, message?: string): void {
  Toast.show({
    type: 'error',
    text1: title,
    text2: message || undefined,
    position: 'top',
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 50,
  });
}

/**
 * Convenience: show a warning toast
 */
export function showWarning(title: string, message?: string): void {
  Toast.show({
    type: 'warning',
    text1: title,
    text2: message || undefined,
    position: 'top',
    visibilityTime: 3500,
    autoHide: true,
    topOffset: 50,
  });
}
