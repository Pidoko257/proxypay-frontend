import React, { useRef, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { Upload, CheckCircle, XCircle, AlertTriangle, Download, Trash2, Filter } from 'lucide-react'
import { useReconciliationStore, ReconciliationFilter, ReconciliationResult, reconcileRecords } from '../stores/reconciliationStore'
import { useTransactionStore } from '../stores/transactionStore'
import { CSVExporter } from '../services/csv'
import '../styles/ReconciliationTab.css'

// ─── URL state helpers ────────────────────────────────────────────────────────

const FILTER_VALUES: ReconciliationFilter[] = [
  'all',
  'matched',
  'discrepancy',
  'unmatched_external',
  'unmatched_dashboard',
]

const isReconciliationFilter = (value: string | null): value is ReconciliationFilter =>
  value != null && (FILTER_VALUES as string[]).includes(value)

// Only the non-sensitive filter identifier is persisted in the URL.
const readFilterFromUrl = (): ReconciliationFilter | null => {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('reconFilter')
  return isReconciliationFilter(value) ? value : null
}

const writeFilterToUrl = (filter: ReconciliationFilter) => {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  if (filter === 'all') {
    params.delete('reconFilter')
  } else {
    params.set('reconFilter', filter)
  }
  const query = params.toString()
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
  window.history.replaceState(null, '', nextUrl)
}

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

  // ── Restore filter from URL on load (ignore invalid values) ──
  useEffect(() => {
    const urlFilter = readFilterFromUrl()
    if (urlFilter && urlFilter !== activeFilter) {
      setFilter(urlFilter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Persist filter to URL whenever it changes ──
  useEffect(() => {
    writeFilterToUrl(activeFilter)
  }, [activeFilter])

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
            <button className="recon-btn recon-btn-secondary" onClick={handleExport}>
              <Download size={16} /> Export CSV
            </button>
            <button className="recon-btn recon-btn-danger" onClick={reset}>
              <Trash2 size={16} /> Reset
            </button>
          </div>
        )}
      </div>

      {/* ── Upload zone ── */}
      {!parseResult && (
        <div
          className={`recon-upload-zone${isUploading ? ' recon-uploading' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            hidden
          />
          <Upload size={32} />
          <p>{isUploading ? 'Uploading…' : 'Drop a CSV here or click to upload'}</p>
          <span className="recon-upload-hint">External records CSV</span>
        </div>
      )}

      {/* ── File summary ── */}
      {parseResult && (
        <div className="recon-file-summary">
          <div className="recon-file-info">
            <strong>{fileName}</strong>
            <span>
              {parseResult.validRows} valid / {parseResult.totalRows} rows
            </span>
          </div>
          <button className="recon-btn recon-btn-primary" onClick={handleCompare}>
            <Filter size={16} /> Compare
          </button>
        </div>
      )}

      {/* ── Summary cards ── */}
      {hasResults && (
        <div className="recon-summary-grid">
          <SummaryCard
            label="Matched"
            count={counts.matched}
            variant="success"
            icon={<CheckCircle size={20} />}
            active={activeFilter === 'matched'}
            onClick={() => setFilter(activeFilter === 'matched' ? 'all' : 'matched')}
          />
          <SummaryCard
            label="Discrepancy"
            count={counts.discrepancy}
            variant="danger"
            icon={<XCircle size={20} />}
            active={activeFilter === 'discrepancy'}
            onClick={() => setFilter(activeFilter === 'discrepancy' ? 'all' : 'discrepancy')}
          />
          <SummaryCard
            label="External Only"
            count={counts.unmatched_external}
            variant="warning"
            icon={<AlertTriangle size={20} />}
            active={activeFilter === 'unmatched_external'}
            onClick={() =>
              setFilter(activeFilter === 'unmatched_external' ? 'all' : 'unmatched_external')
            }
          />
          <SummaryCard
            label="Dashboard Only"
            count={counts.unmatched_dashboard}
            variant="info"
            icon={<AlertTriangle size={20} />}
            active={activeFilter === 'unmatched_dashboard'}
            onClick={() =>
              setFilter(activeFilter === 'unmatched_dashboard' ? 'all' : 'unmatched_dashboard')
            }
          />
        </div>
      )}

      {/* ── Filter pills ── */}
      {hasResults && (
        <div className="recon-filter-pills">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`recon-filter-pill${activeFilter === f.value ? ' recon-pill-active' : ''}`}
              onClick={() => setFilter(f.value)}
              aria-pressed={activeFilter === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {hasResults && <ResultsTable results={visibleResults} />}
    </div>
  )
}
