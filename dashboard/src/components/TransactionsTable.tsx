import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTransactionStore } from '../stores/transactionStore'
import { Transaction } from '../services/api'
import { TransactionTableSkeleton } from './TransactionTableSkeleton'
import '../styles/TransactionsTable.css'

interface SortState {
  column: keyof Transaction | null
  direction: 'asc' | 'desc'
}

export const TransactionsTable: React.FC<{
  onRowClick: (tx: Transaction) => void
}> = ({ onRowClick }) => {
  const {
    transactions,
    loading,
    error,
    fetchTransactions,
  } = useTransactionStore()
  const [sort, setSort] = useState<SortState>({ column: null, direction: 'asc' })

  useEffect(() => {
    fetchTransactions({})
  }, [fetchTransactions])

  const handleSort = (column: keyof Transaction) => {
    setSort((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
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
                onClick={() => onRowClick(tx)}
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
