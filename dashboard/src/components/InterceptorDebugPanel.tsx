/**
 * InterceptorDebugPanel — Issue #597
 *
 * Debug panel that renders the full request/response log captured by the Axios
 * interceptors. Supports:
 *  • Filter by endpoint (substring) and HTTP method
 *  • Export the visible log as a JSON file
 *  • Purge entries older than 24 h
 *  • Clear all entries
 *  • Collapsible per-entry detail view
 */

import React, { useState, useMemo } from 'react'
import { useInterceptorLogStore, RequestLogEntry } from '../stores/interceptorLogStore'
import '../styles/InterceptorDebugPanel.css'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  pending: '⏳',
  success: '✓',
  error: '✕',
}

function formatDuration(ms?: number): string {
  if (ms === undefined) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function downloadJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Entry Row ────────────────────────────────────────────────────────────────

const EntryRow: React.FC<{ entry: RequestLogEntry }> = ({ entry }) => {
  const [expanded, setExpanded] = useState(false)

  const statusClass =
    entry.status === 'success'
      ? 'idp-status-success'
      : entry.status === 'error'
      ? 'idp-status-error'
      : 'idp-status-pending'

  return (
    <div className={`idp-entry ${statusClass}`}>
      <button
        className="idp-entry-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="idp-entry-icon" aria-hidden="true">
          {STATUS_BADGE[entry.status]}
        </span>
        <span className={`idp-method idp-method-${entry.method.toLowerCase()}`}>
          {entry.method}
        </span>
        <span className="idp-url">{entry.url}</span>
        {entry.statusCode !== undefined && (
          <span className="idp-code">{entry.statusCode}</span>
        )}
        <span className="idp-duration">{formatDuration(entry.durationMs)}</span>
        <span className="idp-time">
          {new Date(entry.requestedAt).toLocaleTimeString()}
        </span>
        {entry.deduplicated && (
          <span className="idp-badge idp-badge-dedup" title="Deduplicated — not sent">
            DEDUP
          </span>
        )}
        {entry.retryAttempt !== undefined && (
          <span className="idp-badge idp-badge-retry" title={`Retry attempt ${entry.retryAttempt}`}>
            RETRY {entry.retryAttempt}
          </span>
        )}
        <span className="idp-chevron" aria-hidden="true">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="idp-entry-body">
          {Object.keys(entry.params ?? {}).length > 0 && (
            <section>
              <h4>Query Params</h4>
              <pre>{JSON.stringify(entry.params, null, 2)}</pre>
            </section>
          )}
          <section>
            <h4>Request Headers</h4>
            <pre>{JSON.stringify(entry.requestHeaders, null, 2)}</pre>
          </section>
          {entry.responseHeaders && (
            <section>
              <h4>Response Headers</h4>
              <pre>{JSON.stringify(entry.responseHeaders, null, 2)}</pre>
            </section>
          )}
          {entry.errorMessage && (
            <section>
              <h4>Error</h4>
              <pre className="idp-error-text">{entry.errorMessage}</pre>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export const InterceptorDebugPanel: React.FC = () => {
  const { entries, purgeOldEntries, clearAll, exportLogs } = useInterceptorLogStore()

  const [endpointFilter, setEndpointFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')

  const visible = useMemo(() => {
    let result = entries
    if (methodFilter) {
      result = result.filter((e) => e.method === methodFilter)
    }
    if (endpointFilter.trim()) {
      const term = endpointFilter.toLowerCase()
      result = result.filter((e) => e.url.toLowerCase().includes(term))
    }
    return result
  }, [entries, endpointFilter, methodFilter])

  const handleExport = () => {
    const json = exportLogs({
      endpoint: endpointFilter || undefined,
      method: methodFilter || undefined,
    })
    const filename = `proxypay-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
    downloadJson(json, filename)
  }

  const successCount = visible.filter((e) => e.status === 'success').length
  const errorCount = visible.filter((e) => e.status === 'error').length
  const pendingCount = visible.filter((e) => e.status === 'pending').length
  const dedupCount = visible.filter((e) => e.deduplicated).length

  return (
    <section className="idp-panel" aria-label="Request/Response Debug Panel">
      <div className="idp-toolbar">
        <h3 className="idp-title">🔍 Request / Response Log</h3>

        {/* Filters */}
        <div className="idp-filters">
          <label className="idp-label" htmlFor="idp-endpoint-filter">
            Endpoint
          </label>
          <input
            id="idp-endpoint-filter"
            className="idp-input"
            type="search"
            placeholder="Filter by URL…"
            value={endpointFilter}
            onChange={(e) => setEndpointFilter(e.target.value)}
            aria-label="Filter logs by endpoint"
          />

          <label className="idp-label" htmlFor="idp-method-filter">
            Method
          </label>
          <select
            id="idp-method-filter"
            className="idp-select"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            aria-label="Filter logs by HTTP method"
          >
            <option value="">All methods</option>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="idp-actions">
          <button
            className="idp-btn idp-btn-secondary"
            onClick={handleExport}
            disabled={visible.length === 0}
            title="Download visible logs as JSON"
          >
            ⬇ Export
          </button>
          <button
            className="idp-btn idp-btn-secondary"
            onClick={purgeOldEntries}
            title="Remove logs older than 24 hours"
          >
            🧹 Purge Old
          </button>
          <button
            className="idp-btn idp-btn-danger"
            onClick={clearAll}
            title="Clear all logs"
          >
            🗑 Clear All
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="idp-stats" role="status" aria-live="polite">
        <span className="idp-stat idp-stat-total">{visible.length} entries</span>
        <span className="idp-stat idp-stat-success">{successCount} ok</span>
        <span className="idp-stat idp-stat-error">{errorCount} errors</span>
        {pendingCount > 0 && (
          <span className="idp-stat idp-stat-pending">{pendingCount} in-flight</span>
        )}
        {dedupCount > 0 && (
          <span className="idp-stat idp-stat-dedup">{dedupCount} deduped</span>
        )}
      </div>

      {/* Log list */}
      <div className="idp-list" role="list" aria-label="Request log entries">
        {visible.length === 0 ? (
          <p className="idp-empty">No log entries match the current filter.</p>
        ) : (
          visible.map((entry) => <EntryRow key={entry.id} entry={entry} />)
        )}
      </div>
    </section>
  )
}

export default InterceptorDebugPanel
