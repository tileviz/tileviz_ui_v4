// utils/alert.ts — Platform-aware alert & toast utilities
// All errors shown to users are sanitized — no stack traces, function names,
// or raw HTTP internals are ever exposed.
import Toast from 'react-native-toast-message';

// Navbar height: status bar (~24) + app header (~56) + breathing room
const TOP_OFFSET = 92;

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

// ── Error sanitizer ──────────────────────────────────────────
// Converts ANY error into a short, user-friendly string.
// NEVER exposes: stack traces, function names, file paths, raw HTTP bodies.
export function sanitizeError(err: unknown): string {
  if (!err) return 'Something went wrong. Please try again.';

  // Extract a raw string from the error
  const raw: string =
    (err as any)?.response?.data?.message ||
    (err as any)?.response?.data?.error   ||
    (err as any)?.message                  ||
    String(err);

  const lower = raw.toLowerCase();

  // Network / connectivity
  if (lower.includes('network') || lower.includes('econnrefused') ||
      lower.includes('fetch') || lower.includes('socket') ||
      lower.includes('failed to connect')) {
    return 'Network error. Check your connection and try again.';
  }
  // Auth
  if (lower.includes('401') || lower.includes('unauthorized') ||
      lower.includes('unauthenticated') || lower.includes('token')) {
    return 'Session expired. Please sign in again.';
  }
  // Permission
  if (lower.includes('403') || lower.includes('forbidden') ||
      lower.includes('permission')) {
    return "You don't have permission to do this.";
  }
  // Not found
  if (lower.includes('404') || lower.includes('not found')) {
    return 'The requested item was not found.';
  }
  // Server error
  if (lower.includes('500') || lower.includes('internal server') ||
      lower.includes('server error')) {
    return 'Server error. Please try again in a moment.';
  }
  // Timeout
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'Request timed out. Please try again.';
  }
  // JS runtime errors — never show these to users
  if (
    lower.match(/typeerror|referenceerror|syntaxerror|cannot read|undefined is not|null is not|is not a function/) ||
    raw.includes(' at ') || raw.includes('.js:') || raw.includes('.tsx:')
  ) {
    return 'Something went wrong. Please try again.';
  }

  // If the message is short, human-readable, and has no tech jargon — use it
  if (raw.length <= 100 && !raw.includes('Error:') && !raw.includes('Exception')) {
    return raw;
  }

  return 'Something went wrong. Please try again.';
}

// ── Public API ───────────────────────────────────────────────

/**
 * Non-intrusive compact pill toast. Auto-dismisses from top-right.
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
    lower.includes('created') || title.includes('✅') ||
    lower.includes('loaded')
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
    topOffset: TOP_OFFSET,
  });

  if (onDismiss) onDismiss();
}

/**
 * Show a success toast — always green, no matter the title wording.
 */
export function showSuccess(title: string, message?: string, onDismiss?: () => void): void {
  Toast.show({ type: 'success', text1: title, text2: message, position: 'top', visibilityTime: 3000, autoHide: true, topOffset: TOP_OFFSET });
  if (onDismiss) onDismiss();
}

/**
 * Show a user-friendly error toast.
 * Pass the raw error object — it will be sanitized before display.
 */
export function showError(title: string, err?: unknown): void {
  const msg = err !== undefined ? sanitizeError(err) : undefined;
  Toast.show({ type: 'error', text1: title, text2: msg, position: 'top', visibilityTime: 4000, autoHide: true, topOffset: TOP_OFFSET });
}

export function showWarning(title: string, message?: string): void {
  Toast.show({ type: 'warning', text1: title, text2: message, position: 'top', visibilityTime: 3500, autoHide: true, topOffset: TOP_OFFSET });
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
 * Themed dialog with custom buttons.
 */
export function showAlertWithButtons(
  title: string,
  message: string,
  buttons: AlertButton[],
): void {
  emit({ title, message, buttons });
}

// ── Legacy re-export ─────────────────────────────────────────
export const onShowConfirm = onShowAlert;
