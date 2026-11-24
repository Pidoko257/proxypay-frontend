import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FeatureFlagSettings } from '../FeatureFlagSettings'
import { useFeatureFlagStore } from '../../stores/featureFlagStore'

describe('FeatureFlagSettings', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    useFeatureFlagStore.getState().initialize()
  })

  it('toggles a flag and displays the active flags in the debug panel', () => {
    render(<FeatureFlagSettings />)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Enable transaction-row-preview' }))

    expect(useFeatureFlagStore.getState().isEnabled('transaction-row-preview')).toBe(false)
    expect(screen.getByText('1 active')).toBeInTheDocument()
    expect(screen.queryByText('transaction-row-preview', { selector: 'li code' })).not.toBeInTheDocument()
  })

  it('persists flags to the selected session scope', () => {
    const store = useFeatureFlagStore.getState()
    store.setScope('transaction-row-preview', 'session')
    store.setEnabled('transaction-row-preview', false)

    expect(sessionStorage.getItem('proxypay.feature-flags.session')).toContain('transaction-row-preview')
    expect(useFeatureFlagStore.getState().flags.find((flag) => flag.key === 'transaction-row-preview')?.scope)
      .toBe('session')
    useFeatureFlagStore.getState().initialize()
    expect(useFeatureFlagStore.getState().isEnabled('transaction-row-preview')).toBe(false)
  })

  it('stores user flags under the authenticated user identity', () => {
    localStorage.setItem('auth_user_id', 'merchant-a')
    localStorage.setItem('auth_token', `header.${btoa(JSON.stringify({ sub: 'merchant-b' }))}.signature`)
    useFeatureFlagStore.getState().initialize()
    useFeatureFlagStore.getState().setEnabled('transaction-row-preview', false)

    expect(localStorage.getItem('proxypay.feature-flags.user.merchant-a'))
      .toContain('"transaction-row-preview":false')
  })

  it('keeps JWT subject overrides across token rotations', () => {
    const payload = btoa(JSON.stringify({ sub: 'merchant-b' }))
    const store = useFeatureFlagStore.getState()
    localStorage.setItem('auth_token', `header.${payload}.first`)
    store.initialize()
    store.setEnabled('transaction-row-preview', false)

    localStorage.setItem('auth_token', `header.${payload}.second`)
    store.initialize()
    expect(store.isEnabled('transaction-row-preview')).toBe(false)
  })

  it('keeps user overrides in memory when a token has no usable subject', () => {
    const store = useFeatureFlagStore.getState()
    store.setEnabled('transaction-row-preview', false)
    localStorage.setItem('auth_token', 'opaque-token')
    store.initialize()
    expect(store.isEnabled('transaction-row-preview')).toBe(true)

    store.setEnabled('transaction-row-preview', false)
    expect(store.isEnabled('transaction-row-preview')).toBe(false)
    store.initialize()
    expect(store.isEnabled('transaction-row-preview')).toBe(true)
    expect(Object.keys(localStorage).sort()).toEqual([
      'auth_token',
      'proxypay.feature-flags.user.anonymous',
    ])
  })

  it('emits analytics events when a flag is toggled', () => {
    const listener = vi.fn()
    window.addEventListener('proxypay:feature-flag', listener)
    useFeatureFlagStore.getState().setEnabled('transaction-row-preview', false)

    expect(listener).toHaveBeenCalledTimes(1)
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
      key: 'transaction-row-preview',
      enabled: false,
      event: 'toggled',
    })
    window.removeEventListener('proxypay:feature-flag', listener)
  })
})
