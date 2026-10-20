import { useCallback, useMemo } from 'react'
import { useNotificationStore } from '../stores/notificationStore'

/**
 * Hook for managing disabled states and UI feedback during notification updates.
 * 
 * Features:
 * - Track which event types are currently updating
 * - Disable only conflicting controls during concurrent updates
 * - Provide feedback on pending requests via optimistic state markers
 * - Safe for concurrent updates to different event types
 * 
 * Usage:
 * ```tsx
 * const { isUpdating, isOptimistic, canUpdate } = useNotificationUpdateState('payment.settled')
 * 
 * <button 
 *   disabled={!canUpdate} 
 *   onClick={() => updateSetting(...)}
 * >
 *   {isUpdating ? 'Updating...' : 'Save'}
 * </button>
 * ```
 */
export interface NotificationUpdateState {
  /** True if this event type has an update in flight */
  isUpdating: boolean

  /** True if the UI is showing optimistic state (not yet confirmed by server) */
  isOptimistic: boolean

  /** True if safe to initiate a new update (no conflicting updates in progress) */
  canUpdate: boolean

  /** Number of updates queued for this event type */
  queuedUpdatesCount: number
}

/**
 * Returns the update state for a specific notification event type.
 * Enables precise control over which UI elements should be disabled.
 * 
 * @param eventType - The notification event type (e.g., 'payment.settled')
 * @returns Update state object with flags for UI control management
 */
export function useNotificationUpdateState(
  eventType: string
): NotificationUpdateState {
  const optimisticUpdates = useNotificationStore((state) => state.optimisticUpdates)
  const pendingRequests = useNotificationStore((state) => state.pendingRequests)
  const updateQueues = useNotificationStore((state) => state.updateQueues)

  return useMemo(() => {
    const isOptimistic = optimisticUpdates.has(eventType)
    const hasPendingRequest = pendingRequests.has(eventType)
    const updateQueue = updateQueues.get(eventType)
    const queuedUpdatesCount = updateQueue?.queue.length ?? 0
    const isQueued = queuedUpdatesCount > 0

    return {
      // An update is "in progress" if there's a pending request or queued updates
      isUpdating: hasPendingRequest || isQueued,

      // Optimistic state indicates we've sent an update but not received confirmation
      isOptimistic,

      // Can safely update if there are no pending requests or queued updates
      // (the next update will be serialized by the store)
      canUpdate: !hasPendingRequest && !isQueued,

      queuedUpdatesCount,
    }
  }, [eventType, optimisticUpdates, pendingRequests, updateQueues])
}

/**
 * Hook for managing multiple notification event types' update states.
 * Useful for form-like UIs that update multiple settings at once.
 * 
 * Usage:
 * ```tsx
 * const states = useMultipleNotificationUpdateStates(['payment.settled', 'payment.failed'])
 * const allUpdating = states.every(s => s.isUpdating)
 * ```
 */
export function useMultipleNotificationUpdateStates(
  eventTypes: string[]
): NotificationUpdateState[] {
  return eventTypes.map((eventType) => useNotificationUpdateState(eventType))
}

/**
 * Hook that returns callbacks for common update patterns.
 * Combines update state checks with the store's updateSetting method.
 * 
 * Usage:
 * ```tsx
 * const { updateEmailSetting, isUpdating, error } = useNotificationSettingUpdater('payment.settled')
 * 
 * <button 
 *   disabled={isUpdating} 
 *   onClick={() => updateEmailSetting(true)}
 * >
 *   Enable Email
 * </button>
 * ```
 */
export interface NotificationSettingUpdater {
  /** Update with only email setting changed */
  updateEmailSetting: (enabled: boolean) => Promise<void>

  /** Update with only webhook setting changed */
  updateWebhookSetting: (enabled: boolean) => Promise<void>

  /** Update both settings */
  updateBothSettings: (
    emailEnabled: boolean,
    webhookEnabled: boolean
  ) => Promise<void>

  /** Current update state */
  updateState: NotificationUpdateState

  /** Last error message, if any */
  error: string | null

  /** Clear the error message */
  clearError: () => void
}

export function useNotificationSettingUpdater(
  eventType: string
): NotificationSettingUpdater {
  const updateSetting = useNotificationStore((state) => state.updateSetting)
  const error = useNotificationStore((state) => state.error)
  const clearError = useNotificationStore((state) => state.clearError)
  const settings = useNotificationStore((state) => state.settings)
  const updateState = useNotificationUpdateState(eventType)

  const currentSetting = settings.find((s) => s.eventType === eventType)

  const updateEmailSetting = useCallback(
    async (enabled: boolean) => {
      if (!currentSetting) return
      await updateSetting(eventType, enabled, currentSetting.webhookEnabled)
    },
    [eventType, currentSetting, updateSetting]
  )

  const updateWebhookSetting = useCallback(
    async (enabled: boolean) => {
      if (!currentSetting) return
      await updateSetting(eventType, currentSetting.emailEnabled, enabled)
    },
    [eventType, currentSetting, updateSetting]
  )

  const updateBothSettings = useCallback(
    async (emailEnabled: boolean, webhookEnabled: boolean) => {
      await updateSetting(eventType, emailEnabled, webhookEnabled)
    },
    [eventType, updateSetting]
  )

  return {
    updateEmailSetting,
    updateWebhookSetting,
    updateBothSettings,
    updateState,
    error,
    clearError,
  }
}
