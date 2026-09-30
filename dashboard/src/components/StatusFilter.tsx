import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check, Filter } from 'lucide-react'
import { Transaction } from '../services/api'
import '../styles/StatusFilter.css'

export type TransactionStatus = Transaction['status']

const ALL_STATUSES: TransactionStatus[] = ['pending', 'settled', 'failed']

// ── Utility ───────────────────────────────────────────────────────────────────

/**
 * Returns true if the transaction's status is in the selected set
 * (or if no statuses are selected — show all).
 */
export function matchesStatus(
  tx: Transaction,
  selectedStatuses: TransactionStatus[]
): boolean {
  if (selectedStatuses.length === 0) return true
  return selectedStatuses.includes(tx.status)
}

// ── URL persistence helpers ───────────────────────────────────────────────────

function readStatusesFromURL(): TransactionStatus[] {
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('status')
  if (!raw) return []
  return raw
    .split(',')
    .filter((s): s is TransactionStatus =>
      (ALL_STATUSES as string[]).includes(s)
    )
}

function writeStatusesToURL(statuses: TransactionStatus[]): void {
  const params = new URLSearchParams(window.location.search)
  if (statuses.length === 0) {
    params.delete('status')
  } else {
    params.set('status', statuses.join(','))
  }
  const newUrl = `${window.location.pathname}${params.size > 0 ? '?' + params.toString() : ''}`
  window.history.replaceState(null, '', newUrl)
}

// ── Label / color map ─────────────────────────────────────────────────────────

const STATUS_META: Record<TransactionStatus, { label: string; cssClass: string }> = {
  pending: { label: 'Pending', cssClass: 'status-pending' },
  settled: { label: 'Settled', cssClass: 'status-settled' },
  failed: { label: 'Failed', cssClass: 'status-failed' },
}

// ── Component ─────────────────────────────────────────────────────────────────

interface StatusFilterProps {
  transactions: Transaction[]
  onStatusChange: (statuses: TransactionStatus[]) => void
}

export const StatusFilter: React.FC<StatusFilterProps> = ({
  transactions,
  onStatusChange,
}) => {
  const [selected, setSelected] = useState<TransactionStatus[]>(
    readStatusesFromURL
  )
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Notify parent on mount with initial selection from URL
  useEffect(() => {
    onStatusChange(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const toggleStatus = (status: TransactionStatus) => {
    setSelected((prev) => {
      const next = prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
      writeStatusesToURL(next)
      onStatusChange(next)
      return next
    })
  }

  const clearAll = () => {
    setSelected([])
    writeStatusesToURL([])
    onStatusChange([])
  }

  // Count transactions per status in the full (unfiltered) list
  const countByStatus = ALL_STATUSES.reduce<Record<TransactionStatus, number>>(
    (acc, s) => {
      acc[s] = transactions.filter((tx) => tx.status === s).length
      return acc
    },
    { pending: 0, settled: 0, failed: 0 }
  )

  const activeCount = selected.length

  return (
    <div className="status-filter" ref={containerRef}>
      <button
        type="button"
        className={`sf-toggle${isOpen ? ' sf-toggle--open' : ''}${activeCount > 0 ? ' sf-toggle--active' : ''}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Filter by status${activeCount > 0 ? `, ${activeCount} active` : ''}`}
      >
        <Filter size={14} aria-hidden="true" />
        <span>Status</span>
        {activeCount > 0 && (
          <span className="sf-badge" aria-label={`${activeCount} filters active`}>
            {activeCount}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`sf-chevron${isOpen ? ' sf-chevron--open' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="sf-dropdown" role="listbox" aria-multiselectable="true" aria-label="Transaction statuses">
          <div className="sf-dropdown-header">
            <span className="sf-dropdown-title">Filter by status</span>
            {activeCount > 0 && (
              <button
                type="button"
                className="sf-clear-btn"
                onClick={clearAll}
                aria-label="Clear all status filters"
              >
                Clear all
              </button>
            )}
          </div>

          <ul className="sf-options">
            {ALL_STATUSES.map((status) => {
              const { label, cssClass } = STATUS_META[status]
              const isSelected = selected.includes(status)
              const count = countByStatus[status]

              return (
                <li
                  key={status}
                  className={`sf-option${isSelected ? ' sf-option--selected' : ''}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleStatus(status)}
                >
                  <span
                    className={`sf-check-box${isSelected ? ' sf-check-box--checked' : ''}`}
                    aria-hidden="true"
                  >
                    {isSelected && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className={`sf-status-label status-badge ${cssClass}`}>
                    {label}
                  </span>
                  <span className="sf-count">{count}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
