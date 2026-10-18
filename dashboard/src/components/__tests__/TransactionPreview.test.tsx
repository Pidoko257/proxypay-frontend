import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTransaction } from '../../test/fixtures'
import { Transaction } from '../../services/api'

const mockStore = vi.hoisted(() => ({
  transactions: [] as Transaction[],
  total: 0,
  loading: false,
  error: null as string | null,
  filters: { limit: 2, offset: 0 },
  fetchTransactions: vi.fn(),
  setFilters: vi.fn(),
}))

vi.mock('../../stores/transactionStore', () => ({
  useTransactionStore: () => mockStore,
}))

import { TransactionsTable } from '../TransactionsTable'

describe('TransactionsTable preview and interactions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockStore.transactions = [makeTransaction({ id: 'preview-1', reference: 'PREVIEW-1' })]
    mockStore.total = 1
    mockStore.filters = { limit: 2, offset: 0 }
    mockStore.loading = false
    mockStore.error = null
    mockStore.fetchTransactions.mockClear()
    mockStore.setFilters.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const expectAscendingSort = (
    label: string,
    column: keyof Transaction,
    highValue: string | number,
    lowValue: string | number
  ) => {
    mockStore.transactions = [
      makeTransaction({ id: 'high', [column]: highValue } as Partial<Transaction>),
      makeTransaction({ id: 'low', [column]: lowValue } as Partial<Transaction>),
    ]
    mockStore.total = 2
    render(<TransactionsTable onRowClick={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(screen.getAllByTestId(/^transaction-row-/).map((row) => row.getAttribute('data-testid')))
      .toEqual(['transaction-row-low', 'transaction-row-high'])
  }

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

  it('sorts transactions and keeps rows keyboard operable', () => {
    mockStore.transactions = [
      makeTransaction({ id: 'high', reference: 'HIGH', amount: 50 }),
      makeTransaction({ id: 'low', reference: 'LOW', amount: 5 }),
    ]
    mockStore.total = 2
    const onRowClick = vi.fn()
    render(<TransactionsTable onRowClick={onRowClick} />)

    fireEvent.click(screen.getByRole('button', { name: 'Amount' }))
    expect(screen.getAllByTestId(/^transaction-row-/).map((row) => row.getAttribute('data-testid')))
      .toEqual(['transaction-row-low', 'transaction-row-high'])
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toHaveAttribute('aria-sort', 'ascending')
    fireEvent.keyDown(screen.getByTestId('transaction-row-low'), { key: 'Enter' })
    expect(onRowClick).toHaveBeenCalledWith(mockStore.transactions[1])
  })

  it('changes pages and disables previous on the first page', () => {
    mockStore.transactions = [makeTransaction()]
    mockStore.total = 3
    mockStore.filters = { limit: 2, offset: 0 }
    render(<TransactionsTable onRowClick={vi.fn()} />)

    expect(screen.getByText('1-2 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(mockStore.setFilters).toHaveBeenCalledWith({ offset: 2 })
  })

  it('renders the empty state when there are no transactions', () => {
    mockStore.transactions = []
    mockStore.total = 0
    render(<TransactionsTable onRowClick={vi.fn()} />)

    expect(screen.getByText('No transactions found')).toBeInTheDocument()
  })

  it('sorts by reference', () => expectAscendingSort('Reference', 'reference', 'B-REF', 'A-REF'))
  it('sorts by amount', () => expectAscendingSort('Amount', 'amount', 20, 10))
  it('sorts by status', () => expectAscendingSort('Status', 'status', 'settled', 'failed'))
  it('sorts by provider', () => expectAscendingSort('Provider', 'provider', 'vodafone', 'airtel'))
  it('sorts by date', () => expectAscendingSort('Date', 'timestamp', '2026-02-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'))
})