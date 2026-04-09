// ============================================================
//  utils/alert.ts — Platform-aware alert utilities
//  Works on both web (window.confirm/alert) and native (Alert)
// ============================================================

import { Alert, Platform } from 'react-native';

/**
 * Show a confirmation dialog that works on both web and native platforms
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
  if (Platform.OS === 'web') {
    // Web: Use window.confirm
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  } else {
    // Native: Use React Native Alert
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'OK',
          style: 'destructive',
          onPress: onConfirm,
        },
      ],
      { cancelable: true }
    );
  }
}

/**
 * Show a simple alert message that works on both web and native platforms
 * @param title - Alert title
 * @param message - Alert message
 * @param onDismiss - Optional callback when alert is dismissed
 */
export function showAlert(
  title: string,
  message?: string,
  onDismiss?: () => void
): void {
  if (Platform.OS === 'web') {
    // Web: Use window.alert
    if (message) {
      window.alert(`${title}\n\n${message}`);
    } else {
      window.alert(title);
    }
    if (onDismiss) {
      onDismiss();
    }
  } else {
    // Native: Use React Native Alert
    Alert.alert(
      title,
      message,
      [{ text: 'OK', onPress: onDismiss }],
      { cancelable: false }
    );
  }
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

