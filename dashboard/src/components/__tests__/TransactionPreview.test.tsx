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

vi.mock('../../stores/featureFlagStore', () => ({
  useFeatureFlagStore: () => ({}),
  trackFeatureFlagEvaluation: vi.fn(),
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

    // Mock getBoundingClientRect for all elements
    HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
      x: 100,
      y: 100,
      top: 100,
      left: 100,
      right: 410,
      bottom: 140,
      width: 310,
      height: 40,
      toJSON: () => ({}),
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Hover preview tests ──────────────────────────────────────────────────────

  const getRowOrder = () =>
    screen.getAllByTestId(/^transaction-row-/).map((row) => row.getAttribute('data-testid'))

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
  })

  it('hides preview when mouse leaves the row', () => {
    render(<TransactionsTable onRowClick={vi.fn()} />)
    const row = screen.getByTestId('transaction-row-preview-1')

    fireEvent.mouseEnter(row)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.getByTestId('transaction-row-preview')).toBeInTheDocument()

    fireEvent.mouseLeave(row)
    expect(screen.queryByTestId('transaction-row-preview')).not.toBeInTheDocument()
  })

  // ── Keyboard focus tests ─────────────────────────────────────────────────────

  it('shows preview after keyboard focus and dismisses on blur', () => {
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

  it('opens row details with Enter key when preview is visible', () => {
    const onRowClick = vi.fn()
    render(<TransactionsTable onRowClick={onRowClick} />)
    const row = screen.getByTestId('transaction-row-preview-1')

    // Show preview
    fireEvent.focus(row)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.getByTestId('transaction-row-preview')).toBeInTheDocument()

    // Press Enter to open
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(onRowClick).toHaveBeenCalledWith(mockStore.transactions[0])
    expect(screen.queryByTestId('transaction-row-preview')).not.toBeInTheDocument()
  })

  it('opens row details with Space key when preview is visible', () => {
    const onRowClick = vi.fn()
    render(<TransactionsTable onRowClick={onRowClick} />)
    const row = screen.getByTestId('transaction-row-preview-1')

    fireEvent.focus(row)
    act(() => {
      vi.advanceTimersByTime(200)
    })

    fireEvent.keyDown(row, { key: ' ' })
    expect(onRowClick).toHaveBeenCalledWith(mockStore.transactions[0])
  })

  // ── Escape key tests ─────────────────────────────────────────────────────────

  it('dismisses preview with Escape key', () => {
    render(<TransactionsTable onRowClick={vi.fn()} />)
    const row = screen.getByTestId('transaction-row-preview-1')

    fireEvent.mouseEnter(row)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.getByTestId('transaction-row-preview')).toBeInTheDocument()

    fireEvent.keyDown(row, { key: 'Escape' })
    expect(screen.queryByTestId('transaction-row-preview')).not.toBeInTheDocument()
  })

  // ── Touch long-press tests ───────────────────────────────────────────────────

  it('shows preview after 500ms touch long-press', () => {
    render(<TransactionsTable onRowClick={vi.fn()} />)
    const row = screen.getByTestId('transaction-row-preview-1')

    fireEvent.touchStart(row, { touches: [{ identifier: 1, clientX: 0, clientY: 0 }] })
    
    act(() => {
      vi.advanceTimersByTime(499)
    })
    expect(screen.queryByTestId('transaction-row-preview')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByTestId('transaction-row-preview')).toBeInTheDocument()
  })

  it('cancels long-press timer on touchEnd', () => {
    render(<TransactionsTable onRowClick={vi.fn()} />)
    const row = screen.getByTestId('transaction-row-preview-1')

    fireEvent.touchStart(row, { touches: [{ identifier: 1, clientX: 0, clientY: 0 }] })
    act(() => {
      vi.advanceTimersByTime(250)
    })

    fireEvent.touchEnd(row)
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Preview should not show because timer was cancelled
    expect(screen.queryByTestId('transaction-row-preview')).not.toBeInTheDocument()
  })

  it('cancels long-press timer on touchMove', () => {
    render(<TransactionsTable onRowClick={vi.fn()} />)
    const row = screen.getByTestId('transaction-row-preview-1')

    fireEvent.touchStart(row, { touches: [{ identifier: 1, clientX: 0, clientY: 0 }] })
    act(() => {
      vi.advanceTimersByTime(250)
    })

    fireEvent.touchMove(row, { touches: [{ identifier: 1, clientX: 10, clientY: 10 }] })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.queryByTestId('transaction-row-preview')).not.toBeInTheDocument()
  })

  // ── Outside-click tests ──────────────────────────────────────────────────────

  it('dismisses preview when clicking outside', () => {
    render(<TransactionsTable onRowClick={vi.fn()} />)
    const row = screen.getByTestId('transaction-row-preview-1')

    fireEvent.mouseEnter(row)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.getByTestId('transaction-row-preview')).toBeInTheDocument()

    // Click outside the table
    fireEvent.mouseDown(document.body, { target: document.body })
    expect(screen.queryByTestId('transaction-row-preview')).not.toBeInTheDocument()
  })

  it('keeps preview visible when clicking inside preview', () => {
    render(<TransactionsTable onRowClick={vi.fn()} />)
    const row = screen.getByTestId('transaction-row-preview-1')

    fireEvent.mouseEnter(row)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    const preview = screen.getByTestId('transaction-row-preview')
    expect(preview).toBeInTheDocument()

    // Click on the preview itself
    fireEvent.mouseDown(preview)
    expect(screen.getByTestId('transaction-row-preview')).toBeInTheDocument()
  })

  // ── Keyboard navigation tests ────────────────────────────────────────────────

  it('navigates between rows with arrow keys', () => {
    mockStore.transactions = [
      makeTransaction({ id: 'tx-1', reference: 'TX-1' }),
      makeTransaction({ id: 'tx-2', reference: 'TX-2' }),
    ]
    mockStore.total = 2

    render(<TransactionsTable onRowClick={vi.fn()} />)
    const row1 = screen.getByTestId('transaction-row-tx-1')

    // Focus first row
    fireEvent.focus(row1)
    expect(row1).toHaveAttribute('tabIndex', '0')

    // Press ArrowDown
    fireEvent.keyDown(row1, { key: 'ArrowDown' })
    const row2 = screen.getByTestId('transaction-row-tx-2')
    expect(row2).toHaveAttribute('tabIndex', '0')
  })

  it('prevents ArrowUp navigation below index 0', () => {
    mockStore.transactions = [
      makeTransaction({ id: 'tx-1', reference: 'TX-1' }),
      makeTransaction({ id: 'tx-2', reference: 'TX-2' }),
    ]
    mockStore.total = 2

    render(<TransactionsTable onRowClick={vi.fn()} />)
    const row1 = screen.getByTestId('transaction-row-tx-1')

    fireEvent.focus(row1)
    fireEvent.keyDown(row1, { key: 'ArrowUp' })
    
    // Should stay at first row
    expect(row1).toHaveAttribute('tabIndex', '0')
  })

  // ── Row click and sorting tests ──────────────────────────────────────────────

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

  it('clicking row directly opens details without preview', () => {
    const onRowClick = vi.fn()
    render(<TransactionsTable onRowClick={onRowClick} />)
    const row = screen.getByTestId('transaction-row-preview-1')

    fireEvent.click(row)
    expect(onRowClick).toHaveBeenCalledWith(mockStore.transactions[0])
  })

  it('clicking row after long-press does not trigger row click', () => {
    const onRowClick = vi.fn()
    render(<TransactionsTable onRowClick={onRowClick} />)
    const row = screen.getByTestId('transaction-row-preview-1')

    // Trigger long-press
    fireEvent.touchStart(row, { touches: [{ identifier: 1, clientX: 0, clientY: 0 }] })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByTestId('transaction-row-preview')).toBeInTheDocument()

    // Click should not trigger row click because long-press was active
    fireEvent.click(row)
    expect(onRowClick).not.toHaveBeenCalled()
  })

  // ── Accessibility announcement tests ─────────────────────────────────────────

  it('announces preview state to screen readers', () => {
    render(<TransactionsTable onRowClick={vi.fn()} />)
    const row = screen.getByTestId('transaction-row-preview-1')
    const announcementRegion = screen.getByRole('status')

    fireEvent.mouseEnter(row)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    
    fireEvent.keyDown(row, { key: 'Escape' })
    expect(announcementRegion).toHaveTextContent('Preview closed')
  })

  // ── Sorting tests ────────────────────────────────────────────────────────────

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

  it('sorts by reference', () => expectAscendingSort('Reference', 'reference', 'B-REF', 'A-REF'))
  it('sorts by amount', () => expectAscendingSort('Amount', 'amount', 20, 10))
  it('sorts by status', () => expectAscendingSort('Status', 'status', 'settled', 'failed'))
  it('sorts by provider', () => expectAscendingSort('Provider', 'provider', 'vodafone', 'airtel'))
  it('sorts by date', () => expectAscendingSort('Date', 'timestamp', '2026-02-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'))

  it('keeps equal values in a deterministic order across repeated renders', () => {
    mockStore.transactions = [
      makeTransaction({ id: 'a', reference: 'SAME', amount: 10 }),
      makeTransaction({ id: 'b', reference: 'SAME', amount: 10 }),
      makeTransaction({ id: 'c', reference: 'SAME', amount: 10 }),
    ]
    mockStore.total = 3
    const { unmount } = render(<TransactionsTable onRowClick={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Amount' }))
    const firstOrder = getRowOrder()
    unmount()

    render(<TransactionsTable onRowClick={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Amount' }))
    expect(getRowOrder()).toEqual(firstOrder)
  })

  it('places missing values last when sorting ascending', () => {
    mockStore.transactions = [
      makeTransaction({ id: 'missing', amount: null as unknown as number }),
      makeTransaction({ id: 'present', amount: 10 }),
    ]
    mockStore.total = 2
    render(<TransactionsTable onRowClick={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Amount' }))
    expect(getRowOrder()).toEqual(['transaction-row-present', 'transaction-row-missing'])
  })

  it('places invalid values last when sorting ascending', () => {
    mockStore.transactions = [
      makeTransaction({ id: 'invalid', amount: 'not-a-number' as unknown as number }),
      makeTransaction({ id: 'valid', amount: 10 }),
    ]
    mockStore.total = 2
    render(<TransactionsTable onRowClick={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Amount' }))
    expect(getRowOrder()).toEqual(['transaction-row-valid', 'transaction-row-invalid'])
  })

  it('normalizes numeric strings when sorting by amount', () => {
    mockStore.transactions = [
      makeTransaction({ id: 'high', amount: '100' as unknown as number }),
      makeTransaction({ id: 'low', amount: '9' as unknown as number }),
    ]
    mockStore.total = 2
    render(<TransactionsTable onRowClick={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Amount' }))
    expect(getRowOrder()).toEqual(['transaction-row-low', 'transaction-row-high'])
  })

  it('normalizes date-like values when sorting by date', () => {
    mockStore.transactions = [
      makeTransaction({ id: 'later', timestamp: '2026-02-01T00:00:00.000Z' }),
      makeTransaction({ id: 'earlier', timestamp: '2026-01-01T00:00:00.000Z' }),
      makeTransaction({ id: 'missing', timestamp: null as unknown as string }),
    ]
    mockStore.total = 3
    render(<TransactionsTable onRowClick={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Date' }))
    expect(getRowOrder()).toEqual([
      'transaction-row-earlier',
      'transaction-row-later',
      'transaction-row-missing',
    ])
  })
})
