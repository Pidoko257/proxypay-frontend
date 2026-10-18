import { format } from 'date-fns'
import type { FC } from 'react'
import { MousePointerClick } from 'lucide-react'
import { Transaction } from '../services/api'
import '../styles/TransactionRowPreview.css'

export const PREVIEW_DELAY_MS = 200
export const LONG_PRESS_DELAY_MS = 500

export interface TransactionPreviewPosition {
  top: number
  left: number
}

export interface TransactionRowPreviewProps {
  transaction: Transaction
  visible: boolean
  position: TransactionPreviewPosition
  id?: string
}

const displayDate = (timestamp: string): string => {
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? timestamp : format(date, 'PPpp')
}

const statusClass = (status: string): string =>
  `status-${status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

export const TransactionRowPreview: FC<TransactionRowPreviewProps> = ({
  transaction,
  visible,
  position,
  id = 'transaction-row-preview',
}) => {
  if (!visible) return null

  return (
    <div
      id={id}
      className="transaction-row-preview"
      role="tooltip"
      data-testid="transaction-row-preview"
      style={{ top: position.top, left: position.left }}
    >
      <div className="preview-header">
        <span className="preview-label">Transaction preview</span>
        <span className="preview-id">{transaction.id}</span>
      </div>
      <dl className="preview-details">
        <div>
          <dt>ID</dt>
          <dd>{transaction.id}</dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd>${transaction.amount.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`status-badge ${statusClass(transaction.status)}`}>
              {transaction.status}
            </span>
          </dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{displayDate(transaction.timestamp)}</dd>
        </div>
      </dl>
      <div className="preview-hint">
        <MousePointerClick size={14} aria-hidden="true" />
        <span>Click to open</span>
      </div>
    </div>
  )
}

export default TransactionRowPreview
