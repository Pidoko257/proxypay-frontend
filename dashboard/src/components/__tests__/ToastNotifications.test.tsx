/**
 * Tests for Issue #447 — Toast / Notification System
 * Tests the Zustand toastStore and ToastNotifications component.
 */

import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToastStore, ToastMessage } from '../../stores/toastStore'
import { ToastNotifications } from '../ToastNotifications'

// Reset store state between tests
beforeEach(() => {
  useToastStore.setState({ toasts: [] })
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('toastStore', () => {
  it('adds a toast via show()', () => {
    const { show } = useToastStore.getState()
    show('Hello world', 'success', 0)
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(useToastStore.getState().toasts[0].message).toBe('Hello world')
    expect(useToastStore.getState().toasts[0].type).toBe('success')
  })

  it('removes a toast via dismiss()', () => {
    const { show } = useToastStore.getState()
    const id = show('To dismiss', 'info', 0)
    expect(useToastStore.getState().toasts).toHaveLength(1)
    useToastStore.getState().dismiss(id)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('auto-dismisses after duration', () => {
    const { show } = useToastStore.getState()
    show('Auto gone', 'warning', 1000)
    expect(useToastStore.getState().toasts).toHaveLength(1)
    act(() => { vi.advanceTimersByTime(1001) })
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('stacks multiple toasts', () => {
    const { success, error, info } = useToastStore.getState()
    success('Saved', 0)
    error('Failed', 0)
    info('Note', 0)
    expect(useToastStore.getState().toasts).toHaveLength(3)
  })

  it('convenience wrappers set correct types', () => {
    const store = useToastStore.getState()
    store.success('s', 0)
    store.error('e', 0)
    store.info('i', 0)
    store.warning('w', 0)
    const toasts = useToastStore.getState().toasts
    expect(toasts.find((t: ToastMessage) => t.message === 's')?.type).toBe('success')
    expect(toasts.find((t: ToastMessage) => t.message === 'e')?.type).toBe('error')
    expect(toasts.find((t: ToastMessage) => t.message === 'i')?.type).toBe('info')
    expect(toasts.find((t: ToastMessage) => t.message === 'w')?.type).toBe('warning')
  })

  it('does not auto-dismiss when duration is 0', () => {
    const { show } = useToastStore.getState()
    show('Persistent', 'info', 0)
    act(() => { vi.advanceTimersByTime(10000) })
    expect(useToastStore.getState().toasts).toHaveLength(1)
  })
})

describe('ToastNotifications component', () => {
  it('renders nothing when no toasts', () => {
    render(<ToastNotifications />)
    const container = screen.getByTestId('toast-container')
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a toast when added to store', () => {
    render(<ToastNotifications />)
    act(() => {
      useToastStore.getState().success('File saved!', 0)
    })
    expect(screen.getByText('File saved!')).toBeInTheDocument()
  })

  it('renders correct type classes for all variants', () => {
    render(<ToastNotifications />)
    act(() => {
      useToastStore.getState().success('ok', 0)
      useToastStore.getState().error('bad', 0)
      useToastStore.getState().info('fyi', 0)
      useToastStore.getState().warning('watch', 0)
    })
    expect(document.querySelector('.toast-success')).toBeInTheDocument()
    expect(document.querySelector('.toast-error')).toBeInTheDocument()
    expect(document.querySelector('.toast-info')).toBeInTheDocument()
    expect(document.querySelector('.toast-warning')).toBeInTheDocument()
  })

  it('has aria-live="polite" for accessibility', () => {
    render(<ToastNotifications />)
    const container = screen.getByTestId('toast-container')
    expect(container).toHaveAttribute('aria-live', 'polite')
  })

  it('each toast has role="alert"', () => {
    render(<ToastNotifications />)
    act(() => {
      useToastStore.getState().error('Oops', 0)
    })
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
