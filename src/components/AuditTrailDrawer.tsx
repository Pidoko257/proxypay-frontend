import React, { useState, useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';
import BrowserOnly from '@docusaurus/BrowserOnly';

// ---------- types ----------

export type AuditEventType = 'created' | 'updated' | 'failed' | 'deleted' | 'approved' | 'rejected';

export interface AuditStateChange {
  field: string;
  before: string | number | boolean | null;
  after: string | number | boolean | null;
}

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  timestamp: string;        // ISO 8601
  actorId: string;
  actorName?: string;
  action: string;           // Short label
  description: string;      // Full description
  changes?: AuditStateChange[];
  metadata?: Record<string, string | number | boolean>;
}

export interface AuditTrailDrawerProps {
  /** Whether the drawer is visible */
  open: boolean;
  /** Called when the drawer should close */
  onClose: () => void;
  /** Audit events to display */
  events: AuditEvent[];
  /** Optional title shown in the drawer header */
  title?: string;
}

// ---------- helpers ----------

const EVENT_TYPE_LABELS: Record<AuditEventType, string> = {
  created: 'Created',
  updated: 'Updated',
  failed: 'Failed',
  deleted: 'Deleted',
  approved: 'Approved',
  rejected: 'Rejected',
};

const ALL_FILTER = 'all';
type FilterValue = AuditEventType | typeof ALL_FILTER;

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ---------- sub-components ----------

interface AuditEventItemProps {
  event: AuditEvent;
}

function AuditEventItem({ event }: AuditEventItemProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  // Click-outside collapses this specific item
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  const hasDetails = event.description || (event.changes && event.changes.length > 0) || event.metadata;

  return (
    <div
      ref={itemRef}
      className={clsx('audit-event', `audit-event--${event.type}`, { 'audit-event--expanded': expanded })}
    >
      {/* Summary row — always visible */}
      <button
        className="audit-event-header"
        onClick={() => setExpanded(prev => !prev)}
        aria-expanded={expanded}
        aria-controls={`audit-details-${event.id}`}
        disabled={!hasDetails}
      >
        <span className={clsx('audit-event-badge', `audit-event-badge--${event.type}`)}>
          {EVENT_TYPE_LABELS[event.type]}
        </span>
        <span className="audit-event-action">{event.action}</span>
        <span className="audit-event-time">{formatTimestamp(event.timestamp)}</span>
        {hasDetails && (
          <span className="audit-event-chevron" aria-hidden="true">
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </button>

      {/* Expandable detail panel */}
      <div
        id={`audit-details-${event.id}`}
        className={clsx('audit-event-details', { 'audit-event-details--visible': expanded })}
        aria-hidden={!expanded}
        role="region"
      >
        <div className="audit-event-details-inner">
          <div className="audit-detail-row">
            <span className="audit-detail-key">Timestamp</span>
            <span className="audit-detail-value">
              <time dateTime={event.timestamp}>{formatTimestamp(event.timestamp)}</time>
            </span>
          </div>
          <div className="audit-detail-row">
            <span className="audit-detail-key">Actor ID</span>
            <span className="audit-detail-value audit-detail-value--mono">{event.actorId}</span>
          </div>
          {event.actorName && (
            <div className="audit-detail-row">
              <span className="audit-detail-key">Actor</span>
              <span className="audit-detail-value">{event.actorName}</span>
            </div>
          )}
          {event.description && (
            <div className="audit-detail-row audit-detail-row--block">
              <span className="audit-detail-key">Description</span>
              <p className="audit-detail-description">{event.description}</p>
            </div>
          )}

          {/* Before / After state changes */}
          {event.changes && event.changes.length > 0 && (
            <div className="audit-changes">
              <span className="audit-changes-title">State Changes</span>
              <table className="audit-changes-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Before</th>
                    <th>After</th>
                  </tr>
                </thead>
                <tbody>
                  {event.changes.map(change => (
                    <tr key={change.field}>
                      <td className="audit-changes-field">{change.field}</td>
                      <td className="audit-changes-before">
                        {change.before == null ? <em>—</em> : String(change.before)}
                      </td>
                      <td className="audit-changes-after">
                        {change.after == null ? <em>—</em> : String(change.after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Extra metadata */}
          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <div className="audit-metadata">
              <span className="audit-changes-title">Metadata</span>
              {Object.entries(event.metadata).map(([k, v]) => (
                <div key={k} className="audit-detail-row">
                  <span className="audit-detail-key">{k}</span>
                  <span className="audit-detail-value audit-detail-value--mono">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- main drawer (browser-only inner) ----------

function AuditTrailDrawerInner({ open, onClose, events, title = 'Audit Trail' }: AuditTrailDrawerProps) {
  const [filter, setFilter] = useState<FilterValue>(ALL_FILTER);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Trap focus / ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  // Derive available filter options from the supplied events
  const presentTypes = Array.from(new Set(events.map(ev => ev.type))) as AuditEventType[];

  const filtered = filter === ALL_FILTER ? events : events.filter(ev => ev.type === filter);

  return (
    <div
      className={clsx('audit-backdrop', { 'audit-backdrop--visible': open })}
      aria-hidden={!open}
      onClick={handleBackdropClick}
    >
      <div
        ref={drawerRef}
        className={clsx('audit-drawer', { 'audit-drawer--open': open })}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Drawer header */}
        <div className="audit-drawer-header">
          <h2 className="audit-drawer-title">{title}</h2>
          <button
            className="audit-drawer-close"
            onClick={onClose}
            aria-label="Close audit trail"
          >
            ✕
          </button>
        </div>

        {/* Filter bar */}
        {presentTypes.length > 1 && (
          <div className="audit-filter-bar" role="toolbar" aria-label="Filter audit events">
            <button
              className={clsx('audit-filter-chip', { 'audit-filter-chip--active': filter === ALL_FILTER })}
              onClick={() => setFilter(ALL_FILTER)}
            >
              All ({events.length})
            </button>
            {presentTypes.map(type => (
              <button
                key={type}
                className={clsx('audit-filter-chip', `audit-filter-chip--${type}`, {
                  'audit-filter-chip--active': filter === type,
                })}
                onClick={() => setFilter(type)}
              >
                {EVENT_TYPE_LABELS[type]} ({events.filter(ev => ev.type === type).length})
              </button>
            ))}
          </div>
        )}

        {/* Event list */}
        <div className="audit-event-list" role="list">
          {filtered.length === 0 ? (
            <p className="audit-empty">No events match the selected filter.</p>
          ) : (
            filtered.map(event => <AuditEventItem key={event.id} event={event} />)
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- public component ----------

export default function AuditTrailDrawer(props: AuditTrailDrawerProps): React.JSX.Element {
  return (
    <BrowserOnly fallback={null}>
      {() => <AuditTrailDrawerInner {...props} />}
    </BrowserOnly>
  );
}
