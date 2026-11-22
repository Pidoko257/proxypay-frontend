import { create } from 'zustand'

/**
 * View preferences for the transactions table.
 * Non-sensitive settings that persist across page reloads.
 */
export interface ViewPreferences {
  sortColumn: string | null
  sortDirection: 'asc' | 'desc'
  pageSize: number
  visibleColumns: {
    reference: boolean
    amount: boolean
    status: boolean
    provider: boolean
    timestamp: boolean
    actions: boolean
  }
}

interface ViewPreferencesStore {
  preferences: ViewPreferences
  isHydrated: boolean
  
  // Actions
  setSortColumn: (column: string | null) => void
  setSortDirection: (direction: 'asc' | 'desc') => void
  setPageSize: (size: number) => void
  toggleColumnVisibility: (column: keyof ViewPreferences['visibleColumns']) => void
  setColumnVisibility: (column: keyof ViewPreferences['visibleColumns'], visible: boolean) => void
  resetToDefaults: () => void
  hydrate: () => void
}

// Default preferences
const defaultPreferences: ViewPreferences = {
  sortColumn: null,
  sortDirection: 'asc',
  pageSize: 25,
  visibleColumns: {
    reference: true,
    amount: true,
    status: true,
    provider: true,
    timestamp: true,
    actions: true,
  },
}

// Versioned storage key for migrations
const STORAGE_KEY = 'viewPrefs:v1'

// Validation schema
const isValidPageSize = (size: unknown): size is number =>
  typeof size === 'number' && size > 0 && size <= 1000 && Number.isInteger(size)

const isValidSortDirection = (dir: unknown): dir is 'asc' | 'desc' =>
  dir === 'asc' || dir === 'desc'

const isValidSortColumn = (col: unknown): col is string | null =>
  col === null ||
  (typeof col === 'string' &&
    ['reference', 'amount', 'status', 'provider', 'timestamp'].includes(col))

const isValidVisibleColumns = (
  cols: unknown
): cols is ViewPreferences['visibleColumns'] => {
  if (typeof cols !== 'object' || cols === null) return false
  const obj = cols as Record<string, unknown>
  return (
    typeof obj.reference === 'boolean' &&
    typeof obj.amount === 'boolean' &&
    typeof obj.status === 'boolean' &&
    typeof obj.provider === 'boolean' &&
    typeof obj.timestamp === 'boolean' &&
    typeof obj.actions === 'boolean'
  )
}

/**
 * Validate and normalize stored preferences.
 * Returns default preferences if stored data is invalid.
 */
const validatePreferences = (stored: unknown): ViewPreferences => {
  if (typeof stored !== 'object' || stored === null) {
    return defaultPreferences
  }

  const obj = stored as Record<string, unknown>

  const sortColumn = isValidSortColumn(obj.sortColumn)
    ? obj.sortColumn
    : defaultPreferences.sortColumn

  const sortDirection = isValidSortDirection(obj.sortDirection)
    ? obj.sortDirection
    : defaultPreferences.sortDirection

  const pageSize = isValidPageSize(obj.pageSize)
    ? obj.pageSize
    : defaultPreferences.pageSize

  const visibleColumns = isValidVisibleColumns(obj.visibleColumns)
    ? obj.visibleColumns
    : defaultPreferences.visibleColumns

  return {
    sortColumn,
    sortDirection,
    pageSize,
    visibleColumns,
  }
}

/**
 * Load preferences from localStorage with validation.
 */
const loadPreferences = (): ViewPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaultPreferences
    const parsed = JSON.parse(stored)
    return validatePreferences(parsed)
  } catch {
    // On parse error or any other issue, return defaults
    return defaultPreferences
  }
}

/**
 * Save preferences to localStorage.
 */
const savePreferences = (preferences: ViewPreferences): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch (error) {
    // Silently fail if localStorage is unavailable (quota exceeded, private mode, etc.)
    console.error('Failed to save view preferences to localStorage:', error)
  }
}

export const useViewPreferencesStore = create<ViewPreferencesStore>((set) => {
  // Initialize with defaults on store creation
  const initialPreferences = loadPreferences()

  return {
    preferences: initialPreferences,
    isHydrated: false,

    setSortColumn: (column: string | null) => {
      set((state) => {
        if (!isValidSortColumn(column)) {
          // Keep previous value if invalid
          return {}
        }
        const updated = {
          ...state.preferences,
          sortColumn: column,
        }
        savePreferences(updated)
        return { preferences: updated }
      })
    },

    setSortDirection: (direction: 'asc' | 'desc') => {
      set((state) => {
        if (!isValidSortDirection(direction)) {
          // Keep previous value if invalid
          return {}
        }
        const updated = {
          ...state.preferences,
          sortDirection: direction,
        }
        savePreferences(updated)
        return { preferences: updated }
      })
    },

    setPageSize: (size: number) => {
      set((state) => {
        if (!isValidPageSize(size)) {
          // Keep previous value if invalid
          return {}
        }
        const updated = {
          ...state.preferences,
          pageSize: size,
        }
        savePreferences(updated)
        return { preferences: updated }
      })
    },

    toggleColumnVisibility: (column: keyof ViewPreferences['visibleColumns']) => {
      set((state) => {
        const updated = {
          ...state.preferences,
          visibleColumns: {
            ...state.preferences.visibleColumns,
            [column]: !state.preferences.visibleColumns[column],
          },
        }
        savePreferences(updated)
        return { preferences: updated }
      })
    },

    setColumnVisibility: (
      column: keyof ViewPreferences['visibleColumns'],
      visible: boolean
    ) => {
      set((state) => {
        const updated = {
          ...state.preferences,
          visibleColumns: {
            ...state.preferences.visibleColumns,
            [column]: visible,
          },
        }
        savePreferences(updated)
        return { preferences: updated }
      })
    },

    resetToDefaults: () => {
      set(() => {
        savePreferences(defaultPreferences)
        return { preferences: defaultPreferences }
      })
    },

    hydrate: () => {
      // Explicitly hydrate store from localStorage
      // Useful after sign-in/sign-out or session changes
      set((state) => ({
        preferences: loadPreferences(),
        isHydrated: true,
      }))
    },
  }
})

export default useViewPreferencesStore
