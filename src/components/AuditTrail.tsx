import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './AuditTrail.module.css';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ActionType = 'created' | 'updated' | 'failed' | 'pending' | 'completed';

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  action: ActionType;
  description: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_EVENTS: AuditEvent[] = [
  {
    id: 'evt-001',
    timestamp: '2026-09-30T08:02:11Z',
    actorId: 'partner/acme-bank',
    action: 'created',
    description: 'New mobile money payment initiated for recipient +2348012345678.',
    after: {
      transactionId: 'TXN-9A3F2',
      amount: 5000,
      currency: 'NGN',
      status: 'pending',
    },
  },
  {
    id: 'evt-002',
    timestamp: '2026-09-30T08:03:45Z',
    actorId: 'system/bridge-engine',
    action: 'updated',
    description: 'Stellar anchor confirmed deposit. Transaction status promoted to processing.',
    before: {
      status: 'pending',
      stellarHash: null,
    },
    after: {
      status: 'processing',
      stellarHash: '8a3b1c...d9f2',
    },
  },
  {
    id: 'evt-003',
    timestamp: '2026-09-30T08:05:01Z',
    actorId: 'system/compliance-check',
    action: 'failed',
    description: 'AML screening flagged transaction TXN-9A3F2 for manual review. Threshold exceeded by 2×.',
    before: {
      status: 'processing',
      complianceScore: null,
    },
    after: {
      status: 'failed',
      complianceScore: 92,
      failureReason: 'AML_THRESHOLD_EXCEEDED',
    },
  },
  {
    id: 'evt-004',
    timestamp: '2026-09-30T08:15:33Z',
    actorId: 'admin/compliance-officer',
    action: 'updated',
    description: 'Manual review completed. Compliance officer approved the transaction after additional KYC verification.',
    before: {
      status: 'failed',
      manualReview: false,
    },
    after: {
      status: 'pending',
      manualReview: true,
      reviewedBy: 'compliance-officer@proxypay.io',
    },
  },
  {
    id: 'evt-005',
    timestamp: '2026-09-30T08:22:17Z',
    actorId: 'system/mobile-money-gateway',
    action: 'pending',
    description: 'Disbursement queued with MTN MoMo gateway. Awaiting confirmation callback.',
    before: {
      gatewayStatus: null,
      disbursementRef: null,
    },
    after: {
      gatewayStatus: 'queued',
      disbursementRef: 'MTN-REF-00291',
    },
  },
  {
    id: 'evt-006',
    timestamp: '2026-09-30T08:24:59Z',
    actorId: 'system/mobile-money-gateway',
    action: 'completed',
    description: 'MTN MoMo confirmed successful disbursement of ₦5,000 to +2348012345678. Transaction settled.',
    before: {
      status: 'pending',
      gatewayStatus: 'queued',
    },
    after: {
      status: 'completed',
      gatewayStatus: 'delivered',
      settledAt: '2026-09-30T08:24:59Z',
    },
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const ALL_FILTER = 'all' as const;
type FilterValue = ActionType | typeof ALL_FILTER;

const FILTER_OPTIONS: FilterValue[] = ['all', 'created', 'updated', 'failed', 'pending', 'completed'];

function badgeClass(action: ActionType): string {
  const map: Record<ActionType, string> = {
    created: styles.badgeCreated,
    updated: styles.badgeUpdated,
    failed: styles.badgeFailed,
    pending: styles.badgePending,
    completed: styles.badgeCompleted,
  };
  return map[action];
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return ts;
  }
}

// ── Sub-component: single event row ───────────────────────────────────────────

interface EventRowProps {
  event: AuditEvent;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  rowRef: React.RefObject<HTMLLIElement | null>;
}

function EventRow({ event, isExpanded, onToggle, rowRef }: EventRowProps): React.JSX.Element {
  const hasDiff = event.before !== undefined || event.after !== undefined;

  return (
    <li
      ref={rowRef}
      className={isExpanded ? styles.eventRowExpanded : styles.eventRow}
      data-event-id={event.id}
    >
      {/* Clickable header */}
      <button
        className={styles.eventHeader}
        onClick={() => onToggle(event.id)}
        aria-expanded={isExpanded}
        aria-controls={`audit-detail-${event.id}`}
      >
        <span className={styles.timestamp}>{formatTimestamp(event.timestamp)}</span>
        <span className={styles.actorId}>{event.actorId}</span>
        <span className={badgeClass(event.action)}>{event.action}</span>
        <span className={isExpanded ? styles.chevronOpen : styles.chevron} aria-hidden="true">
          ▼
        </span>
      </button>

      {/* Expandable detail panel */}
      <div
        id={`audit-detail-${event.id}`}
        className={isExpanded ? styles.detailPanelOpen : styles.detailPanel}
        role="region"
        aria-label={`Details for audit event ${event.id}`}
      >
        <div className={styles.detailInner}>
          <p className={styles.description}>{event.description}</p>

          {hasDiff && (
            <div className={styles.diffGrid}>
              {event.before !== undefined && (
                <div className={styles.diffBefore}>
                  <span className={styles.diffLabel}>Before</span>
                  <pre className={styles.diffValue}>{JSON.stringify(event.before, null, 2)}</pre>
                </div>
              )}
              {event.after !== undefined && (
                <div className={styles.diffAfter}>
                  <span className={styles.diffLabel}>After</span>
                  <pre className={styles.diffValue}>{JSON.stringify(event.after, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AuditTrail(): React.JSX.Element {
  const [activeFilter, setActiveFilter] = useState<FilterValue>(ALL_FILTER);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Ref map: event id → li ref for click-outside detection
  const rowRefs = useRef<Map<string, React.RefObject<HTMLLIElement | null>>>(new Map());

  // Ensure a ref exists for every event
  MOCK_EVENTS.forEach((e) => {
    if (!rowRefs.current.has(e.id)) {
      rowRefs.current.set(e.id, React.createRef<HTMLLIElement>());
    }
  });

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // Click-outside: collapse if user clicks outside the currently expanded row
  useEffect(() => {
    if (!expandedId) return;

    const handlePointerDown = (e: PointerEvent) => {
      const expandedRef = rowRefs.current.get(expandedId);
      if (expandedRef?.current && !expandedRef.current.contains(e.target as Node)) {
        setExpandedId(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [expandedId]);

  const filtered =
    activeFilter === ALL_FILTER
      ? MOCK_EVENTS
      : MOCK_EVENTS.filter((e) => e.action === activeFilter);

  return (
    <section className={styles.container} aria-label="Audit Trail">
      <h2 className={styles.title}>Audit Trail</h2>

      {/* Filter bar */}
      <div className={styles.filterBar} role="group" aria-label="Filter events by action type">
        {FILTER_OPTIONS.map((filter) => (
          <button
            key={filter}
            className={activeFilter === filter ? styles.filterBtnActive : styles.filterBtn}
            onClick={() => setActiveFilter(filter)}
            aria-pressed={activeFilter === filter}
          >
            {filter === ALL_FILTER ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Event list */}
      {filtered.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: '0.88rem' }}>No events match this filter.</p>
      ) : (
        <ul className={styles.eventList}>
          {filtered.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              isExpanded={expandedId === event.id}
              onToggle={handleToggle}
              rowRef={rowRefs.current.get(event.id) as React.RefObject<HTMLLIElement | null>}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
