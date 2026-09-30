import { create } from 'zustand'

export type FlagScope = 'user' | 'session'

export interface FeatureFlag {
  key: string
  description: string
  scope: FlagScope
  defaultEnabled: boolean
  enabled: boolean
}

interface FeatureFlagStore {
  flags: FeatureFlag[]
  initialize: () => void
  isEnabled: (key: string) => boolean
  setEnabled: (key: string, enabled: boolean) => void
  setScope: (key: string, scope: FlagScope) => void
}

const definitions: Omit<FeatureFlag, 'scope' | 'enabled'>[] = [
  {
    key: 'transaction-row-preview',
    description: 'Show transaction details on row hover, focus, or touch.',
    defaultEnabled: true,
  },
  {
    key: 'performance-alerts',
    description: 'Display alerts when measured performance exceeds thresholds.',
    defaultEnabled: true,
  },
]

const tokenNamespace = (token: string) => {
  let hashValue = 2166136261
  for (let index = 0; index < token.length; index += 1) {
    hashValue = Math.imul(hashValue ^ token.charCodeAt(index), 16777619)
  }
  return `token-${(hashValue >>> 0).toString(36)}`
}

const userId = () => {
  try {
    const explicitId = localStorage.getItem('auth_user_id')
    if (explicitId) return explicitId
    const token = localStorage.getItem('auth_token')
    if (!token) return 'anonymous'
    const payload = token.split('.')[1]
    if (payload) {
      try {
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
        const claims = JSON.parse(atob(padded)) as { sub?: unknown }
        if (typeof claims.sub === 'string' && claims.sub) return claims.sub
      } catch {
        return tokenNamespace(token)
      }
    }
    return tokenNamespace(token)
  } catch {
    return 'anonymous'
  }
}

const userConfigKey = () => `proxypay.feature-flags.config.${encodeURIComponent(userId())}`
const userValuesKey = () => `proxypay.feature-flags.user.${encodeURIComponent(userId())}`
const sessionValuesKey = 'proxypay.feature-flags.session'

const readObject = (storage: Storage, key: string): Record<string, unknown> => {
  try {
    const value: unknown = JSON.parse(storage.getItem(key) || '{}')
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

const writeObject = (storage: Storage, key: string, value: Record<string, unknown>) => {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    return
  }
}

const readFlags = (): FeatureFlag[] => {
  const config = typeof localStorage === 'undefined' ? {} : readObject(localStorage, userConfigKey())
  const userValues = typeof localStorage === 'undefined' ? {} : readObject(localStorage, userValuesKey())
  const sessionValues = typeof sessionStorage === 'undefined' ? {} : readObject(sessionStorage, sessionValuesKey)

  return definitions.map((definition) => {
    const saved = config[definition.key] as { scope?: FlagScope; defaultEnabled?: boolean } | undefined
    const scope: FlagScope = saved?.scope === 'session' ? 'session' : 'user'
    const defaultEnabled = typeof saved?.defaultEnabled === 'boolean'
      ? saved.defaultEnabled
      : definition.defaultEnabled
    const scopedValue = scope === 'session' ? sessionValues[definition.key] : userValues[definition.key]
    return {
      ...definition,
      scope,
      defaultEnabled,
      enabled: typeof scopedValue === 'boolean' ? scopedValue : defaultEnabled,
    }
  })
}

const persistFlags = (flags: FeatureFlag[]) => {
  const config = Object.fromEntries(flags.map((flag) => [flag.key, {
    scope: flag.scope,
    defaultEnabled: flag.defaultEnabled,
  }]))
  writeObject(localStorage, userConfigKey(), config)
}

const trackFlagChange = (flag: FeatureFlag, event: 'evaluated' | 'toggled') => {
  if (typeof window === 'undefined') return
  const detail = {
    key: flag.key,
    enabled: flag.enabled,
    scope: flag.scope,
    event,
    recordedAt: new Date().toISOString(),
  }
  window.dispatchEvent(new CustomEvent('proxypay:feature-flag', { detail }))
  window.DD_RUM?.addAction?.(`proxypay.feature_flag.${event}`, detail)
}

export const useFeatureFlagStore = create<FeatureFlagStore>((set, get) => ({
  flags: readFlags(),
  initialize: () => set({ flags: readFlags() }),
  isEnabled: (key) => {
    const flag = get().flags.find((candidate) => candidate.key === key)
    return flag?.enabled ?? false
  },
  setEnabled: (key, enabled) => {
    const flags = get().flags.map((flag) => flag.key === key ? { ...flag, enabled } : flag)
    const flag = flags.find((candidate) => candidate.key === key)
    if (!flag) return
    const storage = flag.scope === 'session' ? sessionStorage : localStorage
    const keyName = flag.scope === 'session' ? sessionValuesKey : userValuesKey()
    const values = readObject(storage, keyName)
    writeObject(storage, keyName, { ...values, [key]: enabled })
    set({ flags })
    trackFlagChange(flag, 'toggled')
  },
  setScope: (key, scope) => {
    const currentFlag = get().flags.find((flag) => flag.key === key)
    if (!currentFlag) return
    const flags = get().flags.map((flag) => flag.key === key ? { ...flag, scope } : flag)
    persistFlags(flags)
    const storage = scope === 'session' ? sessionStorage : localStorage
    const keyName = scope === 'session' ? sessionValuesKey : userValuesKey()
    const values = readObject(storage, keyName)
    writeObject(storage, keyName, { ...values, [key]: currentFlag.enabled })
    set({ flags: readFlags() })
  },
}))

export const trackFeatureFlagEvaluation = (key: string) => {
  const flag = useFeatureFlagStore.getState().flags.find((candidate) => candidate.key === key)
  if (flag) trackFlagChange(flag, 'evaluated')
}