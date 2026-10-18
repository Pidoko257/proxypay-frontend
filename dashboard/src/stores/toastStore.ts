/**
 * Toast Store — Issue #447
 * Zustand store for global toast notifications in the dashboard.
 *
 * Features:
 * - success / error / info / warning types
 * - Auto-dismiss after configurable duration (default 5 s)
 * - Stacking multiple toasts
 */

import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: string
  message: string
  type: ToastType
  /** Duration in ms before auto-dismiss. 0 = persist until manually dismissed. */
  duration: number
}

interface ToastStore {
  toasts: ToastMessage[]
  /** Show a toast. Returns the generated id. */
  show: (message: string, type?: ToastType, duration?: number) => string
  /** Remove a specific toast by id. */
  dismiss: (id: string) => void
  /** Convenience wrappers */
  success: (message: string, duration?: number) => string
  error: (message: string, duration?: number) => string
  info: (message: string, duration?: number) => string
  warning: (message: string, duration?: number) => string
}

const DEFAULT_DURATION = 5000

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  show: (message: string, type: ToastType = 'info', duration = DEFAULT_DURATION): string => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const toast: ToastMessage = { id, message, type, duration }
    set((state) => ({ toasts: [...state.toasts, toast] }))

    if (duration > 0) {
      setTimeout(() => get().dismiss(id), duration)
    }

    return id
  },

  dismiss: (id: string) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },

  success: (message, duration) => get().show(message, 'success', duration),
  error: (message, duration) => get().show(message, 'error', duration),
  info: (message, duration) => get().show(message, 'info', duration),
  warning: (message, duration) => get().show(message, 'warning', duration),
}))
