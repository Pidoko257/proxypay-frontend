import { useEffect, useMemo, useRef, useState } from 'react'
import type { FC, KeyboardEvent } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, Check, GitMerge, Loader, X } from 'lucide-react'
import { DuplicateTransactionGroup, Transaction } from '../services/api'
import { TransactionMergeResult } from '../services/duplicateDetection'
import { useDuplicateStore } from '../stores/duplicateStore'
import '../styles/DuplicateReview.css'

export interface DuplicateReviewProps {
  transactions: Transaction[]
  onMerged?: (result: TransactionMergeResult) => void
}

const dateLabel = (timestamp: string): string => {
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? timestamp : format(date, 'MMM dd, yyyy')
}

const reasonLabel = (reason: DuplicateTransactionGroup['reason']): string => {
  const labels: Record<DuplicateTransactionGroup['reason'], string> = {
    stellarHash: 'Matching Stellar hash',
    mobileMoneyReference: 'Matching mobile money reference',
    reference: 'Matching reference and amount',
    transactionFingerprint: 'Matching amount, provider, and time',
    manual: 'Manually identified',
  }
  return labels[reason] || 'Potential duplicate'
}

export const DuplicateReview: FC<DuplicateReviewProps> = ({
  transactions,
  onMerged,
}) => {
  const {
    groups,
    loading,
    error,
    markedTransactionIds,
    fetchGroups,
    setLocalTransactions,
    markGroup,
    mergeGroup,
    clearError,
  } = useDuplicateStore()
  const [canonicalByGroup, setCanonicalByGroup] = useState<Record<string, string>>({})
  const [pendingGroup, setPendingGroup] = useState<DuplicateTransactionGroup | null>(null)
  const closeDialogButtonRef = useRef<HTMLButtonElement>(null)
  const [merging, setMerging] = useState(false)

  useEffect(() => {
    setLocalTransactions(transactions)
  }, [setLocalTransactions, transactions])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  useEffect(() => {
    if (!pendingGroup) return
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !merging) setPendingGroup(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [merging, pendingGroup])

  useEffect(() => {
    if (!pendingGroup) return
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const focusTimer = window.setTimeout(() => {
      closeDialogButtonRef.current?.focus()
    }, 0)
    return () => {
      window.clearTimeout(focusTimer)
      previousFocus?.focus()
    }
  }, [pendingGroup])

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => {
          const hydratedTransactions = (group.transactions || []).length > 0
            ? group.transactions
            : group.transactionIds
                .map((id) => transactions.find((transaction) => transaction.id === id))
                .filter((transaction): transaction is Transaction => Boolean(transaction))
          return {
            ...group,
            transactions: hydratedTransactions,
            canonicalId: hydratedTransactions.some(
              (transaction) => transaction.id === group.canonicalId
            )
              ? group.canonicalId
              : hydratedTransactions[0]?.id || group.canonicalId,
          }
        })
        .filter((group) => group.transactions.length > 1),
    [groups, transactions]
  )

  if (visibleGroups.length === 0) return null

  const handleMark = async (group: DuplicateTransactionGroup) => {
    await markGroup(group, canonicalByGroup[group.id] || group.canonicalId)
  }

  const handleMerge = async () => {
    if (!pendingGroup) return
    const canonicalId = canonicalByGroup[pendingGroup.id] || pendingGroup.canonicalId
    const group = {
      ...pendingGroup,
      canonicalId,
      transactions: pendingGroup.transactions,
    }
    setMerging(true)
    try {
      const result = await mergeGroup(group)
      onMerged?.(result)
      setPendingGroup(null)
    } catch {
      return
    } finally {
      setMerging(false)
    }
  }

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !merging) {
      event.preventDefault()
      setPendingGroup(null)
      return
    }
    if (event.key !== 'Tab') return
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <section className="duplicate-review" aria-labelledby="duplicate-review-heading">
      <div className="duplicate-review-header">
        <div>
          <h2 id="duplicate-review-heading">Potential duplicate transactions</h2>
          <p>Review matches before merging to protect transaction counts.</p>
        </div>
        {loading && <Loader size={18} className="spinner" aria-label="Loading duplicates" />}
      </div>

      {error && (
        <div className="duplicate-error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label="Dismiss duplicate error">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="duplicate-groups">
        {visibleGroups.map((group) => {
          const canonicalId = canonicalByGroup[group.id] || group.canonicalId
          const isMarked = group.markedAsDuplicate || group.transactionIds.every((id) => markedTransactionIds.includes(id))
          return (
            <article key={group.id} className="duplicate-group" data-testid={`duplicate-group-${group.id}`}>
              <div className="duplicate-group-heading">
                <div>
                  <strong>{reasonLabel(group.reason)}</strong>
                  <span className="duplicate-confidence">
                    {Math.round(group.confidence * 100)}% match
                  </span>
                </div>
                {isMarked && (
                  <span className="duplicate-marked">
                    <Check size={14} /> Marked
                  </span>
                )}
              </div>
              <div className="duplicate-transaction-list">
                {group.transactions.map((transaction) => (
                  <label
                    key={transaction.id}
                    className={`duplicate-transaction ${
                      transaction.id === canonicalId ? 'canonical' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name={`canonical-${group.id}`}
                      value={transaction.id}
                      checked={transaction.id === canonicalId}
                      onChange={() =>
                        setCanonicalByGroup((current) => ({
                          ...current,
                          [group.id]: transaction.id,
                        }))
                      }
                    />
                    <span className="duplicate-transaction-details">
                      <span className="duplicate-reference">{transaction.reference}</span>
                      <span>${transaction.amount.toFixed(2)}</span>
                      <span>{transaction.provider.toUpperCase()}</span>
                      <span>{dateLabel(transaction.timestamp)}</span>
                    </span>
                    {transaction.id === canonicalId && (
                      <span className="canonical-label">Keep as canonical</span>
                    )}
                  </label>
                ))}
              </div>
              <div className="duplicate-group-actions">
                <button
                  type="button"
                  className="duplicate-secondary-button"
                  onClick={() => void handleMark(group)}
                  disabled={isMarked}
                >
                  <Check size={15} /> Mark as duplicates
                </button>
                <button
                  type="button"
                  className="duplicate-merge-button"
                  onClick={() => setPendingGroup(group)}
                >
                  <GitMerge size={15} /> Review & merge
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {pendingGroup && (
        <div className="duplicate-dialog-backdrop" role="presentation">
          <div
            className="duplicate-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="merge-dialog-heading"
            onKeyDown={handleDialogKeyDown}
          >
            <div className="duplicate-dialog-header">
              <h3 id="merge-dialog-heading">Confirm transaction merge</h3>
              <button
                ref={closeDialogButtonRef}
                type="button"
                onClick={() => setPendingGroup(null)}
                disabled={merging}
                aria-label="Close merge confirmation"
              >
                <X size={18} />
              </button>
            </div>
            <p>
              This will keep transaction{' '}
              <strong>{canonicalByGroup[pendingGroup.id] || pendingGroup.canonicalId}</strong>{' '}
              and merge {pendingGroup.transactionIds.length - 1} duplicate transaction
              {pendingGroup.transactionIds.length - 1 === 1 ? '' : 's'}. The merge will be
              recorded in the audit trail.
            </p>
            <div className="duplicate-dialog-actions">
              <button
                type="button"
                className="duplicate-secondary-button"
                onClick={() => setPendingGroup(null)}
                disabled={merging}
              >
                Cancel
              </button>
              <button
                type="button"
                className="duplicate-merge-button"
                onClick={() => void handleMerge()}
                disabled={merging}
              >
                {merging ? <Loader size={15} className="spinner" /> : <GitMerge size={15} />}
                {merging ? 'Merging...' : 'Confirm merge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default DuplicateReview
