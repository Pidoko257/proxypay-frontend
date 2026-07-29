import React, { useEffect } from 'react'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import { Transaction } from '../services/api'
import '../styles/TransactionDrawer.css'

interface TransactionDrawerProps {
  transaction: Transaction | null
  isOpen: boolean
  onClose: () => void
}

export const TransactionDrawer: React.FC<TransactionDrawerProps> = ({
  transaction,
  isOpen,
  onClose,
}) => {
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

  if (!transaction) return null

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      )}

      {/* Drawer */}
      <div className={`transaction-drawer ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="drawer-header">
          <h2>Transaction Details</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="drawer-content">
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
            <h3>Blockchain & Mobile Money</h3>
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
            <h3>Amount & Fees</h3>
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
        </div>
      </div>
    </>
  )
}
