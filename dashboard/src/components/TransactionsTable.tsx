import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { TableVirtuoso, type TableVirtuosoHandle } from 'react-virtuoso'
import { useTransactionStore } from '../stores/transactionStore'
import { trackFeatureFlagEvaluation, useFeatureFlagStore } from '../stores/featureFlagStore'
import { Transaction } from '../services/api'
import { TransactionTableSkeleton } from './TransactionTableSkeleton'
import { TransactionSearch, matchesSearch, HighlightMatch } from './TransactionSearch'
import { DateRangePicker, DateRange, matchesDateRange } from './DateRangePicker'
import { StatusFilter, TransactionStatus, matchesStatus } from './StatusFilter'
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
}> = ({ onRowClick }) => {
  const { transactions, loading, error, fetchTransactions } = useTransactionStore()

  const [sort, setSort] = useState<SortState>({ column: null, direction: 'asc' })
  const [preview, setPreview] = useState<PreviewState | null>(null)
  /** #495 — Multi-select provider filter state (persisted in component state) */
  const [selectedProviders, setSelectedProviders] = useState<Provider[]>([])
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)
  const skipInitialFetch = useRef(!loadOnMount)

  // ── Filter state ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: 'all',
    startDate: '',
    endDate: '',
  })
  const [selectedStatuses, setSelectedStatuses] = useState<TransactionStatus[]>([])

  // ── Fetch on mount — pass empty filters so store defaults are preserved ─────
  // App.tsx also calls fetchTransactions; we avoid a double fetch by relying on
  // the store's loading flag.  If the store already has data, skip the call.
  useEffect(() => {
    if (transactions.length === 0) {
      fetchTransactions({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTransactions])

  // ── Sorting ─────────────────────────────────────────────────────────────────
  const handleSort = (column: keyof Transaction) => {
    setSort((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  // ── Filter callbacks (stable references via useCallback) ────────────────────
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleDateRange = useCallback((range: DateRange) => {
    setDateRange(range)
  }, [])

  const handleStatusChange = useCallback((statuses: TransactionStatus[]) => {
    setSelectedStatuses(statuses)
  }, [])

  // ── Composed filtering + sorting (AND logic) ─────────────────────────────────
  const filteredAndSorted = useMemo(() => {
    const filtered = (transactions ?? []).filter(
      (tx) =>
        matchesSearch(tx, searchQuery) &&
        matchesDateRange(tx, dateRange) &&
        matchesStatus(tx, selectedStatuses)
    )

    if (!sort.column) return filtered

    return [...filtered].sort((a, b) => {
      const col = sort.column as keyof Transaction
      const aVal = a[col]
      const bVal = b[col]
      if (aVal === bVal) return 0
      const result =
        typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal))
      return sort.direction === 'asc' ? result : -result
    })
  }, [transactions, searchQuery, dateRange, selectedStatuses, sort])

  const totalCount = (transactions ?? []).length

  // ── SortHeader sub-component ─────────────────────────────────────────────────
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

  if (loading && totalCount === 0) {
    return <TransactionTableSkeleton rows={5} />
  }

  return (
    <div className="transactions-table-container">
      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="filter-bar">
        <TransactionSearch
          onSearch={handleSearch}
          resultCount={filteredAndSorted.length}
          totalCount={totalCount}
        />
        <div className="filter-bar-right">
          <DateRangePicker
            transactions={transactions ?? []}
            onRangeChange={handleDateRange}
            filteredCount={filteredAndSorted.length}
          />
          <StatusFilter
            transactions={transactions ?? []}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>

      {/* ── Results summary ─────────────────────────────────────────────────── */}
      <div className="results-summary">
        <span>
          Showing{' '}
          <strong>{filteredAndSorted.length}</strong> of{' '}
          <strong>{totalCount}</strong> transaction{totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
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
          {filteredAndSorted.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty-cell">
                {totalCount === 0
                  ? 'No transactions found'
                  : 'No transactions match the current filters'}
              </td>
            </tr>
          ) : (
            filteredAndSorted.map((tx) => (
              <tr
                key={tx.id}
                onClick={() => {
                  if (longPressTriggered.current) {
                    longPressTriggered.current = false
                    return
                  }
                  onRowClick(tx)
                }}
                onMouseEnter={(event) => showRowPreview && schedulePreview(tx, event.currentTarget)}
                onMouseLeave={hidePreview}
                onFocus={(event) => showRowPreview && schedulePreview(tx, event.currentTarget)}
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
                <td>
                  <HighlightMatch text={tx.reference} query={searchQuery} />
                </td>
                <td className="amount">${tx.amount.toFixed(2)}</td>
                <td>
                  <span className={`status-badge status-${tx.status}`}>
                    {tx.status}
                  </span>
                </td>
                <td>
                  <HighlightMatch text={tx.provider} query={searchQuery} />
                </td>
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
