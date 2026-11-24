/**
 * API Config Store — Issue #598
 *
 * Manages the API base URL and environment selection. Persists to localStorage.
 *
 * Features
 * ─────────
 * • Predefined development / staging / production environments.
 * • Custom URL override with format validation.
 * • Persist selected environment across page reloads.
 * • Connectivity test before switching.
 * • Environment-specific warnings (staging, dev).
 */

import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApiEnvironment = 'development' | 'staging' | 'production' | 'custom'

export interface EnvironmentConfig {
  name: ApiEnvironment
  label: string
  baseUrl: string
  warning?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const ENVIRONMENTS: EnvironmentConfig[] = [
  {
    name: 'production',
    label: 'Production',
    baseUrl: '/api',
  },
  {
    name: 'staging',
    label: 'Staging',
    baseUrl: '/api/staging',
    warning: '⚠ You are connected to the staging environment. Data may be reset at any time.',
  },
  {
    name: 'development',
    label: 'Development',
    baseUrl: 'http://localhost:3000/api',
    warning: '🛠 Development environment — not for production use.',
  },
  {
    name: 'custom',
    label: 'Custom URL',
    baseUrl: '',
    warning: '⚙ Custom URL in use. Verify the endpoint is correct before proceeding.',
  },
]

const STORAGE_KEY = 'proxypay-api-config'

// ─── Validation ───────────────────────────────────────────────────────────────

export function isValidApiUrl(url: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    // Relative paths (e.g. /api) are also valid
    return url.startsWith('/')
  }
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

interface PersistedConfig {
  environment: ApiEnvironment
  customUrl: string
}

function loadConfig(): PersistedConfig {
  try {
    const raw =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY)
        : null
    if (!raw) return { environment: 'production', customUrl: '' }
    const parsed = JSON.parse(raw) as Partial<PersistedConfig>
    return {
      environment: parsed.environment ?? 'production',
      customUrl: parsed.customUrl ?? '',
    }
  } catch {
    return { environment: 'production', customUrl: '' }
  }
}

function saveConfig(config: PersistedConfig): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    }
  } catch {
    // ignore
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface ApiConfigStore {
  environment: ApiEnvironment
  customUrl: string
  /** True while a connectivity test is running */
  testing: boolean
  /** Result of the last connectivity test */
  testResult: 'ok' | 'error' | null
  testError: string | null

  /** Switch to a predefined or custom environment. */
  setEnvironment: (env: ApiEnvironment) => void

  /** Update the custom URL (only relevant when environment === 'custom'). */
  setCustomUrl: (url: string) => void

  /** Returns the effective base URL for the active environment. */
  getEffectiveBaseUrl: () => string

  /** Returns the warning for the current environment (if any). */
  getWarning: () => string | undefined

  /** Test connectivity against the effective base URL. */
  testConnectivity: () => Promise<void>
}

const persisted = loadConfig()

export const useApiConfigStore = create<ApiConfigStore>((set, get) => ({
  environment: persisted.environment,
  customUrl: persisted.customUrl,
  testing: false,
  testResult: null,
  testError: null,

  setEnvironment: (env) => {
    const customUrl = get().customUrl
    saveConfig({ environment: env, customUrl })
    set({ environment: env, testResult: null, testError: null })
  },

  setCustomUrl: (url) => {
    const environment = get().environment
    saveConfig({ environment, customUrl: url })
    set({ customUrl: url, testResult: null, testError: null })
  },

  getEffectiveBaseUrl: () => {
    const { environment, customUrl } = get()
    if (environment === 'custom') {
      return customUrl || '/api'
    }
    return ENVIRONMENTS.find((e) => e.name === environment)?.baseUrl ?? '/api'
  },

  getWarning: () => {
    const { environment } = get()
    return ENVIRONMENTS.find((e) => e.name === environment)?.warning
  },

  testConnectivity: async () => {
    const base = get().getEffectiveBaseUrl()
    const healthUrl = base.endsWith('/')
      ? `${base}health`
      : `${base}/health`

    set({ testing: true, testResult: null, testError: null })

    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(8000),
      })
      if (response.ok) {
        set({ testing: false, testResult: 'ok', testError: null })
      } else {
        set({
          testing: false,
          testResult: 'error',
          testError: `Server responded with ${response.status} ${response.statusText}`,
        })
      }
    } catch (err) {
      set({
        testing: false,
        testResult: 'error',
        testError: err instanceof Error ? err.message : 'Connection failed',
      })
    }
  },
}))
