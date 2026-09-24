import React, { useEffect, useRef } from 'react';

export type ToastType = 'error' | 'success' | 'info';

export interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
  type?: ToastType;
}

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
  error: { bg: '#fff5f5', border: '#fc8181', text: '#9b2c2c' },
  success: { bg: '#f0fff4', border: '#68d391', text: '#276749' },
  info: { bg: '#ebf8ff', border: '#63b3ed', text: '#2c5282' },
};

const TOAST_ICONS: Record<ToastType, string> = {
  error: '✕',
  success: '✓',
  info: 'ℹ',
};

const AUTO_DISMISS_MS = 5000;

export default function ErrorToast({
  message,
  onDismiss,
  type = 'error',
}: ErrorToastProps): React.JSX.Element {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [onDismiss]);

  const colors = TOAST_COLORS[type];
  const icon = TOAST_ICONS[type];

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        borderRadius: 8,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bg,
        color: colors.text,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        maxWidth: 360,
        fontSize: '0.9375rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        animation: 'pp-toast-in 0.2s ease-out',
      }}
    >
      {/* Type icon */}
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          fontWeight: 700,
          fontSize: '1rem',
          lineHeight: '1.4',
        }}
      >
        {icon}
      </span>

      {/* Message */}
      <p style={{ margin: 0, flex: 1, lineHeight: 1.4 }}>{message}</p>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1rem',
          lineHeight: 1,
          padding: '0 0.25rem',
          color: colors.text,
          opacity: 0.7,
        }}
      >
        ×
      </button>
    </div>
  );
}
