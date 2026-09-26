import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getNotificationSettings: vi.fn(),
  updateNotificationSetting: vi.fn(),
}))

vi.mock('../../services/api', () => ({ proxyPayAPI: api }))

import { useNotificationStore } from '../notificationStore'

const originalSetting = {
  eventType: 'payment.settled',
  emailEnabled: true,
  webhookEnabled: false,
}

describe('notificationStore', () => {
  beforeEach(() => {
    api.getNotificationSettings.mockReset()
    api.updateNotificationSetting.mockReset()
    useNotificationStore.setState({
      settings: [],
      loading: false,
      error: null,
      optimisticUpdates: new Map(),
    })
  })

  it('loads settings and clears the loading state', async () => {
    api.getNotificationSettings.mockResolvedValue({ settings: [originalSetting] })

    await useNotificationStore.getState().fetchSettings()

    expect(useNotificationStore.getState().settings).toEqual([originalSetting])
    expect(useNotificationStore.getState().loading).toBe(false)
  })

  it('keeps the optimistic value until the server confirms the update', async () => {
    useNotificationStore.setState({ settings: [originalSetting] })
    let resolveUpdate!: (value: typeof originalSetting) => void
    api.updateNotificationSetting.mockImplementation(() => new Promise((resolve) => {
      resolveUpdate = resolve
    }))

    const update = useNotificationStore.getState().updateSetting('payment.settled', false, true)
    expect(useNotificationStore.getState().settings[0]).toMatchObject({ emailEnabled: false, webhookEnabled: true })
    expect(useNotificationStore.getState().optimisticUpdates.has('payment.settled')).toBe(true)

    resolveUpdate({ ...originalSetting, emailEnabled: false, webhookEnabled: true })
    await update
    expect(useNotificationStore.getState().optimisticUpdates.has('payment.settled')).toBe(false)
    expect(useNotificationStore.getState().error).toBeNull()
  })

  it('rolls back a failed update and exposes an error for recovery', async () => {
    useNotificationStore.setState({ settings: [originalSetting] })
    api.updateNotificationSetting.mockRejectedValue(new Error('Network unavailable'))

    await useNotificationStore.getState().updateSetting('payment.settled', false, true)

    expect(useNotificationStore.getState().settings[0]).toEqual(originalSetting)
    expect(useNotificationStore.getState().optimisticUpdates.has('payment.settled')).toBe(false)
    expect(useNotificationStore.getState().error).toBe('Network unavailable')
    useNotificationStore.getState().clearError()
    expect(useNotificationStore.getState().error).toBeNull()
  })
})