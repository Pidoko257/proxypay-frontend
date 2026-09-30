import React, { useEffect } from 'react'
import { format } from 'date-fns'
import { ExternalLink, Printer, X } from 'lucide-react'
import { Transaction } from '../services/api'
import { printTransactionReceipt } from '../services/print'
import '../styles/TransactionDrawer.css'

interface TransactionDrawerProps {
  transaction: Transaction | null
  isOpen: boolean
  loading: boolean
  error: string | null
  onClose: () => void
  fullPage?: boolean
  onOpenFullPage?: () => void
}

export const TransactionDrawer: React.FC<TransactionDrawerProps> = ({
  transaction,
  isOpen,
  loading,
  error,
  onClose,
  fullPage = false,
  onOpenFullPage,
}) => {
  const handlePrint = () => {
    if (window.confirm('Open the print dialog for this transaction?')) {
      window.print()
    }
  }

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!transaction) return null

  const handlePrintReceipt = () => {
    try {
      printTransactionReceipt(transaction)
    } catch (error) {
      console.error('Receipt generation failed:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate receipt')
    }
  }

  return (
    <>
      {/* Overlay — rendered before drawer in DOM; use .visible class instead of
          the broken `~ sibling` combinator which would require overlay after drawer */}
      <div
        className={`drawer-overlay${isOpen ? ' visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`transaction-drawer ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Transaction Details"
      >
        {/* Fixed Header — always visible */}
        <header className="drawer-header">
          <h2>Transaction Details</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={24} />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="drawer-content">
          {loading ? (
            <TransactionDetailSkeleton />
          ) : error ? (
            <div className="drawer-error" role="alert">
              {error}
            </div>
          ) : (
            <>
          {/* Basic Info */}
          <section className="detail-section">
            <h3>Basic Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Transaction ID</label>
                <code className="monospace">{transaction.id}</code>
              </div>
              <div className="detail-item">
                <label>Reference</label>
                <p>{transaction.reference}</p>
              </div>
              <div className="detail-item">
                <label>Status</label>
                <span className={`status-badge status-${transaction.status}`}>
                  {transaction.status}
                </span>
              </div>
              <div className="detail-item">
                <label>Provider</label>
                <p>{transaction.provider.toUpperCase()}</p>
              </div>
            </div>
          </section>

          {/* Blockchain Info */}
          <section className="detail-section">
            <h3>Blockchain &amp; Mobile Money</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Stellar Transaction Hash</label>
                <code className="monospace stellar-hash">
                  {transaction.stellarHash}
                </code>
              </div>
              <div className="detail-item">
                <label>Mobile Money Reference</label>
                <code className="monospace">{transaction.mobileMoneyReference}</code>
              </div>
            </div>
          </section>

          {/* Amount & Fees */}
          <section className="detail-section">
            <h3>Amount &amp; Fees</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Amount</label>
                <p className="amount-highlight">
                  ${transaction.amount.toFixed(2)}
                </p>
              </div>
              <div className="detail-item">
                <label>Total Fee</label>
                <p>${transaction.fee.toFixed(2)}</p>
              </div>
            </div>

            {/* Fee Breakdown */}
            <div className="fee-breakdown">
              <h4>Fee Breakdown</h4>
              <div className="breakdown-items">
                <div className="breakdown-item">
                  <span>Platform Fee</span>
                  <span>${transaction.feeBreakdown.platformFee.toFixed(2)}</span>
                </div>
                <div className="breakdown-item">
                  <span>Network Fee</span>
                  <span>${transaction.feeBreakdown.networkFee.toFixed(2)}</span>
                </div>
                <div className="breakdown-item">
                  <span>Provider Fee</span>
                  <span>${transaction.feeBreakdown.providerFee.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Timestamps */}
          <section className="detail-section">
            <h3>Timestamps</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Created</label>
                <p>{format(new Date(transaction.timestamp), 'PPpp')}</p>
              </div>
              {transaction.settledAt && (
                <div className="detail-item">
                  <label>Settled</label>
                  <p>{format(new Date(transaction.settledAt), 'PPpp')}</p>
                </div>
              )}
            </div>
          </section>

          <StatusTimeline
            transaction={transaction}
            currentStatus={transaction.status}
          />

          {/* Failure Reason */}
          {transaction.failureReason && (
            <section className="detail-section error-section">
              <h3>Failure Reason</h3>
              <p className="error-text">{transaction.failureReason}</p>
            </section>
          )}

          {/* Audit Trail */}
          <section className="detail-section">
            <h3>Audit Trail</h3>
            <div className="audit-timeline">
              {transaction.auditTrail.length === 0 ? (
                <p className="no-data">No audit events recorded</p>
              ) : (
                transaction.auditTrail.map((event, idx) => (
                  <div key={idx} className="audit-event">
                    <div className="event-time">
                      {format(new Date(event.timestamp), 'PPpp')}
                    </div>
                    <div className="event-content">
                      <div className="event-title">{event.event}</div>
                      <div className="event-details">{event.details}</div>
                      <div className="event-actor">By: {event.actor}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
            </>
          )}
        </div>

        {/* Fixed Footer — action buttons always accessible */}
        <footer className="drawer-footer">
          <button
            className="close-footer-button"
            onClick={onClose}
            aria-label="Close transaction details"
          >
            Close
          </button>
        </footer>
      </div>
    </>
  )
}

const TransactionDetailSkeleton: React.FC = () => (
  <div className="transaction-detail-skeleton" aria-label="Loading transaction details">
    {['Basic Information', 'Blockchain & Mobile Money', 'Amount & Fees', 'Timestamps', 'Audit Trail'].map(
      (section) => (
        <section className="detail-section" key={section}>
          <div className="skeleton-block skeleton-heading" />
          <div className="skeleton-block skeleton-line" />
          <div className="skeleton-block skeleton-line skeleton-line-short" />
          {section === 'Audit Trail' && (
            <>
              <div className="skeleton-block skeleton-line" />
              <div className="skeleton-block skeleton-line skeleton-line-short" />
            </>
          )}
        </section>
      )
    )}
  </div>
)
