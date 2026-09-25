import React, { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp } from 'lucide-react'
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
    loading,
    error,
    fetchTransactions,
    filters,
  } = useTransactionStore()
  const [sort, setSort] = useState<SortState>({ column: null, direction: 'asc' })
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)

  useEffect(() => {
    if (loadOnMount) {
      void fetchTransactions(filters || {})
    }
  }, [fetchTransactions, filters, loadOnMount])

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
    event: React.KeyboardEvent<HTMLTableRowElement>,
    transaction: Transaction
  ) => {
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
    event: React.TouchEvent<HTMLTableRowElement>,
    transaction: Transaction
  ) => {
    if (event.touches.length !== 1) return
    longPressTriggered.current = false
    clearPreviewTimers()
    const row = event.currentTarget
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

  const sortedTransactions = [...transactions].sort((a, b) => {
    if (!sort.column) return 0

    const aVal = a[sort.column]
    const bVal = b[sort.column]

    if (aVal === bVal) return 0

    const result =
      typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal))

    return sort.direction === 'asc' ? result : -result
  })

  const SortHeader: React.FC<{
    column: keyof Transaction
    label: string
  }> = ({ column, label }) => (
    <th onClick={() => handleSort(column)} className="sortable-header">
      <div className="header-content">
        {label}
        {sort.column === column &&
          (sort.direction === 'asc' ? (
            <ChevronUp size={16} />
          ) : (
            <ChevronDown size={16} />
          ))}
      </div>
    </th>
  )

  if (error) {
    return <div className="error-message">{error}</div>
  }

  if (loading) {
    return <TransactionTableSkeleton rows={5} />
  }

  return (
    <div className="transactions-table-container">
      <table className="transactions-table">
        <thead>
          <tr>
            <SortHeader column="reference" label="Reference" />
            <SortHeader column="amount" label="Amount" />
            <SortHeader column="status" label="Status" />
            <SortHeader column="provider" label="Provider" />
            <SortHeader column="timestamp" label="Date" />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedTransactions.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty-cell">
                No transactions found
              </td>
            </tr>
          ) : (
            sortedTransactions.map((tx) => (
              <tr
                key={tx.id}
                onClick={() => {
                  if (longPressTriggered.current) {
                    longPressTriggered.current = false
                    return
                  }
                  onRowClick(tx)
                }}
                onMouseEnter={(event) => schedulePreview(tx, event.currentTarget)}
                onMouseLeave={hidePreview}
                onFocus={(event) => schedulePreview(tx, event.currentTarget)}
                onBlur={hidePreview}
                onKeyDown={(event) => handleKeyDown(event, tx)}
                onTouchStart={(event) => handleTouchStart(event, tx)}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onTouchMove={handleTouchEnd}
                onContextMenu={(event) => {
                  if (longPressTriggered.current) event.preventDefault()
                }}
                tabIndex={0}
                aria-label={`View transaction ${tx.reference}, $${tx.amount.toFixed(2)}, ${tx.status}, ${tx.provider}`}
                aria-describedby={
                  preview?.transaction.id === tx.id
                    ? 'transaction-row-preview'
                    : undefined
                }
                data-testid={`transaction-row-${tx.id}`}
                className="transaction-row"
              >
                <td>{tx.reference}</td>
                <td className="amount">${tx.amount.toFixed(2)}</td>
                <td>
                  <span className={`status-badge status-${tx.status}`}>
                    {tx.status}
                  </span>
                </td>
                <td>{tx.provider}</td>
                <td>{format(new Date(tx.timestamp), 'MMM dd, yyyy')}</td>
                <td className="action-cell">
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
              </tr>
            ))
          )}
        </tbody>
      </table>
      {preview && (
        <TransactionRowPreview
          transaction={preview.transaction}
          position={preview.position}
          visible
        />
      )}
    </div>
  )
}
