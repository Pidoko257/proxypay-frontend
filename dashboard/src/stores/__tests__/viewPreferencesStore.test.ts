import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  useViewPreferencesStore,
  ViewPreferences,
} from '../viewPreferencesStore'

describe('useViewPreferencesStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Clear all store instances
    useViewPreferencesStore.setState({
      preferences: {
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
      },
      isHydrated: false,
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('initialization', () => {
    it('should initialize with default preferences when localStorage is empty', () => {
      const state = useViewPreferencesStore.getState()
      expect(state.preferences).toEqual({
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
      })
    })

    it('should load preferences from localStorage on initialization', () => {
      const saved: ViewPreferences = {
        sortColumn: 'amount',
        sortDirection: 'desc',
        pageSize: 50,
        visibleColumns: {
          reference: true,
          amount: true,
          status: false,
          provider: true,
          timestamp: true,
          actions: true,
        },
      }
      localStorage.setItem('viewPrefs:v1', JSON.stringify(saved))

      // Create a new store instance (simulating app reload)
      const state = useViewPreferencesStore.getState()
      // Force re-hydration by calling hydrate
      useViewPreferencesStore.getState().hydrate()
      const newState = useViewPreferencesStore.getState()
      
      expect(newState.preferences).toEqual(saved)
    })
  })

  describe('setSortColumn', () => {
    it('should set a valid sort column', () => {
      useViewPreferencesStore.getState().setSortColumn('reference')
      expect(useViewPreferencesStore.getState().preferences.sortColumn).toBe(
        'reference'
      )
    })

    it('should set sort column to null', () => {
      useViewPreferencesStore.getState().setSortColumn('amount')
      useViewPreferencesStore.getState().setSortColumn(null)
      expect(useViewPreferencesStore.getState().preferences.sortColumn).toBeNull()
    })

    it('should reject invalid sort column and keep previous value', () => {
      useViewPreferencesStore.getState().setSortColumn('amount')
      useViewPreferencesStore.getState().setSortColumn('invalidColumn' as any)
      expect(useViewPreferencesStore.getState().preferences.sortColumn).toBe('amount')
    })

    it('should persist sort column to localStorage', () => {
      useViewPreferencesStore.getState().setSortColumn('status')
      const stored = JSON.parse(localStorage.getItem('viewPrefs:v1') || '{}')
      expect(stored.sortColumn).toBe('status')
    })
  })

  describe('setSortDirection', () => {
    it('should set sort direction to ascending', () => {
      useViewPreferencesStore.getState().setSortDirection('asc')
      expect(useViewPreferencesStore.getState().preferences.sortDirection).toBe(
        'asc'
      )
    })

    it('should set sort direction to descending', () => {
      useViewPreferencesStore.getState().setSortDirection('desc')
      expect(useViewPreferencesStore.getState().preferences.sortDirection).toBe(
        'desc'
      )
    })

    it('should reject invalid sort direction', () => {
      useViewPreferencesStore.getState().setSortDirection('desc')
      useViewPreferencesStore.getState().setSortDirection('invalid' as any)
      expect(useViewPreferencesStore.getState().preferences.sortDirection).toBe(
        'desc'
      )
    })

    it('should persist sort direction to localStorage', () => {
      useViewPreferencesStore.getState().setSortDirection('desc')
      const stored = JSON.parse(localStorage.getItem('viewPrefs:v1') || '{}')
      expect(stored.sortDirection).toBe('desc')
    })
  })

  describe('setPageSize', () => {
    it('should set a valid page size', () => {
      useViewPreferencesStore.getState().setPageSize(50)
      expect(useViewPreferencesStore.getState().preferences.pageSize).toBe(50)
    })

    it('should accept page sizes from 1 to 1000', () => {
      useViewPreferencesStore.getState().setPageSize(1)
      expect(useViewPreferencesStore.getState().preferences.pageSize).toBe(1)

      useViewPreferencesStore.getState().setPageSize(1000)
      expect(useViewPreferencesStore.getState().preferences.pageSize).toBe(1000)

      useViewPreferencesStore.getState().setPageSize(500)
      expect(useViewPreferencesStore.getState().preferences.pageSize).toBe(500)
    })

    it('should reject page size 0', () => {
      useViewPreferencesStore.getState().setPageSize(25)
      useViewPreferencesStore.getState().setPageSize(0)
      expect(useViewPreferencesStore.getState().preferences.pageSize).toBe(25)
    })

    it('should reject page size above 1000', () => {
      useViewPreferencesStore.getState().setPageSize(25)
      useViewPreferencesStore.getState().setPageSize(1001)
      expect(useViewPreferencesStore.getState().preferences.pageSize).toBe(25)
    })

    it('should reject non-integer page sizes', () => {
      useViewPreferencesStore.getState().setPageSize(25)
      useViewPreferencesStore.getState().setPageSize(25.5)
      expect(useViewPreferencesStore.getState().preferences.pageSize).toBe(25)
    })

    it('should persist page size to localStorage', () => {
      useViewPreferencesStore.getState().setPageSize(100)
      const stored = JSON.parse(localStorage.getItem('viewPrefs:v1') || '{}')
      expect(stored.pageSize).toBe(100)
    })
  })

  describe('toggleColumnVisibility', () => {
    it('should toggle a column visibility from true to false', () => {
      expect(useViewPreferencesStore.getState().preferences.visibleColumns.status).toBe(
        true
      )
      useViewPreferencesStore.getState().toggleColumnVisibility('status')
      expect(useViewPreferencesStore.getState().preferences.visibleColumns.status).toBe(
        false
      )
    })

    it('should toggle a column visibility from false to true', () => {
      useViewPreferencesStore.getState().toggleColumnVisibility('status')
      useViewPreferencesStore.getState().toggleColumnVisibility('status')
      expect(useViewPreferencesStore.getState().preferences.visibleColumns.status).toBe(
        true
      )
    })

    it('should persist column visibility changes to localStorage', () => {
      useViewPreferencesStore.getState().toggleColumnVisibility('amount')
      const stored = JSON.parse(localStorage.getItem('viewPrefs:v1') || '{}')
      expect(stored.visibleColumns.amount).toBe(false)
    })
  })

  describe('setColumnVisibility', () => {
    it('should set column visibility to true', () => {
      useViewPreferencesStore.getState().setColumnVisibility('provider', true)
      expect(useViewPreferencesStore.getState().preferences.visibleColumns.provider).toBe(
        true
      )
    })

    it('should set column visibility to false', () => {
      useViewPreferencesStore.getState().setColumnVisibility('reference', false)
      expect(useViewPreferencesStore.getState().preferences.visibleColumns.reference).toBe(
        false
      )
    })

    it('should persist column visibility to localStorage', () => {
      useViewPreferencesStore.getState().setColumnVisibility('timestamp', false)
      const stored = JSON.parse(localStorage.getItem('viewPrefs:v1') || '{}')
      expect(stored.visibleColumns.timestamp).toBe(false)
    })
  })

  describe('resetToDefaults', () => {
    it('should reset all preferences to defaults', () => {
      // Modify some preferences
      useViewPreferencesStore.getState().setSortColumn('amount')
      useViewPreferencesStore.getState().setSortDirection('desc')
      useViewPreferencesStore.getState().setPageSize(100)
      useViewPreferencesStore.getState().toggleColumnVisibility('status')

      // Reset
      useViewPreferencesStore.getState().resetToDefaults()

      const state = useViewPreferencesStore.getState()
      expect(state.preferences).toEqual({
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
      })
    })

    it('should clear localStorage of custom preferences', () => {
      useViewPreferencesStore.getState().setSortColumn('amount')
      useViewPreferencesStore.getState().resetToDefaults()

      const stored = JSON.parse(localStorage.getItem('viewPrefs:v1') || '{}')
      expect(stored.sortColumn).toBeNull()
    })
  })

  describe('hydrate', () => {
    it('should explicitly hydrate from localStorage', () => {
      const saved: ViewPreferences = {
        sortColumn: 'provider',
        sortDirection: 'asc',
        pageSize: 75,
        visibleColumns: {
          reference: true,
          amount: false,
          status: true,
          provider: true,
          timestamp: false,
          actions: true,
        },
      }
      localStorage.setItem('viewPrefs:v1', JSON.stringify(saved))

      useViewPreferencesStore.getState().hydrate()
      const state = useViewPreferencesStore.getState()

      expect(state.preferences).toEqual(saved)
      expect(state.isHydrated).toBe(true)
    })
  })

  describe('validation and corruption recovery', () => {
    it('should use defaults if localStorage contains invalid JSON', () => {
      localStorage.setItem('viewPrefs:v1', 'invalid json{')
      
      useViewPreferencesStore.getState().hydrate()
      const state = useViewPreferencesStore.getState()

      expect(state.preferences.sortColumn).toBeNull()
      expect(state.preferences.pageSize).toBe(25)
    })

    it('should use defaults if sortColumn is invalid', () => {
      const corrupted = {
        sortColumn: 'invalidColumn',
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
      localStorage.setItem('viewPrefs:v1', JSON.stringify(corrupted))

      useViewPreferencesStore.getState().hydrate()
      const state = useViewPreferencesStore.getState()

      expect(state.preferences.sortColumn).toBeNull()
    })

    it('should use defaults if sortDirection is invalid', () => {
      const corrupted = {
        sortColumn: 'amount',
        sortDirection: 'invalid',
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
      localStorage.setItem('viewPrefs:v1', JSON.stringify(corrupted))

      useViewPreferencesStore.getState().hydrate()
      const state = useViewPreferencesStore.getState()

      expect(state.preferences.sortDirection).toBe('asc')
    })

    it('should use defaults if pageSize is invalid', () => {
      const corrupted = {
        sortColumn: 'amount',
        sortDirection: 'asc',
        pageSize: 'not a number',
        visibleColumns: {
          reference: true,
          amount: true,
          status: true,
          provider: true,
          timestamp: true,
          actions: true,
        },
      }
      localStorage.setItem('viewPrefs:v1', JSON.stringify(corrupted))

      useViewPreferencesStore.getState().hydrate()
      const state = useViewPreferencesStore.getState()

      expect(state.preferences.pageSize).toBe(25)
    })

    it('should use defaults if visibleColumns is invalid', () => {
      const corrupted = {
        sortColumn: 'amount',
        sortDirection: 'asc',
        pageSize: 25,
        visibleColumns: 'not an object',
      }
      localStorage.setItem('viewPrefs:v1', JSON.stringify(corrupted))

      useViewPreferencesStore.getState().hydrate()
      const state = useViewPreferencesStore.getState()

      expect(state.preferences.visibleColumns.status).toBe(true)
    })

    it('should recover from partial corruption in visibleColumns', () => {
      const corrupted = {
        sortColumn: 'amount',
        sortDirection: 'asc',
        pageSize: 25,
        visibleColumns: {
          reference: true,
          amount: 'not a boolean', // Invalid
          status: true,
          provider: true,
          timestamp: true,
          actions: true,
        },
      }
      localStorage.setItem('viewPrefs:v1', JSON.stringify(corrupted))

      useViewPreferencesStore.getState().hydrate()
      const state = useViewPreferencesStore.getState()

      // If any column is invalid, all columns revert to defaults
      expect(state.preferences.visibleColumns).toEqual({
        reference: true,
        amount: true,
        status: true,
        provider: true,
        timestamp: true,
        actions: true,
      })
    })
  })

  describe('localStorage persistence failure', () => {
    it('should handle localStorage quota exceeded gracefully', () => {
      // Mock localStorage.setItem to throw
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      expect(() => {
        useViewPreferencesStore.getState().setSortColumn('amount')
      }).not.toThrow()

      setItemSpy.mockRestore()
    })

    it('should handle localStorage being unavailable in private mode', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage is not available')
      })

      expect(() => {
        useViewPreferencesStore.getState().setPageSize(50)
      }).not.toThrow()

      setItemSpy.mockRestore()
    })
  })

  describe('versioning', () => {
    it('should use versioned storage key to prevent conflicts', () => {
      useViewPreferencesStore.getState().setSortColumn('amount')
      
      const v1Key = 'viewPrefs:v1'
      const stored = localStorage.getItem(v1Key)
      
      expect(stored).toBeTruthy()
      expect(JSON.parse(stored!).sortColumn).toBe('amount')
    })
  })

  describe('multiple state updates', () => {
    it('should handle rapid consecutive updates correctly', () => {
      useViewPreferencesStore.getState().setSortColumn('amount')
      useViewPreferencesStore.getState().setSortDirection('desc')
      useViewPreferencesStore.getState().setPageSize(50)
      useViewPreferencesStore.getState().toggleColumnVisibility('status')

      const state = useViewPreferencesStore.getState()
      expect(state.preferences.sortColumn).toBe('amount')
      expect(state.preferences.sortDirection).toBe('desc')
      expect(state.preferences.pageSize).toBe(50)
      expect(state.preferences.visibleColumns.status).toBe(false)
    })

    it('should persist all updates to localStorage', () => {
      useViewPreferencesStore.getState().setSortColumn('amount')
      useViewPreferencesStore.getState().setSortDirection('desc')
      useViewPreferencesStore.getState().setPageSize(50)

      const stored = JSON.parse(localStorage.getItem('viewPrefs:v1') || '{}')
      expect(stored).toEqual({
        sortColumn: 'amount',
        sortDirection: 'desc',
        pageSize: 50,
        visibleColumns: {
          reference: true,
          amount: true,
          status: true,
          provider: true,
          timestamp: true,
          actions: true,
        },
      })
    })
  })
})
