import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTransactionStore } from '../stores/transactionStore'
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

export const TransactionsTable: React.FC<{
  onRowClick: (tx: Transaction) => void
}> = ({ onRowClick }) => {
  const { transactions, loading, error, fetchTransactions } = useTransactionStore()

  const [sort, setSort] = useState<SortState>({ column: null, direction: 'asc' })

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
                onClick={() => onRowClick(tx)}
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
                    onClick={(e) => {
                      e.stopPropagation()
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
    </div>
  )
}
