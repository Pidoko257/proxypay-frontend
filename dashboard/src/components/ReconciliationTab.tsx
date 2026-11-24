import React, { useRef, useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Upload, CheckCircle, XCircle, AlertTriangle, Download, Trash2, Filter, Loader2 } from 'lucide-react'
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
      <table className="recon-table" aria-label="Reconciliation results">
        <thead>
          <tr>
            <th scope="col">Reference</th>
            <th scope="col">External Amount</th>
            <th scope="col">Dashboard Amount</th>
            <th scope="col">External Status</th>
            <th scope="col">Dashboard Status</th>
            <th scope="col">Date</th>
            <th scope="col">Result</th>
            <th scope="col">Discrepancies</th>
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
  const [isComparing, setIsComparing] = useState(false)
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

  const handleCompare = async () => {
    if (isComparing) return
    setIsComparing(true)
    try {
      // Yield to the browser so the spinner paints before the synchronous
      // O(n×m) matching work blocks the main thread.
      await new Promise((resolve) => setTimeout(resolve, 0))
      runReconciliation(transactions)
    } finally {
      setIsComparing(false)
    }
  }

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
      ].map((field) => CSVExporter.escapeCsvValue(String(field)))
    )

    const csv = [headers.map((h) => CSVExporter.escapeCsvValue(h)).join(','), ...rows.map((row) => row.join(','))].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reconciliation-${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // ── Render ──
  return (
    <div className="recon-tab">
      <div className="recon-header">
        <div>
          <h2>Reconciliation</h2>
          <p className="recon-subtitle">
            Upload an external statement and compare it against dashboard transactions.
          </p>
        </div>
        <div className="recon-header-actions">
          <button
            className="recon-btn recon-btn-secondary"
            onClick={reset}
            disabled={isUploading || results.length === 0}
          >
            <Trash2 size={16} /> Reset
          </button>
          <button
            className="recon-btn recon-btn-primary"
            onClick={handleExport}
            disabled={results.length === 0}
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Upload zone */}
      <div
        className={`recon-dropzone${isUploading ? ' recon-dropzone-busy' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          onChange={handleFileChange}
          hidden
        />
        {isUploading ? (
          <>
            <Loader2 size={32} className="recon-spin" />
            <p>Parsing {fileName}…</p>
          </>
        ) : (
          <>
            <Upload size={32} />
            <p>
              {fileName ? (
                <>
                  <strong>{fileName}</strong> loaded — drop another file to replace
                </>
              ) : (
                'Drag & drop a CSV or JSON statement, or click to browse'
              )}
            </p>
          </>
        )}
      </div>

      {/* Parse summary */}
      {parseResult && (
        <div className="recon-parse-summary">
          <span>
            <CheckCircle size={16} /> {parseResult.valid.length} valid
          </span>
          {parseResult.invalid.length > 0 && (
            <span className="recon-parse-invalid">
              <XCircle size={16} /> {parseResult.invalid.length} invalid
            </span>
          )}
          <button
            className="recon-btn recon-btn-primary"
            onClick={handleCompare}
            disabled={isComparing || parseResult.valid.length === 0}
          >
            {isComparing ? <Loader2 size={16} className="recon-spin" /> : <Filter size={16} />}
            {isComparing ? 'Comparing…' : 'Run Reconciliation'}
          </button>
        </div>
      )}

      {/* Summary cards */}
      {results.length > 0 && (
        <div className="recon-summary-grid">
          <SummaryCard
            label="Matched"
            count={results.filter((r) => r.status === 'matched').length}
            variant="success"
            icon={<CheckCircle size={20} />}
            active={activeFilter === 'matched'}
            onClick={() => setFilter(activeFilter === 'matched' ? 'all' : 'matched')}
          />
          <SummaryCard
            label="Discrepancies"
            count={results.filter((r) => r.status === 'discrepancy').length}
            variant="danger"
            icon={<AlertTriangle size={20} />}
            active={activeFilter === 'discrepancy'}
            onClick={() => setFilter(activeFilter === 'discrepancy' ? 'all' : 'discrepancy')}
          />
          <SummaryCard
            label="External Only"
            count={results.filter((r) => r.status === 'unmatched_external').length}
            variant="warning"
            icon={<XCircle size={20} />}
            active={activeFilter === 'unmatched_external'}
            onClick={() =>
              setFilter(activeFilter === 'unmatched_external' ? 'all' : 'unmatched_external')
            }
          />
          <SummaryCard
            label="Dashboard Only"
            count={results.filter((r) => r.status === 'unmatched_dashboard').length}
            variant="info"
            icon={<AlertTriangle size={20} />}
            active={activeFilter === 'unmatched_dashboard'}
            onClick={() =>
              setFilter(activeFilter === 'unmatched_dashboard' ? 'all' : 'unmatched_dashboard')
            }
          />
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <ResultsTable
          results={
            activeFilter === 'all' ? results : results.filter((r) => r.status === activeFilter)
          }
        />
      )}
    </div>
  )
}
