import React, { useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { TableVirtuoso, type TableVirtuosoHandle } from 'react-virtuoso'
import { useTransactionStore } from '../stores/transactionStore'
import { Transaction } from '../services/api'
import { TransactionTableSkeleton } from './TransactionTableSkeleton'
import {
  LONG_PRESS_DELAY_MS,
  PREVIEW_DELAY_MS,
  TransactionPreviewPosition,
  TransactionRowPreview,
} from './TransactionRowPreview'
import '../styles/TransactionsTable.css'

interface SortState {
  column: keyof Transaction | null
  direction: 'asc' | 'desc'
}

interface PreviewState {
  transaction: Transaction
  position: TransactionPreviewPosition
}

const VirtualizedTable = React.forwardRef<
  HTMLTableElement,
  React.ComponentProps<'table'>
>(({ style, ...props }, ref) => (
  <table
    {...props}
    ref={ref}
    className="transactions-table"
    style={{ ...style, borderCollapse: 'separate', borderSpacing: 0 }}
  />
))

VirtualizedTable.displayName = 'VirtualizedTable'

const virtuosoComponents = { Table: VirtualizedTable }

const previewForRow = (
  row: HTMLTableRowElement
): TransactionPreviewPosition => {
  const rect = row.getBoundingClientRect()
  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight
  const previewWidth = Math.min(310, Math.max(240, viewportWidth - 32))
  const left = Math.min(
    Math.max(8, rect.left),
    Math.max(8, viewportWidth - previewWidth - 8)
  )
  const estimatedHeight = 250
  const below = rect.bottom + 8
  const top =
    below + estimatedHeight > viewportHeight
      ? Math.max(8, rect.top - estimatedHeight - 8)
      : below

  return { top, left }
}

export const TransactionsTable: React.FC<{
  onRowClick: (tx: Transaction) => void
  loadOnMount?: boolean
}> = ({ onRowClick, loadOnMount = true }) => {
  const {
    transactions,
    total,
    loading,
    error,
    fetchTransactions,
    filters,
  } = useTransactionStore()
  const [sort, setSort] = useState<SortState>({ column: null, direction: 'asc' })
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [activeRowIndex, setActiveRowIndex] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const virtuosoRef = useRef<TableVirtuosoHandle>(null)
  const pendingFocusIndex = useRef<number | null>(null)
  const previousFilters = useRef(filters)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)

  useEffect(() => {
    if (loadOnMount) {
      void fetchTransactions(filters || {})
    }
  }, [fetchTransactions, filters, loadOnMount])

  useEffect(() => {
    if (loading || error) return
    const filtersChanged = previousFilters.current !== filters
    previousFilters.current = filters
    const count = total ?? transactions.length
    setAnnouncement(
      `${filtersChanged ? 'Filters updated. ' : ''}${count} transaction${count === 1 ? '' : 's'} found.`
    )
  }, [error, filters, loading, total, transactions.length])

  useEffect(() => {
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current)
      if (touchTimer.current) clearTimeout(touchTimer.current)
    }
  }, [])

  const clearPreviewTimers = () => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current)
      previewTimer.current = null
    }
    if (touchTimer.current) {
      clearTimeout(touchTimer.current)
      touchTimer.current = null
    }
  }

  const hidePreview = () => {
    clearPreviewTimers()
    setPreview(null)
  }

  const schedulePreview = (
    transaction: Transaction,
    row: HTMLTableRowElement,
    delay = PREVIEW_DELAY_MS
  ) => {
    clearPreviewTimers()
    const position = previewForRow(row)
    previewTimer.current = setTimeout(() => {
      setPreview({ transaction, position })
      previewTimer.current = null
    }, delay)
  }

  const handleSort = (column: keyof Transaction) => {
    setSort((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTableCellElement>,
    index: number,
    transaction: Transaction,
  ) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const targetIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? sortedTransactions.length - 1
          : Math.max(0, Math.min(sortedTransactions.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))
      setActiveRowIndex(targetIndex)
      const target = document.getElementById(`transaction-cell-${targetIndex}`)
      if (target) {
        target.focus()
      } else {
        pendingFocusIndex.current = targetIndex
        virtuosoRef.current?.scrollToIndex({ index: targetIndex, align: 'center' })
      }
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      hidePreview()
      onRowClick(transaction)
    }
    if (event.key === 'Escape') {
      hidePreview()
    }
  }

  const handleTouchStart = (
    event: React.TouchEvent<HTMLTableCellElement>,
    row: HTMLTableRowElement,
    transaction: Transaction
  ) => {
    if (event.touches.length !== 1) return
    longPressTriggered.current = false
    clearPreviewTimers()
    const position = previewForRow(row)
    touchTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      setPreview({
        transaction,
        position,
      })
      touchTimer.current = null
    }, LONG_PRESS_DELAY_MS)
  }

  const handleTouchEnd = () => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current)
      touchTimer.current = null
    }
  }

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort((a, b) => {
        if (!sort.column) return 0

        const aVal = a[sort.column]
        const bVal = b[sort.column]

        if (aVal === bVal) return 0

        const result =
          typeof aVal === 'number' && typeof bVal === 'number'
            ? aVal - bVal
            : String(aVal).localeCompare(String(bVal))

        return sort.direction === 'asc' ? result : -result
      }),
    [sort.column, sort.direction, transactions]
  )

  useEffect(() => {
    setActiveRowIndex((current) =>
      Math.min(current, Math.max(sortedTransactions.length - 1, 0))
    )
    if (
      pendingFocusIndex.current !== null &&
      pendingFocusIndex.current >= sortedTransactions.length
    ) {
      pendingFocusIndex.current = null
    }
  }, [sortedTransactions.length])

  const SortHeader: React.FC<{
    column: keyof Transaction
    label: string
  }> = ({ column, label }) => {
    const direction = sort.column === column
      ? sort.direction === 'asc' ? 'ascending' : 'descending'
      : 'none'

    return (
      <th scope="col" aria-sort={direction}>
        <button type="button" onClick={() => handleSort(column)} className="sortable-header">
          <span className="header-content">
            {label}
            {sort.column === column &&
              (sort.direction === 'asc' ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              ))}
          </span>
        </button>
      </th>
    )
  }

  const renderTableHeader = () => (
    <tr>
      <SortHeader column="reference" label="Reference" />
      <SortHeader column="amount" label="Amount" />
      <SortHeader column="status" label="Status" />
      <SortHeader column="provider" label="Provider" />
      <SortHeader column="timestamp" label="Date" />
      <th scope="col">Actions</th>
    </tr>
  )

  const rowCellHandlers = (index: number, tx: Transaction) => ({
    onClick: (event: React.MouseEvent<HTMLTableCellElement>) => {
      if (
        event.target instanceof Element &&
        !event.target.closest('button')
      ) {
        if (longPressTriggered.current) {
          longPressTriggered.current = false
          return
        }
        hidePreview()
        onRowClick(tx)
      }
    },
    onMouseEnter: (event: React.MouseEvent<HTMLTableCellElement>) => {
      const row = event.currentTarget.closest('tr')
      if (row) schedulePreview(tx, row)
    },
    onMouseLeave: (event: React.MouseEvent<HTMLTableCellElement>) => {
      const row = event.currentTarget.closest('tr')
      if (
        !row ||
        !(event.relatedTarget instanceof Node) ||
        !row.contains(event.relatedTarget)
      ) hidePreview()
    },
    onFocus: (event: React.FocusEvent<HTMLTableCellElement>) => {
      setActiveRowIndex(index)
      const row = event.currentTarget.closest('tr')
      if (row) schedulePreview(tx, row)
    },
    onBlur: (event: React.FocusEvent<HTMLTableCellElement>) => {
      const row = event.currentTarget.closest('tr')
      if (
        !row ||
        !(event.relatedTarget instanceof Node) ||
        !row.contains(event.relatedTarget)
      ) hidePreview()
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLTableCellElement>) => handleKeyDown(event, index, tx),
    onTouchStart: (event: React.TouchEvent<HTMLTableCellElement>) => {
      const row = event.currentTarget.closest('tr')
      if (row) handleTouchStart(event, row, tx)
    },
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchEnd,
    onTouchMove: handleTouchEnd,
    onContextMenu: (event: React.MouseEvent<HTMLTableCellElement>) => {
      if (longPressTriggered.current) event.preventDefault()
    },
  })

  if (error) {
    return <div className="error-message">{error}</div>
  }

  if (loading) {
    return <TransactionTableSkeleton rows={5} />
  }

  return (
    <>
      <div className="transactions-table-container">
        {sortedTransactions.length === 0 ? (
          <table className="transactions-table">
            <thead>{renderTableHeader()}</thead>
            <tbody>
              <tr>
                <td colSpan={6} className="empty-cell">
                  No transactions found
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <TableVirtuoso
            ref={virtuosoRef}
            className="transactions-table-viewport"
            data={sortedTransactions}
            computeItemKey={(_index, tx) => tx.id}
            components={virtuosoComponents}
            fixedHeaderContent={renderTableHeader}
            rangeChanged={({ startIndex, endIndex }) => {
              const pending = pendingFocusIndex.current
              if (pending !== null && pending >= startIndex && pending <= endIndex) {
                document.getElementById(`transaction-cell-${pending}`)?.focus()
                pendingFocusIndex.current = null
              }
            }}
            itemContent={(index, tx) => {
              const interactions = rowCellHandlers(index, tx)
              const previewDescription = preview?.transaction.id === tx.id
                ? 'transaction-row-preview'
                : undefined

              return (
                <>
                  <td
                    {...interactions}
                    id={`transaction-cell-${index}`}
                    data-testid={`transaction-row-${tx.id}`}
                    className="transaction-row"
                    tabIndex={activeRowIndex === index ? 0 : -1}
                    aria-label={`View transaction ${tx.reference}, $${tx.amount.toFixed(2)}, ${tx.status}, ${tx.provider}`}
                    aria-describedby={previewDescription}
                  >
                    {tx.reference}
                  </td>
                  <td {...interactions} className="amount">${tx.amount.toFixed(2)}</td>
                  <td {...interactions}>
                    <span className={`status-badge status-${tx.status}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td {...interactions}>{tx.provider}</td>
                  <td {...interactions}>{format(new Date(tx.timestamp), 'MMM dd, yyyy')}</td>
                  <td {...interactions} className="action-cell">
                    <button
                      className="view-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        hidePreview()
                        onRowClick(tx)
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </>
              )
            }}
          />
        )}
      </div>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      {preview && (
        <TransactionRowPreview
          transaction={preview.transaction}
          position={preview.position}
          visible
        />
      )}
    </>
  )
}
