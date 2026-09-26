import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockStore = vi.hoisted(() => ({
  settings: [] as Array<{ eventType: string; emailEnabled: boolean; webhookEnabled: boolean }>,
  loading: false,
  error: null as string | null,
  optimisticUpdates: new Map<string, unknown>(),
  fetchSettings: vi.fn(),
  updateSetting: vi.fn(),
  clearError: vi.fn(),
}))

vi.mock('../../stores/notificationStore', () => ({
  useNotificationStore: () => mockStore,
}))

import { NotificationSettings } from '../NotificationSettings'

const paymentSetting = {
  eventType: 'payment.settled',
  emailEnabled: true,
  webhookEnabled: false,
}

describe('NotificationSettings', () => {
  beforeEach(() => {
    mockStore.settings = [{ ...paymentSetting }]
    mockStore.loading = false
    mockStore.error = null
    mockStore.optimisticUpdates = new Map()
    mockStore.fetchSettings.mockClear()
    mockStore.updateSetting.mockClear()
    mockStore.clearError.mockImplementation(() => { mockStore.error = null })
  })

  it('renders notification settings with accessible toggle names', () => {
    render(<NotificationSettings />)

    expect(screen.getByRole('heading', { name: 'Notification Settings' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Email notifications for Payment Settled' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Webhook notifications for Payment Settled' })).not.toBeChecked()
    expect(mockStore.fetchSettings).toHaveBeenCalledOnce()
  })

  it('sends the changed channel values when toggled', () => {
    render(<NotificationSettings />)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Email notifications for Payment Settled' }))
    expect(mockStore.updateSetting).toHaveBeenCalledWith('payment.settled', false, false)
  })

  it('shows pending optimistic updates and disables their controls', () => {
    mockStore.optimisticUpdates = new Map([['payment.settled', paymentSetting]])
    render(<NotificationSettings />)

    expect(screen.getByText('Updating...')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Email notifications for Payment Settled' })).toBeDisabled()
  })

  it('shows errors and allows dismissal', () => {
    mockStore.error = 'Unable to save settings'
    const { rerender } = render(<NotificationSettings />)

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save settings')
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(mockStore.clearError).toHaveBeenCalledOnce()
    rerender(<NotificationSettings />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows loading skeletons and an empty state', () => {
    mockStore.loading = true
    mockStore.settings = []
    const { container, rerender } = render(<NotificationSettings />)
    expect(container.querySelector('.skeleton-settings-grid')).toBeInTheDocument()

    mockStore.loading = false
    rerender(<NotificationSettings />)
    expect(screen.getByText('No notification settings available')).toBeInTheDocument()
  })
})