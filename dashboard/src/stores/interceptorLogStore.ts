/**
 * Interceptor Log Store — Issue #597
 *
 * Zustand store that holds the full request/response log history captured by
 * the Axios interceptors registered in api.ts.
 *
 * Features
 * ─────────
 * • Stores method, URL, params, status, headers, duration, and timestamps.
 * • Persists up to MAX_ENTRIES logs in localStorage.
 * • Automatically purges entries older than LOG_RETENTION_MS (24 h).
 * • Exposes filter helpers (by endpoint substring and by HTTP method).
 * • Exposes an export helper that serialises the visible log to JSON.
 * • Tracks a lightweight dedup-metrics counter (populated by #599).
 */

import { create } from 'zustand'

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'proxypay-interceptor-logs'
const MAX_ENTRIES = 200
export const LOG_RETENTION_MS = 24 * 60 * 60 * 1000 // 24 hours

// ─── Types ────────────────────────────────────────────────────────────────────

export type LogEntryStatus = 'pending' | 'success' | 'error'

export interface RequestLogEntry {
  id: string
  /** Unix timestamp (ms) when the request was fired */
  requestedAt: number
  method: string
  url: string
  params: Record<string, unknown>
  requestHeaders: Record<string, string>
  status: LogEntryStatus
  /** HTTP status code (undefined while the request is still in-flight) */
  statusCode?: number
  responseHeaders?: Record<string, string>
  /** Round-trip duration in ms (undefined while in-flight) */
  durationMs?: number
  /** Error message if status === 'error' */
  errorMessage?: string
  /** True when this entry was suppressed by the dedup layer (#599) */
  deduplicated?: boolean
  /** Retry attempt index if this was a retry (#600) */
  retryAttempt?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function persist(entries: RequestLogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // quota exceeded — silently swallow
  }
}

function loadFromStorage(): RequestLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const cutoff = Date.now() - LOG_RETENTION_MS
    return (parsed as RequestLogEntry[]).filter((e) => e.requestedAt > cutoff)
  } catch {
    return []
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface InterceptorLogStore {
  entries: RequestLogEntry[]

  /** Add a new "pending" log entry when a request fires. Returns the entry id. */
  addRequest: (
    method: string,
    url: string,
    params: Record<string, unknown>,
    requestHeaders: Record<string, string>,
  ) => string

  /** Update an existing entry once the response arrives. */
  resolveRequest: (
    id: string,
    statusCode: number,
    responseHeaders: Record<string, string>,
    durationMs: number,
  ) => void

  /** Mark an existing entry as errored. */
  rejectRequest: (
    id: string,
    errorMessage: string,
    durationMs: number,
    statusCode?: number,
  ) => void

  /** Mark an entry as deduplicated (not actually sent). */
  markDeduplicated: (id: string) => void

  /** Mark an entry as a retry attempt. */
  markRetry: (id: string, attempt: number) => void

  /** Remove entries older than LOG_RETENTION_MS. */
  purgeOldEntries: () => void

  /** Clear all entries from memory and localStorage. */
  clearAll: () => void

  /** Export the current (optionally filtered) log as a JSON string. */
  exportLogs: (filter?: { endpoint?: string; method?: string }) => string
}

export const useInterceptorLogStore = create<InterceptorLogStore>((set, get) => ({
  entries: loadFromStorage(),

  addRequest: (method, url, params, requestHeaders) => {
    const id = generateId()
    const entry: RequestLogEntry = {
      id,
      requestedAt: Date.now(),
      method: method.toUpperCase(),
      url,
      params,
      requestHeaders,
      status: 'pending',
    }
    set((state) => {
      const updated = [entry, ...state.entries].slice(0, MAX_ENTRIES)
      persist(updated)
      return { entries: updated }
    })
    return id
  },

  resolveRequest: (id, statusCode, responseHeaders, durationMs) => {
    set((state) => {
      const updated = state.entries.map((e) =>
        e.id === id
          ? {
              ...e,
              status: (statusCode >= 200 && statusCode < 400
                ? 'success'
                : 'error') as LogEntryStatus,
              statusCode,
              responseHeaders,
              durationMs,
            }
          : e,
      )
      persist(updated)
      return { entries: updated }
    })
  },

  rejectRequest: (id, errorMessage, durationMs, statusCode) => {
    set((state) => {
      const updated = state.entries.map((e) =>
        e.id === id
          ? {
              ...e,
              status: 'error' as LogEntryStatus,
              errorMessage,
              durationMs,
              ...(statusCode !== undefined ? { statusCode } : {}),
            }
          : e,
      )
      persist(updated)
      return { entries: updated }
    })
  },

  markDeduplicated: (id) => {
    set((state) => {
      const updated = state.entries.map((e) =>
        e.id === id ? { ...e, deduplicated: true } : e,
      )
      persist(updated)
      return { entries: updated }
    })
  },

  markRetry: (id, attempt) => {
    set((state) => {
      const updated = state.entries.map((e) =>
        e.id === id ? { ...e, retryAttempt: attempt } : e,
      )
      persist(updated)
      return { entries: updated }
    })
  },

  purgeOldEntries: () => {
    const cutoff = Date.now() - LOG_RETENTION_MS
    set((state) => {
      const updated = state.entries.filter((e) => e.requestedAt > cutoff)
      persist(updated)
      return { entries: updated }
    })
  },

  clearAll: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    set({ entries: [] })
  },

  exportLogs: (filter) => {
    const { entries } = get()
    let visible = entries
    if (filter?.method) {
      visible = visible.filter(
        (e) => e.method === filter.method!.toUpperCase(),
      )
    }
    if (filter?.endpoint) {
      const term = filter.endpoint.toLowerCase()
      visible = visible.filter((e) => e.url.toLowerCase().includes(term))
    }
    return JSON.stringify(visible, null, 2)
  },
}))
