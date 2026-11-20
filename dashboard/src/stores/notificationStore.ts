import { create } from 'zustand'
import {
  DashboardNotification,
  NotificationSettings,
  proxyPayAPI,
} from '../services/api'

export interface NotificationChange {
  eventType: string
  previous: NotificationSettings
  next: NotificationSettings
}

/**
 * Request version tracking per event type to detect and ignore stale responses.
 * When multiple updates are in flight for the same event type, only the latest
 * version is accepted. Earlier versions are discarded as they represent stale state.
 */
interface PendingRequest {
  version: number
  updateId: string
  timestamp: number
}

/**
 * Pending update state per event type to track concurrent requests.
 * Ensures only one update is processed at a time per event type.
 */
interface PendingUpdateState {
  inProgress: boolean
  queue: Array<{
    emailEnabled: boolean
    webhookEnabled: boolean
  }>
}

interface NotificationStore {
  settings: NotificationSettings[]
  loading: boolean
  error: string | null
  optimisticUpdates: Map<string, NotificationSettings>
  notifications: DashboardNotification[]
  notificationsLoading: boolean
  bulkReadInProgress: Set<string>
  pastChanges: NotificationChange[]
  futureChanges: NotificationChange[]

  // Request versioning and serialization state
  requestVersions: Map<string, number> // Track latest version per event type
  pendingRequests: Map<string, PendingRequest> // In-flight request tracking
  updateQueues: Map<string, PendingUpdateState> // Serialize updates per event type

  // Actions
  fetchSettings: () => Promise<void>
  updateSetting: (
    eventType: string,
    emailEnabled: boolean,
    webhookEnabled: boolean
  ) => Promise<void>
  clearError: () => void
  fetchNotifications: () => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  bulkMarkRead: (ids: string[]) => Promise<void>
  undo: () => Promise<void>
  redo: () => Promise<void>

  // Internal helpers
  _isUpdateStale: (eventType: string, version: number) => boolean
  _getNextVersion: (eventType: string) => number
}

const MAX_HISTORY_SIZE = 20

export const useNotificationStore = create<NotificationStore>((set, get) => {
  /**
   * Process the update queue for a specific event type.
   * Ensures updates are serialized: only one update in flight at a time.
   * This prevents race conditions where multiple concurrent requests compete for the same resource.
   */
  const processUpdateQueue = async (eventType: string) => {
    const state = get()
    const updateQueue = state.updateQueues.get(eventType)

    if (!updateQueue || updateQueue.queue.length === 0) {
      return
    }

    updateQueue.inProgress = true

    while (updateQueue.queue.length > 0) {
      const update = updateQueue.queue.shift()
      if (!update) break

      try {
        await performSingleUpdate(eventType, update.emailEnabled, update.webhookEnabled)
      } catch {
        // Error is already handled in performSingleUpdate
        // Continue processing queue even if one update fails
      }
    }

    updateQueue.inProgress = false
  }

  /**
   * Perform a single notification update with version tracking and optimistic UI.
   */
  const performSingleUpdate = async (
    eventType: string,
    emailEnabled: boolean,
    webhookEnabled: boolean
  ) => {
    const state = get()
    const version = state._getNextVersion(eventType)
    const updateId = `${eventType}-v${version}-${Date.now()}`
    const optimisticUpdates = new Map(state.optimisticUpdates)
    const settings = state.settings

    // Find the current setting for this event type
    const currentSetting = settings.find((s) => s.eventType === eventType)
    const previousSetting = currentSetting ? { ...currentSetting } : null

    // Track this pending request
    state.pendingRequests.set(eventType, {
      version,
      updateId,
      timestamp: Date.now(),
    })

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

      // Check if this response is stale (a newer version has been issued)
      if (state._isUpdateStale(eventType, version)) {
        // Discard this response; keep the optimistic state from the newer request
        state.pendingRequests.delete(eventType)
        return
      }

      // Response is current; reconcile with server state and record history
      optimisticUpdates.delete(eventType)
      state.pendingRequests.delete(eventType)

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
        error: null,
      }))
    } catch (error) {
      // On failure, rollback optimistic update
      optimisticUpdates.delete(eventType)
      state.pendingRequests.delete(eventType)

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

      throw error
    }
  }

  return {
    settings: [],
    loading: false,
    error: null,
    optimisticUpdates: new Map(),
    notifications: [],
    notificationsLoading: false,
    bulkReadInProgress: new Set(),
    pastChanges: [],
    futureChanges: [],
    requestVersions: new Map(),
    pendingRequests: new Map(),
    updateQueues: new Map(),

    _getNextVersion: (eventType: string) => {
      const state = get()
      const current = state.requestVersions.get(eventType) || 0
      const next = current + 1
      state.requestVersions.set(eventType, next)
      return next
    },

    _isUpdateStale: (eventType: string, version: number) => {
      const state = get()
      const latest = state.requestVersions.get(eventType) || 0
      return version < latest
    },

    fetchSettings: async () => {
      set({ loading: true, error: null })
      try {
        const config = await proxyPayAPI.getNotificationSettings()
        set({ settings: config.settings, loading: false })
        // Reset version tracking on fresh fetch
        set({ requestVersions: new Map() })
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

    /**
     * Updates a notification setting with serialization per event type.
     * - Maintains request versions to detect and ignore out-of-order responses
     * - Queues updates per event type to ensure serial processing
     * - Applies optimistic updates immediately for responsiveness
     * - Discards responses to stale requests (superseded by newer versions)
     */
    updateSetting: async (
      eventType: string,
      emailEnabled: boolean,
      webhookEnabled: boolean
    ) => {
      const state = get()

      // Get or create update queue for this event type
      let updateQueue = state.updateQueues.get(eventType)
      if (!updateQueue) {
        updateQueue = { inProgress: false, queue: [] }
        state.updateQueues.set(eventType, updateQueue)
      }

      const wasProcessing = updateQueue.inProgress

      // Queue the update
      updateQueue.queue.push({
        emailEnabled,
        webhookEnabled,
      })

      // If no update is in progress, start processing the queue
      if (!wasProcessing) {
        await processUpdateQueue(eventType)
      }
    },

    clearError: () => {
      set({ error: null })
    },

    fetchNotifications: async () => {
      set({ notificationsLoading: true })
      try {
        const notifications = await proxyPayAPI.getNotifications()
        set({ notifications, notificationsLoading: false })
      } catch (error) {
        set({
          notificationsLoading: false,
          error:
            error instanceof Error ? error.message : 'Failed to fetch notifications',
        })
      }
    },

    markNotificationRead: async (id: string) => {
      try {
        await proxyPayAPI.markNotificationRead(id)
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.id === id ? { ...notification, read: true } : notification
          ),
        }))
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : 'Failed to update notification',
        })
      }
    },

    bulkMarkRead: async (ids: string[]) => {
      if (ids.length === 0) return

      const state = get()

      // Store previous state for rollback
      const previousNotifications = state.notifications
      const bulkReadInProgress = new Set(state.bulkReadInProgress)
      ids.forEach((id) => bulkReadInProgress.add(id))

      // Optimistic update - mark all as read atomically
      const optimisticNotifications = previousNotifications.map((notification) =>
        ids.includes(notification.id) ? { ...notification, read: true } : notification
      )

      set({
        notifications: optimisticNotifications,
        bulkReadInProgress,
        error: null,
      })

      try {
        // Attempt API call - server returns updated notifications for atomic confirmation
        const updatedNotifications = await proxyPayAPI.markNotificationsRead(ids)

        bulkReadInProgress.forEach((id) => bulkReadInProgress.delete(id))

        set({
          notifications: updatedNotifications,
          bulkReadInProgress,
        })
      } catch (error) {
        // Rollback on failure - restore previous state atomically
        bulkReadInProgress.forEach((id) => bulkReadInProgress.delete(id))

        set({
          notifications: previousNotifications,
          bulkReadInProgress,
          error:
            error instanceof Error
              ? `Failed to mark notifications as read: ${error.message}`
              : 'Failed to mark notifications as read',
        })
      }
    },

    undo: async () => {
      // Placeholder for future undo functionality
    },

    redo: async () => {
      // Placeholder for future redo functionality
    },
  }
})
