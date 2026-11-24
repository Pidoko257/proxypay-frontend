/**
 * ToastNotifications component — Issue #447
 *
 * Renders all active toasts from the global Zustand toastStore.
 * Mount this once at the App root.
 *
 * Features:
 * - success / error / info / warning types
 * - Auto-dismiss (controlled by the store's timer)
 * - Exit animation before removal
 * - Stacking (newest at bottom)
 * - aria-live="polite" for accessibility
 * - Optional action button (e.g. reload on spec update) — Issue #711
 */

import React, { useEffect, useRef, useState } from 'react'
import { useToastStore, ToastMessage } from '../stores/toastStore'
import '../styles/Toast.css'

const ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
}

const ToastItem: React.FC<{
  toast: ToastMessage
  onDismiss: (id: string) => void
}> = ({ toast, onDismiss }) => {
  const [dismissing, setDismissing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDismiss = () => {
    setDismissing(true)
    timerRef.current = setTimeout(() => onDismiss(toast.id), 250)
  }

  const handleAction = () => {
    if (!toast.action) return
    try {
      toast.action.onClick()
    } finally {
      handleDismiss()
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div
      role="alert"
      aria-atomic="true"
      className={`toast toast-${toast.type}${dismissing ? ' dismissing' : ''}`}
      data-testid={`toast-${toast.id}`}
    >
      <div className="toast-content">
        <span className="toast-icon" aria-hidden="true">
          {ICONS[toast.type]}
        </span>
        <span className="toast-message">{toast.message}</span>
      </div>
      {toast.action && (
        <button
          className="toast-action"
          onClick={handleAction}
          data-testid={`toast-action-${toast.id}`}
        >
          {toast.action.label}
        </button>
      )}
      <button
        className="toast-close"
        onClick={handleDismiss}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  )
}

export const ToastNotifications: React.FC = () => {
  const { toasts, dismiss } = useToastStore()

  return (
    <div
      className="toast-container"
      aria-live="polite"
      aria-label="Notifications"
      data-testid="toast-container"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  )
}

export default ToastNotifications
