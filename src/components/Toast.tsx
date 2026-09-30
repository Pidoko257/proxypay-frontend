/**
 * Toast Notification Component
 * Issue #447 — Toast notifications for user actions
 *
 * Features:
 * - success / error / info / warning types
 * - Auto-dismiss after configurable duration (default 5 s)
 * - Stacking multiple toasts
 * - Accessibility: aria-live="polite" region
 * - No dangerouslySetInnerHTML; no eval
 */

import React, { useEffect, useRef, useState } from 'react';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  /** Duration in ms before auto-dismiss. 0 = persist until closed. Default 5000. */
  duration?: number;
}

interface ToastProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
}

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

const TYPE_CLASS: Record<ToastType, string> = {
  success: styles.toastSuccess,
  error: styles.toastError,
  info: styles.toastInfo,
  warning: styles.toastWarning,
};

/**
 * Individual toast item — manages its own dismissing animation state.
 */
const ToastItem: React.FC<{
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const [dismissing, setDismissing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    setDismissing(true);
    timerRef.current = setTimeout(() => onDismiss(toast.id), 250);
  };

  useEffect(() => {
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      timerRef.current = setTimeout(dismiss, duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // We intentionally only run this on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="alert"
      aria-atomic="true"
      className={`${styles.toast} ${TYPE_CLASS[toast.type]}${dismissing ? ` ${styles.dismissing}` : ''}`}
      data-testid={`toast-${toast.id}`}
    >
      <div className={styles.toastContent}>
        <span className={styles.toastIcon} aria-hidden="true">
          {TOAST_ICONS[toast.type]}
        </span>
        <span className={styles.toastMessage}>{toast.message}</span>
      </div>
      <button
        className={styles.toastClose}
        onClick={dismiss}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

/**
 * Toast Container — render this once near the root of your app.
 */
export const Toast: React.FC<ToastProps> = ({ messages, onDismiss }) => {
  return (
    /* aria-live="polite" announces new toasts to screen readers without
       interrupting the user's current action */
    <div
      className={styles.toastContainer}
      aria-live="polite"
      aria-label="Notifications"
      data-testid="toast-container"
    >
      {messages.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

/**
 * useToast — local hook for managing toast state in a component.
 *
 * Usage:
 * ```tsx
 * const { messages, dismiss, success, error, info, warning } = useToast();
 * // …
 * <Toast messages={messages} onDismiss={dismiss} />
 * ```
 */
export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const show = (message: string, type: ToastType = 'info', duration = 5000): string => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setMessages((prev) => [...prev, { id, message, type, duration }]);
    return id;
  };

  const dismiss = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const success = (message: string, duration?: number) => show(message, 'success', duration);
  const error = (message: string, duration?: number) => show(message, 'error', duration);
  const info = (message: string, duration?: number) => show(message, 'info', duration);
  const warning = (message: string, duration?: number) => show(message, 'warning', duration);

  return { messages, show, dismiss, success, error, info, warning };
}

export default Toast;
