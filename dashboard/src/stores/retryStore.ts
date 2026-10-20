/**
 * Retry Store — Issue #600
 *
 * Manages in-progress retry operations triggered from error toasts.
 *
 * Features
 * ─────────
 * • Tracks each retry operation with attempt count and status.
 * • Supports cancellation of pending retries.
 * • Logs retry attempts via the interceptor log store (#597 integration).
 * • Configurable: max attempts (default 3) + initial back-off delay (default 1s).
 */

import { create } from 'zustand'
import { useInterceptorLogStore } from './interceptorLogStore'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RetryStatus = 'pending' | 'retrying' | 'succeeded' | 'failed' | 'cancelled'

export interface RetryOperation {
  id: string
  /** Human-readable label shown in the UI, e.g. "GET /transactions" */
  label: string
  attempt: number
  maxAttempts: number
  status: RetryStatus
  lastError?: string
}

export interface RetryConfig {
  maxAttempts?: number
  initialDelayMs?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `retry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Retry cancelled', 'AbortError'))
    })
  })
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface RetryStore {
  operations: RetryOperation[]

  /**
   * Enqueue a retry for an operation and execute it with exponential back-off.
   * Returns a promise that resolves/rejects with the final outcome.
   *
   * @param label  Human-readable description for the UI.
   * @param fn     The async operation to retry.
   * @param config Retry configuration options.
   * @returns      The operation id (for potential later cancellation) and the result promise.
   */
  enqueue: <T>(
    label: string,
    fn: () => Promise<T>,
    config?: RetryConfig,
  ) => { id: string; promise: Promise<T> }

  /**
   * Cancel a pending or in-progress retry operation.
   */
  cancel: (id: string) => void

  /**
   * Remove a completed/cancelled operation from the list.
   */
  dismiss: (id: string) => void
}

// AbortControllers keyed by operation id
const abortControllers = new Map<string, AbortController>()

export const useRetryStore = create<RetryStore>((set, get) => ({
  operations: [],

  enqueue: <T>(
    label: string,
    fn: () => Promise<T>,
    config: RetryConfig = {},
  ) => {
    const id = generateId()
    const maxAttempts = Math.max(1, config.maxAttempts ?? 3)
    const initialDelayMs = Math.max(0, config.initialDelayMs ?? 1000)
    const controller = new AbortController()
    abortControllers.set(id, controller)

    const operation: RetryOperation = {
      id,
      label,
      attempt: 0,
      maxAttempts,
      status: 'pending',
    }

    set((state) => ({ operations: [...state.operations, operation] }))

    const promise = (async (): Promise<T> => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (controller.signal.aborted) {
          throw new DOMException('Retry cancelled', 'AbortError')
        }

        // Update attempt count in store
        set((state) => ({
          operations: state.operations.map((op) =>
            op.id === id
              ? { ...op, attempt, status: 'retrying' }
              : op,
          ),
        }))

        // Log via interceptor store (#597)
        const logStore = useInterceptorLogStore.getState()
        const logId = logStore.entries.find(
          (e) => e.url.includes(label) && e.status === 'error',
        )?.id
        if (logId) {
          logStore.markRetry(logId, attempt)
        }

        try {
          const result = await fn()
          set((state) => ({
            operations: state.operations.map((op) =>
              op.id === id ? { ...op, status: 'succeeded' } : op,
            ),
          }))
          abortControllers.delete(id)
          return result
        } catch (err: unknown) {
          const isCancelled =
            err instanceof DOMException && err.name === 'AbortError'
          if (isCancelled) {
            set((state) => ({
              operations: state.operations.map((op) =>
                op.id === id ? { ...op, status: 'cancelled' } : op,
              ),
            }))
            throw err
          }

          const errorMsg = err instanceof Error ? err.message : 'Unknown error'

          if (attempt === maxAttempts) {
            set((state) => ({
              operations: state.operations.map((op) =>
                op.id === id
                  ? { ...op, status: 'failed', lastError: errorMsg }
                  : op,
              ),
            }))
            abortControllers.delete(id)
            throw err
          }

          // Exponential back-off between retries
          const backoff = initialDelayMs * 2 ** (attempt - 1)
          await delay(backoff, controller.signal)
        }
      }
      throw new Error('Retry loop exhausted')
    })()

    return { id, promise }
  },

  cancel: (id) => {
    const controller = abortControllers.get(id)
    if (controller) {
      controller.abort()
      abortControllers.delete(id)
    }
    set((state) => ({
      operations: state.operations.map((op) =>
        op.id === id && (op.status === 'pending' || op.status === 'retrying')
          ? { ...op, status: 'cancelled' }
          : op,
      ),
    }))
  },

  dismiss: (id) => {
    abortControllers.delete(id)
    set((state) => ({
      operations: state.operations.filter((op) => op.id !== id),
    }))
  },
}))
