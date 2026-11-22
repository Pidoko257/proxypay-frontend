import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useNotificationUpdateState,
  useMultipleNotificationUpdateStates,
  useNotificationSettingUpdater,
} from '../useNotificationUpdateState'
import { useNotificationStore } from '../../stores/notificationStore'

describe('useNotificationUpdateState', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      settings: [
        {
          eventType: 'payment.settled',
          emailEnabled: true,
          webhookEnabled: false,
        },
        {
          eventType: 'payment.failed',
          emailEnabled: false,
          webhookEnabled: true,
        },
      ],
      error: null,
      optimisticUpdates: new Map(),
      pendingRequests: new Map(),
      updateQueues: new Map(),
    })
  })

  describe('useNotificationUpdateState', () => {
    it('returns canUpdate=true when no updates are in progress', () => {
      const { result } = renderHook(() =>
        useNotificationUpdateState('payment.settled')
      )

      expect(result.current.canUpdate).toBe(true)
      expect(result.current.isUpdating).toBe(false)
      expect(result.current.isOptimistic).toBe(false)
      expect(result.current.queuedUpdatesCount).toBe(0)
    })

    it('detects optimistic updates', () => {
      useNotificationStore.setState((state) => ({
        optimisticUpdates: new Map([
          ['payment.settled', { eventType: 'payment.settled', emailEnabled: false, webhookEnabled: true }],
        ]),
      }))

      const { result } = renderHook(() =>
        useNotificationUpdateState('payment.settled')
      )

      expect(result.current.isOptimistic).toBe(true)
    })

    it('detects pending requests', () => {
      useNotificationStore.setState((state) => ({
        pendingRequests: new Map([
          ['payment.settled', { version: 1, updateId: 'test-1', timestamp: Date.now() }],
        ]),
      }))

      const { result } = renderHook(() =>
        useNotificationUpdateState('payment.settled')
      )

      expect(result.current.isUpdating).toBe(true)
      expect(result.current.canUpdate).toBe(false)
    })

    it('detects queued updates', () => {
      useNotificationStore.setState((state) => ({
        updateQueues: new Map([
          [
            'payment.settled',
            {
              inProgress: false,
              queue: [
                {
                  emailEnabled: false,
                  webhookEnabled: true,
                  resolve: () => {},
                  reject: () => {},
                },
              ],
            },
          ],
        ]),
      }))

      const { result } = renderHook(() =>
        useNotificationUpdateState('payment.settled')
      )

      expect(result.current.isUpdating).toBe(true)
      expect(result.current.canUpdate).toBe(false)
      expect(result.current.queuedUpdatesCount).toBe(1)
    })

    it('distinguishes between different event types', () => {
      useNotificationStore.setState((state) => ({
        pendingRequests: new Map([
          ['payment.settled', { version: 1, updateId: 'test-1', timestamp: Date.now() }],
        ]),
      }))

      const settledHook = renderHook(() =>
        useNotificationUpdateState('payment.settled')
      )
      const failedHook = renderHook(() =>
        useNotificationUpdateState('payment.failed')
      )

      expect(settledHook.result.current.isUpdating).toBe(true)
      expect(failedHook.result.current.isUpdating).toBe(false)
    })
  })

  describe('useMultipleNotificationUpdateStates', () => {
    it('returns states for all requested event types', () => {
      useNotificationStore.setState((state) => ({
        optimisticUpdates: new Map([
          ['payment.settled', { eventType: 'payment.settled', emailEnabled: false, webhookEnabled: true }],
        ]),
      }))

      const { result } = renderHook(() =>
        useMultipleNotificationUpdateStates(['payment.settled', 'payment.failed'])
      )

      expect(result.current).toHaveLength(2)
      expect(result.current[0].isOptimistic).toBe(true)
      expect(result.current[1].isOptimistic).toBe(false)
    })
  })

  describe('useNotificationSettingUpdater', () => {
    it('provides callbacks for updating settings', () => {
      const mockUpdateSetting = vi.fn().mockResolvedValue(undefined)
      useNotificationStore.setState((state) => ({
        updateSetting: mockUpdateSetting,
      }))

      const { result } = renderHook(() =>
        useNotificationSettingUpdater('payment.settled')
      )

      expect(result.current).toHaveProperty('updateEmailSetting')
      expect(result.current).toHaveProperty('updateWebhookSetting')
      expect(result.current).toHaveProperty('updateBothSettings')
      expect(result.current).toHaveProperty('updateState')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('clearError')
    })

    it('clears error via clearError callback', () => {
      useNotificationStore.setState((state) => ({
        error: 'Some error',
      }))

      const { result } = renderHook(() =>
        useNotificationSettingUpdater('payment.settled')
      )

      expect(result.current.error).toBe('Some error')
      result.current.clearError()
      expect(useNotificationStore.getState().error).toBeNull()
    })
  })
})
