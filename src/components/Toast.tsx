/**
 * Toast Notification Component
 * Displays temporary notification messages
 */

import React, { useEffect, useState } from 'react';
import styles from './RedocViewer.module.css';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  messages: ToastMessage[];
  onDismiss?: (id: string) => void;
}

/**
 * Toast Container Component
 */
export const Toast: React.FC<ToastProps> = ({ messages, onDismiss }) => {
  return (
    <div className={styles.toastContainer}>
      {messages.map(toast => (
        <div key={toast.id} className={`${styles.toast} ${styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]}`}>
          <div className={styles.toastContent}>
            {toast.type === 'success' && <span className={styles.toastIcon}>✓</span>}
            {toast.type === 'error' && <span className={styles.toastIcon}>✕</span>}
            {toast.type === 'info' && <span className={styles.toastIcon}>ℹ</span>}
            {toast.type === 'warning' && <span className={styles.toastIcon}>⚠</span>}
            <span className={styles.toastMessage}>{toast.message}</span>
          </div>
          {onDismiss && (
            <button
              className={styles.toastClose}
              onClick={() => onDismiss(toast.id)}
              aria-label="Close notification"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Hook for managing toast messages
 */
export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const show = (message: string, type: ToastType = 'info', duration = 3000) => {
    const id = Date.now().toString();
    setMessages(prev => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }

    return id;
  };

  const dismiss = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const success = (message: string, duration?: number) => show(message, 'success', duration);
  const error = (message: string, duration?: number) => show(message, 'error', duration);
  const info = (message: string, duration?: number) => show(message, 'info', duration);
  const warning = (message: string, duration?: number) => show(message, 'warning', duration);

  return {
    messages,
    show,
    dismiss,
    success,
    error,
    info,
    warning,
  };
}

export default Toast;
