/**
 * ApiReference.tsx
 *
 * Enhancements in this file:
 *  - Issue #259: Comprehensive ARIA labels on all interactive elements
 *  - Issue #258: Endpoint card preview tooltip on hover (method, path, description, tags)
 *  - Issue #257: Request history timeline panel (chronological, grouped by period)
 */

import React, { useState, useCallback, useRef } from 'react';
import { RedocStandalone } from 'redoc';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistoryEntry {
  id: string;
  method: string;
  path: string;
  status: number;
  timestamp: Date;
  durationMs: number;
}

interface EndpointPreview {
  method: string;
  path: string;
  description: string;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a Date as HH:MM:SS for display in the timeline. */
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Return a human-readable group label (Today, Yesterday, or date string). */
function groupLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const entryDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (entryDay.getTime() === today.getTime()) return 'Today';
  if (entryDay.getTime() === yesterday.getTime()) return 'Yesterday';
  return entryDay.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Group history entries by day, keeping insertion order. */
function groupByDay(entries: HistoryEntry[]): Map<string, HistoryEntry[]> {
  const groups = new Map<string, HistoryEntry[]>();
  for (const entry of entries) {
    const label = groupLabel(entry.timestamp);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(entry);
  }
  return groups;
}

/** Map HTTP method name to a CSS class suffix used for colour-coding. */
function methodClass(method: string): string {
  return method.toUpperCase();
}

// ---------------------------------------------------------------------------
// Seed data — representative example entries for initial render
// ---------------------------------------------------------------------------
const SEED_HISTORY: HistoryEntry[] = [
  { id: '1', method: 'GET',    path: '/accounts',         status: 200, timestamp: new Date(Date.now() - 120_000),   durationMs: 142 },
  { id: '2', method: 'POST',   path: '/payments',         status: 201, timestamp: new Date(Date.now() - 300_000),   durationMs: 280 },
  { id: '3', method: 'GET',    path: '/payments/tx_001',  status: 200, timestamp: new Date(Date.now() - 600_000),   durationMs: 98  },
  { id: '4', method: 'DELETE', path: '/accounts/acc_42',  status: 204, timestamp: new Date(Date.now() - 86_700_000), durationMs: 55 },
  { id: '5', method: 'PUT',    path: '/accounts/acc_42',  status: 200, timestamp: new Date(Date.now() - 90_000_000), durationMs: 210 },
];

// ---------------------------------------------------------------------------
// EndpointPreviewTooltip — #258
// ---------------------------------------------------------------------------

interface TooltipProps {
  preview: EndpointPreview;
  anchorRef: React.RefObject<HTMLElement | null>;
  visible: boolean;
}

function EndpointPreviewTooltip({ preview, anchorRef, visible }: TooltipProps): React.JSX.Element | null {
  if (!visible) return null;

  return (
    <div
      className="endpoint-preview-tooltip"
      role="tooltip"
      aria-label={`Endpoint preview: ${preview.method} ${preview.path}`}
    >
      <div className="endpoint-preview-tooltip__header">
        <span
          className={`endpoint-preview-tooltip__method endpoint-preview-tooltip__method--${methodClass(preview.method)}`}
          aria-label={`HTTP method: ${preview.method}`}
        >
          {preview.method}
        </span>
        <code className="endpoint-preview-tooltip__path">{preview.path}</code>
      </div>

      {preview.description && (
        <p className="endpoint-preview-tooltip__description">{preview.description}</p>
      )}

      {preview.tags.length > 0 && (
        <ul className="endpoint-preview-tooltip__tags" aria-label="Tags">
          {preview.tags.map((tag) => (
            <li key={tag} className="endpoint-preview-tooltip__tag">
              {tag}
            </li>
          ))}
        </ul>
      )}

      <a
        className="endpoint-preview-tooltip__test-link"
        href="#api-reference"
        aria-label={`Test ${preview.method} ${preview.path} in the interactive reference`}
      >
        Test this endpoint ↗
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EndpointCard — #258 + #259
// ---------------------------------------------------------------------------

interface EndpointCardProps {
  preview: EndpointPreview;
}

function EndpointCard({ preview }: EndpointCardProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);
  const handleFocus     = useCallback(() => setHovered(true), []);
  const handleBlur      = useCallback(() => setHovered(false), []);

  const ariaLabel = `${preview.method} ${preview.path}${preview.description ? ': ' + preview.description : ''}`;

  return (
    <div
      ref={cardRef}
      className="endpoint-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      /* Make card focusable so keyboard users can trigger the tooltip */
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
      aria-describedby={`tooltip-${preview.path.replace(/\//g, '-').replace(/^-/, '')}`}
    >
      <span className={`endpoint-card__method endpoint-card__method--${methodClass(preview.method)}`}>
        {preview.method}
      </span>
      <span className="endpoint-card__path">{preview.path}</span>

      <EndpointPreviewTooltip
        preview={preview}
        anchorRef={cardRef}
        visible={hovered}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// RequestHistoryTimeline — #257
// ---------------------------------------------------------------------------

interface TimelineProps {
  history: HistoryEntry[];
  onEntryClick: (entry: HistoryEntry) => void;
  onClear: () => void;
}

function RequestHistoryTimeline({ history, onEntryClick, onClear }: TimelineProps): React.JSX.Element {
  const [zoom, setZoom] = useState<'hour' | 'day'>('hour');

  const grouped = groupByDay(history);

  return (
    /* aria-label turns this <section> into a named landmark */
    <section
      className="request-history-timeline"
      aria-label="Request history timeline"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      <div className="request-history-timeline__toolbar" role="toolbar" aria-label="Timeline controls">
        <h2 className="request-history-timeline__heading" id="timeline-heading">
          Request History
        </h2>

        {/* Zoom toggle — #257: "Zoom in/out timeline" */}
        <fieldset className="request-history-timeline__zoom" aria-label="Group requests by time period">
          <legend className="sr-only">Group by</legend>

          <label className="request-history-timeline__zoom-label">
            <input
              type="radio"
              name="timeline-zoom"
              value="hour"
              checked={zoom === 'hour'}
              onChange={() => setZoom('hour')}
              aria-label="Group by hour"
            />
            Hour
          </label>

          <label className="request-history-timeline__zoom-label">
            <input
              type="radio"
              name="timeline-zoom"
              value="day"
              checked={zoom === 'day'}
              onChange={() => setZoom('day')}
              aria-label="Group by day"
            />
            Day
          </label>
        </fieldset>

        <button
          type="button"
          className="request-history-timeline__clear-btn"
          onClick={onClear}
          aria-label="Clear all request history"
          disabled={history.length === 0}
        >
          Clear
        </button>
      </div>

      {history.length === 0 ? (
        <p className="request-history-timeline__empty" role="status" aria-live="polite">
          No requests yet. Send a request to see your history here.
        </p>
      ) : (
        /* Ordered list so the timeline reads chronologically for screen readers */
        <ol
          className="request-history-timeline__list"
          aria-labelledby="timeline-heading"
          aria-describedby="timeline-desc"
        >
          <li id="timeline-desc" className="sr-only">
            {history.length} request{history.length !== 1 ? 's' : ''} listed from most recent to oldest
          </li>

          {Array.from(grouped.entries()).map(([label, entries]) => (
            <li key={label} className="request-history-timeline__group">
              <h3 className="request-history-timeline__group-label" aria-label={`Requests from ${label}`}>
                {label}
              </h3>
              <ol className="request-history-timeline__group-entries" aria-label={`Requests from ${label}`}>
                {entries.map((entry) => (
                  <li key={entry.id} className="request-history-timeline__entry">
                    <button
                      type="button"
                      className={`request-history-timeline__entry-btn request-history-timeline__entry-btn--${entry.status < 400 ? 'success' : 'error'}`}
                      onClick={() => onEntryClick(entry)}
                      aria-label={`${entry.method} ${entry.path} — HTTP ${entry.status} — ${formatTime(entry.timestamp)} — ${entry.durationMs} ms`}
                    >
                      <span
                        className={`request-history-timeline__method request-history-timeline__method--${methodClass(entry.method)}`}
                        aria-hidden="true"
                      >
                        {entry.method}
                      </span>
                      <span className="request-history-timeline__path" aria-hidden="true">
                        {entry.path}
                      </span>
                      <span
                        className={`request-history-timeline__status ${entry.status < 400 ? 'request-history-timeline__status--ok' : 'request-history-timeline__status--err'}`}
                        aria-hidden="true"
                      >
                        {entry.status}
                      </span>
                      <time
                        className="request-history-timeline__time"
                        dateTime={entry.timestamp.toISOString()}
                        aria-hidden="true"
                      >
                        {formatTime(entry.timestamp)}
                      </time>
                      <span className="request-history-timeline__duration" aria-hidden="true">
                        {entry.durationMs} ms
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sample endpoints used to demonstrate #258 preview cards
// ---------------------------------------------------------------------------
const SAMPLE_ENDPOINTS: EndpointPreview[] = [
  { method: 'GET',    path: '/accounts',          description: 'List all accounts for the authenticated partner.',     tags: ['Accounts'] },
  { method: 'POST',   path: '/payments',           description: 'Initiate a new Mobile Money ↔ Stellar payment.',      tags: ['Payments'] },
  { method: 'GET',    path: '/payments/{id}',      description: 'Retrieve status and details of a specific payment.',  tags: ['Payments'] },
  { method: 'DELETE', path: '/accounts/{id}',      description: 'Close and deactivate an account.',                    tags: ['Accounts'] },
  { method: 'PUT',    path: '/accounts/{id}',      description: 'Update mutable fields on an account record.',         tags: ['Accounts'] },
];

// ---------------------------------------------------------------------------
// ApiReference — root component
// ---------------------------------------------------------------------------

export default function ApiReference(): React.JSX.Element {
  const [history, setHistory]         = useState<HistoryEntry[]>(SEED_HISTORY);
  const [selectedEntry, setSelected]  = useState<HistoryEntry | null>(null);
  const [statusMsg, setStatusMsg]     = useState<string>('');

  /** Announce status changes to the screen-reader live region. */
  const announce = useCallback((msg: string) => {
    setStatusMsg('');          // reset so the same message re-triggers
    requestAnimationFrame(() => setStatusMsg(msg));
  }, []);

  const handleEntryClick = useCallback((entry: HistoryEntry) => {
    setSelected(entry);
    announce(`Jumped to ${entry.method} ${entry.path} at ${formatTime(entry.timestamp)}`);
  }, [announce]);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    setSelected(null);
    announce('Request history cleared');
  }, [announce]);

  return (
    /* Outer wrapper is a named region so screen readers can skip to it */
    <div
      className="api-reference-wrapper"
      role="region"
      aria-label="ProxyPay API Reference"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Polite live region — #259: "Live regions for updates"               */}
      {/* ------------------------------------------------------------------ */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="api-status-announcer"
      >
        {statusMsg}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Endpoint Preview Cards — #258                                        */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="endpoint-cards-section"
        aria-label="Endpoint quick-reference cards"
      >
        <h2 className="endpoint-cards-section__heading">Endpoints</h2>
        <p className="endpoint-cards-section__hint" id="endpoint-cards-hint">
          Hover or focus a card to preview the endpoint.
        </p>
        <ul
          className="endpoint-cards-list"
          aria-label="API endpoint cards"
          aria-describedby="endpoint-cards-hint"
        >
          {SAMPLE_ENDPOINTS.map((ep) => (
            <li key={`${ep.method}-${ep.path}`}>
              <EndpointCard preview={ep} />
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Request History Timeline — #257                                      */}
      {/* ------------------------------------------------------------------ */}
      <RequestHistoryTimeline
        history={history}
        onEntryClick={handleEntryClick}
        onClear={handleClearHistory}
      />

      {/* Selected entry detail — announced via live region above */}
      {selectedEntry && (
        <section
          className="selected-entry-detail"
          aria-label={`Detail for ${selectedEntry.method} ${selectedEntry.path}`}
          aria-live="polite"
        >
          <h2 className="selected-entry-detail__heading">Selected Request</h2>
          <dl className="selected-entry-detail__list">
            <div className="selected-entry-detail__row">
              <dt>Method</dt>
              <dd aria-label={`Method: ${selectedEntry.method}`}>{selectedEntry.method}</dd>
            </div>
            <div className="selected-entry-detail__row">
              <dt>Path</dt>
              <dd aria-label={`Path: ${selectedEntry.path}`}>{selectedEntry.path}</dd>
            </div>
            <div className="selected-entry-detail__row">
              <dt>Status</dt>
              <dd aria-label={`Status: ${selectedEntry.status}`}>{selectedEntry.status}</dd>
            </div>
            <div className="selected-entry-detail__row">
              <dt>Time</dt>
              <dd>
                <time dateTime={selectedEntry.timestamp.toISOString()} aria-label={`Sent at ${formatTime(selectedEntry.timestamp)}`}>
                  {formatTime(selectedEntry.timestamp)}
                </time>
              </dd>
            </div>
            <div className="selected-entry-detail__row">
              <dt>Duration</dt>
              <dd aria-label={`Duration: ${selectedEntry.durationMs} milliseconds`}>{selectedEntry.durationMs} ms</dd>
            </div>
          </dl>
          <button
            type="button"
            className="selected-entry-detail__close-btn"
            onClick={() => { setSelected(null); announce('Detail panel closed'); }}
            aria-label="Close selected request detail panel"
          >
            Close
          </button>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Redoc full spec — #259: wrapped in a named region                   */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="api-reference"
        className="redoc-section"
        aria-label="Full OpenAPI specification rendered by Redoc"
      >
        <RedocStandalone
          specUrl="/openapi.yaml"
          options={{
            hideHostname: false,
            disableSearch: false,
            expandResponses: '200,201',
            requiredPropsFirst: true,
            sortPropsAlphabetically: true,
          }}
        />
      </section>
    </div>
  );
}
