import { create } from 'zustand'
import { NotificationSettings, proxyPayAPI } from '../services/api'

interface NotificationStore {
  settings: NotificationSettings[]
  loading: boolean
  error: string | null
  optimisticUpdates: Map<string, NotificationSettings>

  // Actions
  fetchSettings: () => Promise<void>
  updateSetting: (
    eventType: string,
    emailEnabled: boolean,
    webhookEnabled: boolean
  ) => Promise<void>
  clearError: () => void
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  settings: [],
  loading: false,
  error: null,
  optimisticUpdates: new Map(),

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

  clearError: () => {
    set({ error: null })
  },
}))
