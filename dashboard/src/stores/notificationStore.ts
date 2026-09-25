import { create } from 'zustand'
import { NotificationSettings, proxyPayAPI } from '../services/api'

export interface NotificationChange {
  eventType: string
  previous: NotificationSettings
  next: NotificationSettings
}

interface NotificationStore {
  settings: NotificationSettings[]
  loading: boolean
  error: string | null
  optimisticUpdates: Map<string, NotificationSettings>
  pastChanges: NotificationChange[]
  futureChanges: NotificationChange[]

  // Actions
  fetchSettings: () => Promise<void>
  updateSetting: (
    eventType: string,
    emailEnabled: boolean,
    webhookEnabled: boolean
  ) => Promise<void>
  undo: () => Promise<void>
  redo: () => Promise<void>
  clearError: () => void
}

const MAX_HISTORY_SIZE = 20

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  settings: [],
  loading: false,
  error: null,
  optimisticUpdates: new Map(),
  pastChanges: [],
  futureChanges: [],

  fetchSettings: async () => {
    set({ loading: true, error: null })
    try {
      const config = await proxyPayAPI.getNotificationSettings()
      set({ settings: config.settings, loading: false })
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch notification settings',
        loading: false,
      })
    }
  },

  updateSetting: async (
    eventType: string,
    emailEnabled: boolean,
    webhookEnabled: boolean
  ) => {
    const state = get()
    const optimisticUpdates = new Map(state.optimisticUpdates)

    // Store current state for rollback
    const previousSetting = state.settings.find((s) => s.eventType === eventType)

    // Optimistic update
    const optimisticSetting: NotificationSettings = {
      eventType,
      emailEnabled,
      webhookEnabled,
    }
    optimisticUpdates.set(eventType, optimisticSetting)

    set((state) => ({
      settings: state.settings.map((s) =>
        s.eventType === eventType ? optimisticSetting : s
      ),
      optimisticUpdates,
    }))

    try {
      // Attempt API call
      const updated = await proxyPayAPI.updateNotificationSetting(
        eventType,
        emailEnabled,
        webhookEnabled
      )

      optimisticUpdates.delete(eventType)

      set((state) => ({
        settings: state.settings.map((s) =>
          s.eventType === eventType ? updated : s
        ),
        optimisticUpdates,
        pastChanges: previousSetting
          ? [
              ...state.pastChanges,
              {
                eventType,
                previous: previousSetting,
                next: updated,
              },
            ].slice(-MAX_HISTORY_SIZE)
          : state.pastChanges,
        futureChanges: [],
      }))
    } catch (error) {
      // Rollback on failure
      optimisticUpdates.delete(eventType)

      set((state) => ({
        settings: previousSetting
          ? state.settings.map((s) =>
              s.eventType === eventType ? previousSetting : s
            )
          : state.settings,
        optimisticUpdates,
        error:
          error instanceof Error ? error.message : 'Failed to update setting',
      }))
    }
  },

  undo: async () => {
    const { pastChanges } = get()
    const change = pastChanges[pastChanges.length - 1]
    if (!change) return

    try {
      const restored = await proxyPayAPI.updateNotificationSetting(
        change.eventType,
        change.previous.emailEnabled,
        change.previous.webhookEnabled
      )
      set((state) => ({
        settings: state.settings.map((setting) =>
          setting.eventType === change.eventType ? restored : setting
        ),
        pastChanges: state.pastChanges.slice(0, -1),
        futureChanges: [...state.futureChanges, { ...change, next: restored }],
        error: null,
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to undo setting change',
      })
    }
  },

  redo: async () => {
    const { futureChanges } = get()
    const change = futureChanges[futureChanges.length - 1]
    if (!change) return

    try {
      const reapplied = await proxyPayAPI.updateNotificationSetting(
        change.eventType,
        change.next.emailEnabled,
        change.next.webhookEnabled
      )
      set((state) => ({
        settings: state.settings.map((setting) =>
          setting.eventType === change.eventType ? reapplied : setting
        ),
        pastChanges: [...state.pastChanges, { ...change, next: reapplied }].slice(
          -MAX_HISTORY_SIZE
        ),
        futureChanges: state.futureChanges.slice(0, -1),
        error: null,
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to redo setting change',
      })
    }
  },

  clearError: () => {
    set({ error: null })
  },
}))
