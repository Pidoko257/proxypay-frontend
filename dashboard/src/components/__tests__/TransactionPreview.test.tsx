import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTransaction } from '../../test/fixtures'
import { Transaction } from '../../services/api'

const mockStore = vi.hoisted(() => ({
  transactions: [] as Transaction[],
  loading: false,
  error: null as string | null,
  fetchTransactions: vi.fn(),
}))

vi.mock('../../stores/transactionStore', () => ({
  useTransactionStore: () => mockStore,
}))

import { TransactionsTable } from '../TransactionsTable'

describe('TransactionsTable preview', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockStore.transactions = [makeTransaction({ id: 'preview-1', reference: 'PREVIEW-1' })]
    mockStore.loading = false
    mockStore.error = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits 200ms before showing a hover preview and supports keyboard opening', () => {
    const onRowClick = vi.fn()
    render(<TransactionsTable onRowClick={onRowClick} />)
    const row = screen.getByTestId('transaction-row-preview-1')

    fireEvent.mouseEnter(row)
    act(() => {
      vi.advanceTimersByTime(199)
    })
    expect(screen.queryByTestId('transaction-row-preview')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('tooltip')).toHaveTextContent('Click to open')
    expect(screen.getByRole('tooltip')).toHaveTextContent('$25.00')

    fireEvent.keyDown(row, { key: 'Enter' })
    expect(onRowClick).toHaveBeenCalledWith(mockStore.transactions[0])
  })

  it('shows the preview after keyboard focus and dismisses it on blur', () => {
    render(<TransactionsTable onRowClick={vi.fn()} />)
    const row = screen.getByTestId('transaction-row-preview-1')

    fireEvent.focus(row)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.getByTestId('transaction-row-preview')).toBeInTheDocument()

    fireEvent.blur(row)
    expect(screen.queryByTestId('transaction-row-preview')).not.toBeInTheDocument()
  })

  it('shows the preview after a mobile long press', () => {
    render(<TransactionsTable onRowClick={vi.fn()} />)
    const row = screen.getByTestId('transaction-row-preview-1')

    fireEvent.touchStart(row, { touches: [{ identifier: 1, clientX: 0, clientY: 0 }] })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(screen.getByTestId('transaction-row-preview')).toBeInTheDocument()
  })
})
