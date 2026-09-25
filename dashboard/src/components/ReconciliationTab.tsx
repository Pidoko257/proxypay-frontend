import React, { useRef, useCallback } from 'react'
import { format } from 'date-fns'
import { Upload, CheckCircle, XCircle, AlertTriangle, Download, Trash2, Filter } from 'lucide-react'
import { useReconciliationStore, ReconciliationFilter, ReconciliationResult, reconcileRecords } from '../stores/reconciliationStore'
import { useTransactionStore } from '../stores/transactionStore'
import { CSVExporter } from '../services/csv'
import '../styles/ReconciliationTab.css'

// ─── Summary card ────────────────────────────────────────────────────────────

const SummaryCard: React.FC<{
  label: string
  count: number
  variant: 'success' | 'danger' | 'warning' | 'info'
  icon: React.ReactNode
  active: boolean
  onClick: () => void
}> = ({ label, count, variant, icon, active, onClick }) => (
  <button
    className={`recon-summary-card recon-card-${variant}${active ? ' recon-card-active' : ''}`}
    onClick={onClick}
    aria-pressed={active}
  >
    <span className="recon-card-icon">{icon}</span>
    <span className="recon-card-count">{count}</span>
    <span className="recon-card-label">{label}</span>
  </button>
)

// ─── Status badge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: ReconciliationResult['status'] }> = ({ status }) => {
  const map: Record<ReconciliationResult['status'], { label: string; cls: string }> = {
    matched: { label: 'Matched', cls: 'recon-status-matched' },
    discrepancy: { label: 'Discrepancy', cls: 'recon-status-discrepancy' },
    unmatched_external: { label: 'External Only', cls: 'recon-status-external' },
    unmatched_dashboard: { label: 'Dashboard Only', cls: 'recon-status-dashboard' },
  }
  const { label, cls } = map[status]
  return <span className={`recon-status-badge ${cls}`}>{label}</span>
}

// ─── Results table ────────────────────────────────────────────────────────────

const ResultsTable: React.FC<{ results: ReconciliationResult[] }> = ({ results }) => {
  if (results.length === 0) {
    return (
      <div className="recon-empty">
        <p>No results match the selected filter.</p>
      </div>
    )
  }

  return (
    <div className="recon-table-wrapper">
      <table className="recon-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>External Amount</th>
            <th>Dashboard Amount</th>
            <th>External Status</th>
            <th>Dashboard Status</th>
            <th>Date</th>
            <th>Result</th>
            <th>Discrepancies</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.id} className={`recon-row recon-row-${r.status}`}>
              <td className="recon-ref">
                {r.externalRecord?.reference ?? r.dashboardTransaction?.reference ?? '—'}
              </td>
              <td>
                {r.externalRecord != null
                  ? `$${r.externalRecord.amount.toFixed(2)}`
                  : '—'}
              </td>
              <td>
                {r.dashboardTransaction != null
                  ? `$${r.dashboardTransaction.amount.toFixed(2)}`
                  : '—'}
              </td>
              <td>{r.externalRecord?.status || '—'}</td>
              <td>
                {r.dashboardTransaction ? (
                  <span className={`status-badge status-${r.dashboardTransaction.status}`}>
                    {r.dashboardTransaction.status}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td>
                {r.externalRecord?.date
                  ? r.externalRecord.date
                  : r.dashboardTransaction?.timestamp
                  ? format(new Date(r.dashboardTransaction.timestamp), 'MMM dd, yyyy')
                  : '—'}
              </td>
              <td>
                <StatusBadge status={r.status} />
              </td>
              <td className="recon-discrepancies">
                {r.discrepancies.length > 0 ? (
                  <ul>
                    {r.discrepancies.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="recon-ok">✓</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export const ReconciliationTab: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    fileName,
    parseResult,
    isUploading,
    results,
    activeFilter,
    uploadFile,
    runReconciliation,
    setFilter,
    reset,
  } = useReconciliationStore()

  const { transactions } = useTransactionStore()

  // ── Upload handlers ──
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      await uploadFile(file)
      // reset file input so the same file can be re-uploaded if needed
      e.target.value = ''
    },
    [uploadFile]
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) await uploadFile(file)
    },
    [uploadFile]
  )

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault()

  const handleCompare = () => runReconciliation(transactions)

  // ── Export ──
  const handleExport = () => {
    if (results.length === 0) return

    const headers = [
      'Reference',
      'External Amount',
      'Dashboard Amount',
      'External Status',
      'Dashboard Status',
      'Date',
      'Result',
      'Discrepancies',
    ]

    const escape = (v: string) =>
      v.includes(',') || v.includes('"') || v.includes('\n')
        ? `"${v.replace(/"/g, '""')}"`
        : v

    const rows = results.map((r) =>
      [
        r.externalRecord?.reference ?? r.dashboardTransaction?.reference ?? '',
        r.externalRecord != null ? r.externalRecord.amount.toFixed(2) : '',
        r.dashboardTransaction != null ? r.dashboardTransaction.amount.toFixed(2) : '',
        r.externalRecord?.status ?? '',
        r.dashboardTransaction?.status ?? '',
        r.externalRecord?.date ??
          (r.dashboardTransaction?.timestamp
            ? format(new Date(r.dashboardTransaction.timestamp), 'MMM dd, yyyy')
            : ''),
        r.status,
        r.discrepancies.join('; '),
      ]
        .map(escape)
        .join(',')
    )

    const csv = [headers.join(','), ...rows].join('\n')
    const filename = CSVExporter.generateFilename('reconciliation')
    CSVExporter.downloadCSV(csv, filename)
  }

  // ── Derived counts ──
  const counts = {
    matched: results.filter((r) => r.status === 'matched').length,
    discrepancy: results.filter((r) => r.status === 'discrepancy').length,
    unmatched_external: results.filter((r) => r.status === 'unmatched_external').length,
    unmatched_dashboard: results.filter((r) => r.status === 'unmatched_dashboard').length,
  }

  const visibleResults =
    activeFilter === 'all' ? results : results.filter((r) => r.status === activeFilter)

  const hasResults = results.length > 0

  const FILTERS: { value: ReconciliationFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'matched', label: 'Matched' },
    { value: 'discrepancy', label: 'Discrepancy' },
    { value: 'unmatched_external', label: 'External Only' },
    { value: 'unmatched_dashboard', label: 'Dashboard Only' },
  ]

  return (
    <div className="recon-tab">
      {/* ── Page header ── */}
      <div className="recon-page-header">
        <div>
          <h2>Reconciliation</h2>
          <p className="recon-subtitle">
            Upload an external CSV to compare against dashboard transactions
          </p>
        </div>
        {hasResults && (
          <div className="recon-header-actions">
            <button className="recon-btn recon-btn-outline" onClick={reset}>
              <Trash2 size={16} /> Start Over
            </button>
            <button className="recon-btn recon-btn-primary" onClick={handleExport}>
              <Download size={16} /> Export Report
            </button>
          </div>
        )}
      </div>

      {/* ── Upload area ── */}
      {!hasResults && (
        <section className="recon-upload-section">
          <div
            className={`recon-dropzone${isUploading ? ' recon-dropzone-loading' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload CSV file"
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="recon-file-input"
              onChange={handleFileChange}
              aria-hidden="true"
            />
            {isUploading ? (
              <div className="recon-uploading">
                <div className="recon-spinner" />
                <p>Parsing file…</p>
              </div>
            ) : (
              <>
                <Upload size={40} className="recon-upload-icon" />
                <p className="recon-drop-title">Drop your CSV file here</p>
                <p className="recon-drop-hint">
                  or <span className="recon-link">browse files</span>
                </p>
                <p className="recon-drop-note">
                  Expected columns: <code>reference</code>, <code>amount</code>
                  &nbsp;(optional: <code>status</code>, <code>date</code>)
                </p>
              </>
            )}
          </div>

          {/* File parsed but not yet compared */}
          {parseResult && !hasResults && (
            <div className="recon-file-info">
              <div className="recon-file-meta">
                <CheckCircle size={18} className="recon-icon-success" />
                <span>
                  <strong>{fileName}</strong> — {parseResult.records.length} record
                  {parseResult.records.length !== 1 ? 's' : ''} loaded
                </span>
              </div>

              {parseResult.errors.length > 0 && (
                <div className="recon-parse-errors">
                  <AlertTriangle size={16} />
                  <ul>
                    {parseResult.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="recon-compare-row">
                <span className="recon-compare-info">
                  Will compare against <strong>{transactions.length}</strong> dashboard
                  transaction{transactions.length !== 1 ? 's' : ''}
                </span>
                <button
                  className="recon-btn recon-btn-primary"
                  onClick={handleCompare}
                  disabled={parseResult.records.length === 0}
                >
                  Run Comparison
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Results ── */}
      {hasResults && (
        <>
          {/* Summary cards (act as filter buttons) */}
          <div className="recon-summary-row">
            <SummaryCard
              label="Matched"
              count={counts.matched}
              variant="success"
              icon={<CheckCircle size={22} />}
              active={activeFilter === 'matched'}
              onClick={() => setFilter(activeFilter === 'matched' ? 'all' : 'matched')}
            />
            <SummaryCard
              label="Discrepancies"
              count={counts.discrepancy}
              variant="warning"
              icon={<AlertTriangle size={22} />}
              active={activeFilter === 'discrepancy'}
              onClick={() => setFilter(activeFilter === 'discrepancy' ? 'all' : 'discrepancy')}
            />
            <SummaryCard
              label="External Only"
              count={counts.unmatched_external}
              variant="danger"
              icon={<XCircle size={22} />}
              active={activeFilter === 'unmatched_external'}
              onClick={() =>
                setFilter(activeFilter === 'unmatched_external' ? 'all' : 'unmatched_external')
              }
            />
            <SummaryCard
              label="Dashboard Only"
              count={counts.unmatched_dashboard}
              variant="info"
              icon={<XCircle size={22} />}
              active={activeFilter === 'unmatched_dashboard'}
              onClick={() =>
                setFilter(activeFilter === 'unmatched_dashboard' ? 'all' : 'unmatched_dashboard')
              }
            />
          </div>

          {/* Filter bar */}
          <div className="recon-filter-bar" role="group" aria-label="Filter reconciliation results">
            <Filter size={16} className="recon-filter-icon" />
            {FILTERS.map((f) => (
              <button
                key={f.value}
                className={`recon-filter-btn${activeFilter === f.value ? ' active' : ''}`}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
                {f.value !== 'all' && (
                  <span className="recon-filter-count">
                    {f.value === 'matched'
                      ? counts.matched
                      : f.value === 'discrepancy'
                      ? counts.discrepancy
                      : f.value === 'unmatched_external'
                      ? counts.unmatched_external
                      : counts.unmatched_dashboard}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="recon-results-meta">
            Showing <strong>{visibleResults.length}</strong> of{' '}
            <strong>{results.length}</strong> results
            {fileName && (
              <span className="recon-results-file">
                &nbsp;· compared against <em>{fileName}</em>
              </span>
            )}
          </div>

          <ResultsTable results={visibleResults} />
        </>
      )}
    </div>
  )
}
