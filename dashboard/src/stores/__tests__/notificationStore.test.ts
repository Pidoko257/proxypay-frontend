import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotificationStore } from '../notificationStore'
import { proxyPayAPI } from '../services/api'

// Mock the API
vi.mock('../services/api', () => ({
  proxyPayAPI: {
    getNotificationSettings: vi.fn(),
    updateNotificationSetting: vi.fn(),
  },
}))

describe('notificationStore race condition', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    // Reset store to initial state
    useNotificationStore.setState({
      settings: [],
      loading: false,
      error: null,
      optimisticUpdates: new Map(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('prevents stale response from overwriting newer state when two concurrent updateSetting calls race', async () => {
    const { result } = renderHook(() => useNotificationStore())

    // Setup initial settings
    const initialSettings = [
      { eventType: 'payment_received', emailEnabled: true, webhookEnabled: false },
      { eventType: 'payment_sent', emailEnabled: false, webhookEnabled: true },
    ]
    result.current.settings = initialSettings

    // Mock first API call to resolve slowly (simulates network delay)
    let firstResolve: (value: unknown) => void
    const firstPromise = new Promise((resolve) => {
      firstResolve = resolve
    })
    proxyPayAPI.updateNotificationSetting.mockImplementationOnce(() => firstPromise)

    // Mock second API call to resolve quickly
    const secondResponse = {
      eventType: 'payment_received',
      emailEnabled: false,
      webhookEnabled: true,
    }
    proxyPayAPI.updateNotificationSetting.mockResolvedValueOnce(secondResponse)

    // Fire first updateSetting call
    const firstUpdatePromise = act(async () => {
      await result.current.updateSetting('payment_received', true, false)
    })

    // Advance timers slightly to ensure first call is in progress
    await act(async () => {
      vi.advanceTimersByTime(10)
    })

    // Fire second updateSetting call (newer) before first resolves
    const secondUpdatePromise = act(async () => {
      await result.current.updateSetting('payment_received', false, true)
    })

    // Now resolve the first (slow) API call
    firstResolve({
      eventType: 'payment_received',
      emailEnabled: true,
      webhookEnabled: false,
    })

    // Wait for both promises to complete
    await Promise.all([firstUpdatePromise, secondUpdatePromise])
    await waitFor(() => expect(proxyPayAPI.updateNotificationSetting).toHaveBeenCalledTimes(2))

    // Verify the final state matches the SECOND call's response (the newer one)
    const finalSettings = result.current.settings
    const updatedSetting = finalSettings.find((s) => s.eventType === 'payment_received')

    // The second call's response should win, not the first (stale) one
    expect(updatedSetting).toEqual({
      eventType: 'payment_received',
      emailEnabled: false,
      webhookEnabled: true,
    })

    // Verify optimistic updates are cleared
    expect(result.current.optimisticUpdates.size).toBe(0)
  })

  it('handles rollback correctly when second call fails but first succeeds', async () => {
    const { result } = renderHook(() => useNotificationStore())

    const initialSettings = [
      { eventType: 'payment_received', emailEnabled: true, webhookEnabled: false },
    ]
    result.current.settings = initialSettings

    // First call succeeds quickly
    proxyPayAPI.updateNotificationSetting.mockResolvedValueOnce({
      eventType: 'payment_received',
      emailEnabled: false,
      webhookEnabled: false,
    })

    // Second call fails
    proxyPayAPI.updateNotificationSetting.mockRejectedValueOnce(new Error('Network error'))

    // Fire first update
    await act(async () => {
      await result.current.updateSetting('payment_received', false, false)
    })

    // Fire second update (should fail and rollback)
    await act(async () => {
      await result.current.updateSetting('payment_received', true, true)
    })

    // Final state should be rolled back to the first successful response
    const finalSettings = result.current.settings
    const updatedSetting = finalSettings.find((s) => s.eventType === 'payment_received')

    expect(updatedSetting).toEqual({
      eventType: 'payment_received',
      emailEnabled: false,
      webhookEnabled: false,
    })
    expect(result.current.error).toBe('Network error')
  })
})