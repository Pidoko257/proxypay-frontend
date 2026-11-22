import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getNotificationSettings: vi.fn(),
  updateNotificationSetting: vi.fn(),
  markNotificationsRead: vi.fn(),
  getNotifications: vi.fn(),
  fetchNotifications: vi.fn(),
}))

vi.mock('../../services/api', () => ({ proxyPayAPI: api }))

import { useNotificationStore } from '../notificationStore'

const originalSetting = {
  eventType: 'payment.settled',
  emailEnabled: true,
  webhookEnabled: false,
}

const anotherSetting = {
  eventType: 'payment.failed',
  emailEnabled: false,
  webhookEnabled: true,
}

describe('notificationStore', () => {
  beforeEach(() => {
    api.getNotificationSettings.mockReset()
    api.updateNotificationSetting.mockReset()
    api.markNotificationsRead.mockReset()
    api.getNotifications.mockReset()
    useNotificationStore.setState({
      settings: [],
      loading: false,
      error: null,
      optimisticUpdates: new Map(),
      notifications: [],
      notificationsLoading: false,
      bulkReadInProgress: new Set(),
      pastChanges: [],
      futureChanges: [],
    })
  })

  // ============= Optimistic Update Tests =============

  describe('Optimistic updates and rollback', () => {
    it('applies optimistic update immediately', async () => {
      useNotificationStore.setState({ settings: [originalSetting] })

      api.updateNotificationSetting.mockResolvedValue({
        eventType: 'payment.settled',
        emailEnabled: false,
        webhookEnabled: true,
      })

      const updatePromise = useNotificationStore
        .getState()
        .updateSetting('payment.settled', false, true)

      // Optimistic update should be visible immediately
      const state = useNotificationStore.getState()
      expect(state.settings[0]).toMatchObject({
        emailEnabled: false,
        webhookEnabled: true,
      })
      expect(state.optimisticUpdates.has('payment.settled')).toBe(true)

      await updatePromise

      // After confirmation, optimistic marker should be cleared
      expect(useNotificationStore.getState().optimisticUpdates.has('payment.settled')).toBe(false)
    })

    it('rolls back optimistic update on API failure', async () => {
      useNotificationStore.setState({ settings: [originalSetting] })

      api.updateNotificationSetting.mockRejectedValue(new Error('Network error'))

      await useNotificationStore.getState().updateSetting('payment.settled', false, true)

      // Should rollback to original state
      expect(useNotificationStore.getState().settings[0]).toEqual(originalSetting)
      expect(useNotificationStore.getState().optimisticUpdates.has('payment.settled')).toBe(false)
      expect(useNotificationStore.getState().error).toBe('Network error')
    })
  })

  // ============= Queue Management Tests =============

  describe('Update queue management', () => {
    it('processes queued updates after earlier update completes', async () => {
      useNotificationStore.setState({ settings: [originalSetting] })

      const calls: any[] = []

      api.updateNotificationSetting.mockImplementation((eventType, email, webhook) => {
        calls.push({ eventType, email, webhook })
        return Promise.resolve({
          eventType,
          emailEnabled: email,
          webhookEnabled: webhook,
        })
      })

      // Queue three updates in rapid succession
      const u1 = useNotificationStore.getState().updateSetting('payment.settled', false, false)
      const u2 = useNotificationStore.getState().updateSetting('payment.settled', true, false)
      const u3 = useNotificationStore.getState().updateSetting('payment.settled', false, true)

      await Promise.all([u1, u2, u3])

      // All three should have been called in order
      expect(calls.length).toBe(3)
      expect(calls[0]).toMatchObject({ email: false, webhook: false })
      expect(calls[1]).toMatchObject({ email: true, webhook: false })
      expect(calls[2]).toMatchObject({ email: false, webhook: true })
    })

    it('handles failures in queue without blocking subsequent updates', async () => {
      useNotificationStore.setState({ settings: [originalSetting] })

      api.updateNotificationSetting
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce({
          eventType: 'payment.settled',
          emailEnabled: true,
          webhookEnabled: true,
        })

      const u1 = useNotificationStore.getState().updateSetting('payment.settled', false, false)
      const u2 = useNotificationStore.getState().updateSetting('payment.settled', true, true)

      await Promise.all([u1, u2])

      // Second update should have succeeded despite first failure
      expect(useNotificationStore.getState().settings[0]).toMatchObject({
        emailEnabled: true,
        webhookEnabled: true,
      })
      expect(api.updateNotificationSetting).toHaveBeenCalledTimes(2)
    })
  })

  // ============= Basic Functionality Tests =============

  describe('Basic functionality', () => {
    it('loads settings and clears the loading state', async () => {
      api.getNotificationSettings.mockResolvedValue({ settings: [originalSetting] })

      await useNotificationStore.getState().fetchSettings()

      expect(useNotificationStore.getState().settings).toEqual([originalSetting])
      expect(useNotificationStore.getState().loading).toBe(false)
    })

    it('clears error state', () => {
      useNotificationStore.setState({ error: 'Some error' })
      useNotificationStore.getState().clearError()
      expect(useNotificationStore.getState().error).toBeNull()
    })

    it('handles multiple concurrent notifications without blocking', async () => {
      useNotificationStore.setState({
        settings: [originalSetting, anotherSetting],
      })

      api.updateNotificationSetting.mockResolvedValue({
        eventType: 'payment.settled',
        emailEnabled: true,
        webhookEnabled: true,
      })

      const settledUpdate1 = useNotificationStore
        .getState()
        .updateSetting('payment.settled', true, true)
      const failedUpdate = useNotificationStore
        .getState()
        .updateSetting('payment.failed', true, true)
      const settledUpdate2 = useNotificationStore
        .getState()
        .updateSetting('payment.settled', false, true)

      await Promise.all([settledUpdate1, failedUpdate, settledUpdate2])

      // Should have processed all updates
      expect(api.updateNotificationSetting).toHaveBeenCalledTimes(3)
    })
  })
})

// Bulk read tests
describe('notificationStore - Bulk read operations', () => {
  const mockNotifications = [
    { id: 'n1', title: 'Export Ready', message: 'Your export is ready', createdAt: '2024-01-01T00:00:00Z', read: false },
    { id: 'n2', title: 'Payment Settled', message: 'Payment has settled', createdAt: '2024-01-01T01:00:00Z', read: false },
    { id: 'n3', title: 'System Alert', message: 'System maintenance scheduled', createdAt: '2024-01-01T02:00:00Z', read: true },
  ]

  beforeEach(() => {
    api.markNotificationsRead.mockReset()
    useNotificationStore.setState({
      settings: [],
      loading: false,
      error: null,
      optimisticUpdates: new Map(),
      notifications: JSON.parse(JSON.stringify(mockNotifications)),
      notificationsLoading: false,
      bulkReadInProgress: new Set(),
    })
  })

  it('applies optimistic update immediately for bulk read', async () => {
    const idsToRead = ['n1', 'n2']
    let resolveUpdate!: (value: typeof mockNotifications) => void
    api.markNotificationsRead.mockImplementation(() => new Promise((resolve) => {
      resolveUpdate = resolve
    }))

    const bulkReadPromise = useNotificationStore.getState().bulkMarkRead(idsToRead)

    // Verify optimistic update: all specified notifications marked as read
    const state = useNotificationStore.getState()
    expect(state.notifications.find(n => n.id === 'n1')?.read).toBe(true)
    expect(state.notifications.find(n => n.id === 'n2')?.read).toBe(true)
    expect(state.notifications.find(n => n.id === 'n3')?.read).toBe(true) // unchanged

    // Verify tracking of in-flight operations
    expect(state.bulkReadInProgress.has('n1')).toBe(true)
    expect(state.bulkReadInProgress.has('n2')).toBe(true)
    expect(state.error).toBeNull()

    // Resolve with server confirmation
    const updatedNotifications = mockNotifications.map(n =>
      idsToRead.includes(n.id) ? { ...n, read: true } : n
    )
    resolveUpdate(updatedNotifications)
    await bulkReadPromise

    // Verify final state: in-flight tracking cleared, notifications confirmed
    const finalState = useNotificationStore.getState()
    expect(finalState.bulkReadInProgress.size).toBe(0)
    expect(finalState.notifications).toEqual(updatedNotifications)
    expect(finalState.error).toBeNull()
  })

  it('atomically updates all notifications or none on success', async () => {
    const idsToRead = ['n1', 'n2']
    const updatedNotifications = mockNotifications.map(n =>
      idsToRead.includes(n.id) ? { ...n, read: true } : n
    )
    api.markNotificationsRead.mockResolvedValue(updatedNotifications)

    await useNotificationStore.getState().bulkMarkRead(idsToRead)

    const state = useNotificationStore.getState()
    // Verify atomic update: no partial states
    expect(state.notifications.every(n => {
      if (idsToRead.includes(n.id)) return n.read === true
      return n.read === mockNotifications.find(m => m.id === n.id)?.read
    })).toBe(true)
    expect(state.error).toBeNull()
  })

  it('fully rolls back on persistence failure', async () => {
    const idsToRead = ['n1', 'n2']
    api.markNotificationsRead.mockRejectedValue(new Error('Server error'))

    await useNotificationStore.getState().bulkMarkRead(idsToRead)

    const state = useNotificationStore.getState()
    // Verify complete rollback: state restored to previous
    expect(state.notifications).toEqual(mockNotifications)
    expect(state.bulkReadInProgress.size).toBe(0)
    expect(state.error).toContain('Failed to mark notifications as read')
  })

  it('preserves individual notification history during bulk operations', async () => {
    const idsToRead = ['n1', 'n2']
    const updatedNotifications = mockNotifications.map(n =>
      idsToRead.includes(n.id) ? { ...n, read: true } : n
    )
    api.markNotificationsRead.mockResolvedValue(updatedNotifications)

    await useNotificationStore.getState().bulkMarkRead(idsToRead)

    const state = useNotificationStore.getState()
    // Verify notification fields preserved: title, message, createdAt unchanged
    state.notifications.forEach((notification, idx) => {
      const original = mockNotifications[idx]
      expect(notification.id).toBe(original.id)
      expect(notification.title).toBe(original.title)
      expect(notification.message).toBe(original.message)
      expect(notification.createdAt).toBe(original.createdAt)
    })
  })

  it('handles empty ID list gracefully', async () => {
    api.markNotificationsRead.mockResolvedValue(mockNotifications)
    
    await useNotificationStore.getState().bulkMarkRead([])

    expect(api.markNotificationsRead).not.toHaveBeenCalled()
    expect(useNotificationStore.getState().notifications).toEqual(mockNotifications)
  })

  it('maintains isolation between concurrent bulk operations', async () => {
    const idsToRead1 = ['n1']
    const idsToRead2 = ['n2']
    let resolve1!: (value: typeof mockNotifications) => void
    let resolve2!: (value: typeof mockNotifications) => void
    let callCount = 0

    api.markNotificationsRead.mockImplementation(() => new Promise((resolve) => {
      callCount++
      if (callCount === 1) resolve1 = resolve
      else resolve2 = resolve
    }))

    // Start first operation
    const promise1 = useNotificationStore.getState().bulkMarkRead(idsToRead1)
    
    let state = useNotificationStore.getState()
    expect(state.bulkReadInProgress.has('n1')).toBe(true)
    expect(state.bulkReadInProgress.has('n2')).toBe(false)

    // Start second operation while first is pending
    const promise2 = useNotificationStore.getState().bulkMarkRead(idsToRead2)

    state = useNotificationStore.getState()
    expect(state.bulkReadInProgress.has('n1')).toBe(true)
    expect(state.bulkReadInProgress.has('n2')).toBe(true)

    // Resolve first operation
    const updated1 = mockNotifications.map(n =>
      n.id === 'n1' ? { ...n, read: true } : n
    )
    resolve1(updated1)
    await promise1

    state = useNotificationStore.getState()
    expect(state.bulkReadInProgress.has('n1')).toBe(false)
    // Note: n2 may also be cleared if the second operation resolved or is still pending

    // Resolve second operation
    const updated2 = mockNotifications.map(n =>
      (n.id === 'n1' || n.id === 'n2') ? { ...n, read: true } : n
    )
    resolve2(updated2)
    await promise2

    state = useNotificationStore.getState()
    expect(state.bulkReadInProgress.size).toBe(0)
  })

  it('tracks in-flight IDs and clears them on completion', async () => {
    const idsToRead = ['n1', 'n2']
    const updatedNotifications = mockNotifications.map(n =>
      idsToRead.includes(n.id) ? { ...n, read: true } : n
    )
    api.markNotificationsRead.mockResolvedValue(updatedNotifications)

    await useNotificationStore.getState().bulkMarkRead(idsToRead)

    const state = useNotificationStore.getState()
    expect(state.bulkReadInProgress.size).toBe(0)
    idsToRead.forEach(id => {
      expect(state.bulkReadInProgress.has(id)).toBe(false)
    })
  })

  it('clears error state when bulk read succeeds after previous error', async () => {
    useNotificationStore.setState({ error: 'Previous error' })
    
    const idsToRead = ['n1']
    const updatedNotifications = mockNotifications.map(n =>
      n.id === 'n1' ? { ...n, read: true } : n
    )
    api.markNotificationsRead.mockResolvedValue(updatedNotifications)

    await useNotificationStore.getState().bulkMarkRead(idsToRead)

    const state = useNotificationStore.getState()
    expect(state.error).toBeNull()
  })

  it('provides descriptive error messages on bulk operation failure', async () => {
    const idsToRead = ['n1', 'n2']
    const errorMessage = 'Network timeout'
    api.markNotificationsRead.mockRejectedValue(new Error(errorMessage))

    await useNotificationStore.getState().bulkMarkRead(idsToRead)

    const state = useNotificationStore.getState()
    expect(state.error).toContain('Failed to mark notifications as read')
    expect(state.error).toContain(errorMessage)
  })

  it('handles unknown errors gracefully in bulk operations', async () => {
    const idsToRead = ['n1']
    api.markNotificationsRead.mockRejectedValue('Unknown error')

    await useNotificationStore.getState().bulkMarkRead(idsToRead)

    const state = useNotificationStore.getState()
    expect(state.error).toBe('Failed to mark notifications as read')
    expect(state.notifications).toEqual(mockNotifications)
  })
})
