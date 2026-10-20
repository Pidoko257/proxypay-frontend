/**
 * RetryToast — Issue #600
 *
 * An enhanced error toast that includes:
 *  • "Retry" button that enqueues the failed operation with exponential back-off.
 *  • Live attempt counter ("Retry 1 / 3").
 *  • "Cancel" button to abort in-progress retries.
 *  • Success/failure feedback after the retry sequence completes.
 *
 * Usage
 * ──────
 * ```tsx
 * import { showRetryToast } from './RetryToast'
 *
 * // In a catch block:
 * showRetryToast({
 *   message: 'Failed to load transactions.',
 *   label: 'GET /transactions',
 *   onRetry: () => proxyPayAPI.getTransactions(filters),
 * })
 * ```
 */

import React, { useEffect } from 'react'
import { useRetryStore, RetryOperation } from '../stores/retryStore'
import { useToastStore } from '../stores/toastStore'
import '../styles/RetryToast.css'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RetryToastOptions<T = unknown> {
  /** Error message displayed in the toast. */
  message: string
  /** Short label identifying the operation, e.g. "GET /transactions". */
  label: string
  /** The async function to retry. */
  onRetry: () => Promise<T>
  /** Max retry attempts (default 3). */
  maxAttempts?: number
  /** Initial back-off delay in ms (default 1000). */
  initialDelayMs?: number
  /** Called with the successful result when retry eventually succeeds. */
  onSuccess?: (result: T) => void
  /** Called after all attempts fail. */
  onFail?: (error: unknown) => void
}

// ─── Imperative helper ────────────────────────────────────────────────────────

/**
 * Fire-and-forget helper that shows an error toast with a Retry button.
 * Designed to be called from catch blocks outside of React components.
 */
export function showRetryToast<T>(options: RetryToastOptions<T>): void {
  const { enqueue } = useRetryStore.getState()
  const { show } = useToastStore.getState()

  const { id, promise } = enqueue(options.label, options.onRetry, {
    maxAttempts: options.maxAttempts,
    initialDelayMs: options.initialDelayMs,
  })

  // Show the error toast — the RetryStatusToast component will render live state
  // via the retry store.  We render a plain error toast first so there is
  // immediate feedback; the RetryStatusToast mounts automatically if the retry
  // store has matching operations.
  show(
    `${options.message} [Retry ${id}]`,
    'error',
    0, // persist until dismissed
  )

  promise
    .then((result) => {
      useToastStore.getState().success('✓ Retry succeeded.')
      options.onSuccess?.(result)
    })
    .catch((err: unknown) => {
      if (err instanceof DOMException && err.name === 'AbortError') return
      useToastStore.getState().error('All retry attempts failed. Please try again later.')
      options.onFail?.(err)
    })
}

// ─── In-band retry toast component ───────────────────────────────────────────

interface RetryToastItemProps {
  operation: RetryOperation
}

const RetryToastItem: React.FC<RetryToastItemProps> = ({ operation }) => {
  const { cancel, dismiss } = useRetryStore()
  const { dismiss: dismissToast, toasts } = useToastStore()

  // Auto-dismiss after success/cancelled/failed
  useEffect(() => {
    if (
      operation.status === 'succeeded' ||
      operation.status === 'cancelled' ||
      operation.status === 'failed'
    ) {
      const t = setTimeout(() => dismiss(operation.id), 4000)
      return () => clearTimeout(t)
    }
  }, [operation.status, operation.id, dismiss])

  // Dismiss the corresponding raw error toast when user cancels
  const handleCancel = () => {
    cancel(operation.id)
    // also dismiss any error toast that mentions this retry id
    toasts.forEach((t) => {
      if (t.message.includes(operation.id)) dismissToast(t.id)
    })
  }

  const isActive = operation.status === 'pending' || operation.status === 'retrying'

  return (
    <div
      className={`rtt-item rtt-status-${operation.status}`}
      role="status"
      aria-live="polite"
    >
      <div className="rtt-info">
        <span className="rtt-label">{operation.label}</span>
        {operation.status === 'retrying' && (
          <span className="rtt-attempt">
            Attempt {operation.attempt} / {operation.maxAttempts}
          </span>
        )}
        {operation.status === 'succeeded' && (
          <span className="rtt-badge rtt-badge-success">✓ Succeeded</span>
        )}
        {operation.status === 'failed' && (
          <span className="rtt-badge rtt-badge-failed">✕ Failed</span>
        )}
        {operation.status === 'cancelled' && (
          <span className="rtt-badge rtt-badge-cancelled">Cancelled</span>
        )}
      </div>
      {isActive && (
        <button
          className="rtt-cancel-btn"
          onClick={handleCancel}
          aria-label={`Cancel retry for ${operation.label}`}
        >
          Cancel
        </button>
      )}
      {!isActive && (
        <button
          className="rtt-dismiss-btn"
          onClick={() => dismiss(operation.id)}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  )
}

/**
 * RetryStatusPanel — renders all active retry operations.
 * Mount once near the app root alongside ToastNotifications.
 */
export const RetryStatusPanel: React.FC = () => {
  const { operations } = useRetryStore()
  const active = operations.filter((op) => op.status !== 'succeeded' || true)

  if (active.length === 0) return null

  return (
    <div className="rtt-panel" aria-label="Retry operations" role="region">
      {active.map((op) => (
        <RetryToastItem key={op.id} operation={op} />
      ))}
    </div>
  )
}

export default RetryStatusPanel
