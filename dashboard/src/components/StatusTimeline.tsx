import { useEffect, useMemo, useState } from 'react'
import type { FC } from 'react'
import { format } from 'date-fns'
import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Clock3,
  XCircle,
} from 'lucide-react'
import {
  StatusTransition,
  Transaction,
  TransactionStatus,
} from '../services/api'
import '../styles/StatusTimeline.css'

export type TimelineLayout = 'vertical' | 'horizontal'

export interface StatusTimelineProps {
  transaction?: Transaction | null
  transitions?: StatusTransition[]
  layout?: TimelineLayout
  currentStatus?: TransactionStatus
  onLayoutChange?: (layout: TimelineLayout) => void
  showLayoutToggle?: boolean
}

const statusFromEvent = (event: string): TransactionStatus | null => {
  const normalized = event.toLowerCase()
  if (normalized.includes('fail') || normalized.includes('reject')) {
    return 'failed'
  }
  if (normalized.includes('settle') || normalized.includes('complete')) {
    return 'settled'
  }
  if (normalized.includes('cancel') || normalized.includes('refund')) {
    return normalized.includes('refund') ? 'refunded' : 'cancelled'
  }
  if (normalized.includes('duplicate')) return 'duplicate'
  if (normalized.includes('process') || normalized.includes('pending')) {
    return 'processing'
  }
  return null
}

const normalizeTransition = (
  value: StatusTransition,
  fallbackStatus?: TransactionStatus
): StatusTransition => ({
  ...value,
  toStatus: value.toStatus || fallbackStatus || 'pending',
  actor: value.actor || 'System',
  reason: value.reason || value.details,
})

export const getStatusTransitions = (
  transaction: Transaction
): StatusTransition[] => {
  const explicitHistory =
    transaction.statusHistory && transaction.statusHistory.length > 0
      ? transaction.statusHistory
      : transaction.statusChanges || []
  const auditTrail = transaction.auditTrail || []

  if (explicitHistory.length > 0) {
    return explicitHistory
      .map((transition) => normalizeTransition(transition))
      .sort(
        (first, second) =>
          new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime()
      )
  }

  const explicitAuditTransitions = auditTrail.filter(
    (event) => event.toStatus || event.fromStatus || statusFromEvent(event.event)
  )

  if (explicitAuditTransitions.length > 0) {
    return explicitAuditTransitions
      .map((event) => ({
        timestamp: event.timestamp,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus || statusFromEvent(event.event) || transaction.status,
        actor: event.actor,
        reason: event.reason || event.details,
        details: event.details,
      }))
      .sort(
        (first, second) =>
          new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime()
      )
  }

  const inferred = auditTrail.flatMap((event) => {
    const toStatus = event.toStatus || (event.fromStatus ? transaction.status : statusFromEvent(event.event))
    return toStatus
      ? [
          {
            timestamp: event.timestamp,
            fromStatus: event.fromStatus,
            toStatus,
            actor: event.actor,
            reason: event.reason || event.details,
          },
        ]
      : []
  })

  if (inferred.length > 0) {
    return inferred.sort(
      (first, second) =>
        new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime()
    )
  }

  return [
    {
      timestamp: transaction.timestamp,
      fromStatus: null,
      toStatus: transaction.status,
      actor: 'System',
      reason: transaction.failureReason || 'Transaction created',
    },
  ]
}

export const inferStatusTransitions = getStatusTransitions
export const buildStatusTimeline = getStatusTransitions

const statusClass = (status: TransactionStatus): string =>
  `status-${status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return timestamp
  return format(date, 'PPpp')
}

const StatusIcon = ({ status }: { status: TransactionStatus }) => {
  const normalized = status.toLowerCase()
  const iconProps = { size: 18, 'aria-hidden': true } as const

  if (normalized === 'settled') {
    return <CheckCircle2 {...iconProps} />
  }
  if (normalized === 'failed') {
    return <XCircle {...iconProps} />
  }
  if (normalized === 'cancelled' || normalized === 'refunded') {
    return <AlertCircle {...iconProps} />
  }
  if (normalized === 'pending' || normalized === 'processing') {
    return <Clock3 {...iconProps} />
  }
  return <CircleDot {...iconProps} />
}

export const StatusTimeline: FC<StatusTimelineProps> = ({
  transaction,
  transitions,
  layout = 'vertical',
  currentStatus,
  onLayoutChange,
  showLayoutToggle = true,
}) => {
  const [activeLayout, setActiveLayout] = useState<TimelineLayout>(layout)
  const source = useMemo(
    () =>
      transitions ||
      (transaction ? getStatusTransitions(transaction) : []),
    [transaction, transitions]
  )
  const timeline = useMemo(() => {
    const normalized = source
      .map((transition) => normalizeTransition(transition, currentStatus))
      .sort(
        (first, second) =>
          new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime()
      )

    const lastStatus = normalized[normalized.length - 1]?.toStatus
    if (currentStatus && lastStatus !== currentStatus) {
      normalized.push({
        timestamp:
          transaction?.settledAt || transaction?.timestamp || new Date().toISOString(),
        fromStatus: lastStatus || null,
        toStatus: currentStatus,
        actor: 'System',
        reason: 'Current status',
      })
    }
    return normalized
  }, [currentStatus, source, transaction])

  useEffect(() => {
    setActiveLayout(layout)
  }, [layout])

  const changeLayout = (nextLayout: TimelineLayout) => {
    setActiveLayout(nextLayout)
    onLayoutChange?.(nextLayout)
  }

  return (
    <section className="status-timeline-section" aria-labelledby="status-timeline-heading">
      <div className="status-timeline-heading-row">
        <h3 id="status-timeline-heading">Status Timeline</h3>
        {showLayoutToggle && (
          <div className="timeline-layout-toggle" aria-label="Timeline layout">
            <button
              type="button"
              className={activeLayout === 'vertical' ? 'active' : ''}
              aria-pressed={activeLayout === 'vertical'}
              onClick={() => changeLayout('vertical')}
            >
              Vertical
            </button>
            <button
              type="button"
              className={activeLayout === 'horizontal' ? 'active' : ''}
              aria-pressed={activeLayout === 'horizontal'}
              onClick={() => changeLayout('horizontal')}
            >
              Horizontal
            </button>
          </div>
        )}
      </div>

      {timeline.length === 0 ? (
        <p className="no-data">No status transitions recorded</p>
      ) : (
        <ol
          className={`status-timeline status-timeline-${activeLayout}`}
          aria-label="Transaction status transitions"
        >
          {timeline.map((transition, index) => {
            const key = transition.id || `${transition.timestamp}-${index}`
            return (
              <li
                key={key}
                className={`status-timeline-item ${statusClass(transition.toStatus)}`}
                data-status={transition.toStatus}
              >
                <div className="status-timeline-marker">
                  <StatusIcon status={transition.toStatus} />
                </div>
                <div className="status-timeline-content">
                  <div className="status-timeline-title">
                    <span className="status-transition-label">
                      {transition.fromStatus
                        ? `${transition.fromStatus} → ${transition.toStatus}`
                        : transition.toStatus}
                    </span>
                    <time dateTime={transition.timestamp}>
                      {formatTimestamp(transition.timestamp)}
                    </time>
                  </div>
                  <div className="status-timeline-actor">
                    Changed by {transition.actor || 'System'}
                  </div>
                  {(transition.reason || transition.details) && (
                    <div className="status-timeline-reason">
                      {transition.reason || transition.details}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export default StatusTimeline
