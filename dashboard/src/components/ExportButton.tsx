import React, { useState } from 'react'
import { CalendarClock, Download, Loader } from 'lucide-react'
import { useTransactionStore } from '../stores/transactionStore'
import { proxyPayAPI } from '../services/api'
import { CSVExporter } from '../services/csv'
import { printTransactionReport } from '../services/print'
import '../styles/ExportButton.css'
import { canAccess } from '../auth/access'

export const ExportButton: React.FC = () => {
  const { transactions, filters } = useTransactionStore()
  const setCompletionNotification = useExportScheduleStore(
    (state) => state.setCompletionNotification
  )
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToastStore()
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [includeAudit, setIncludeAudit] = useState(false)
  const [platform, setPlatform] = useState<AccountingPlatform>('generic')
  const [showOptions, setShowOptions] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')
  const [scheduling, setScheduling] = useState(false)

  if (!canAccess('transaction-export')) {
    return null
  }

  const handleExport = async () => {
    if (transactions.length === 0) {
      toastWarning('No transactions to export')
      return
    }

    setExporting(true)
    setProgress(0)
    setExportAnnouncement('Preparing transaction export.')

    try {
      const totalRows = transactions.length
      const isLargeExport = totalRows > 10000

      if (isLargeExport) {
        const increment = Math.max(1, Math.floor(totalRows / 10))
        for (let i = 0; i < totalRows; i += increment) {
          const nextProgress = Math.min((i / totalRows) * 100, 99)
          setProgress(nextProgress)
          setExportAnnouncement(
            `Exporting ${totalRows} transactions: ${Math.round(nextProgress)}% complete.`
          )
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      }

      const csv = CSVExporter.generateCSV(transactions, includeAudit)
      const filename = CSVExporter.generateFilename('transactions')
      CSVExporter.downloadCSV(csv, filename)

      setProgress(100)
      setExportAnnouncement(`Export complete: ${totalRows} transactions downloaded.`)
      setShowOptions(false)
      toastSuccess(`Exported ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} successfully`)

      setTimeout(() => {
        setExporting(false)
        setProgress(0)
      }, 1500)
    } catch (error) {
      console.error('Export failed:', error)
      toastError('Failed to export transactions. Please try again.')
      setExporting(false)
      setProgress(0)
    }
  }

  const handleSchedule = async () => {
    if (!scheduledFor) {
      alert('Choose when the export should be ready')
      return
    }

    setScheduling(true)
    try {
      await proxyPayAPI.scheduleExport({
        includeAuditTrail: includeAudit,
        scheduledFor: new Date(scheduledFor).toISOString(),
        filters: useTransactionStore.getState().filters,
      })
      alert('Export scheduled. You will be notified when it is ready.')
      setScheduledFor('')
      setShowOptions(false)
    } catch (error) {
      console.error('Scheduling export failed:', error)
      alert('Failed to schedule export')
    } finally {
      setScheduling(false)
    }
  }

  return (
    <>
      <div className="export-container">
        {completionMessage && (
          <div className="export-completion-notice" role="status">
            <span>{completionMessage}</span>
            {completionUrlWarning && (
              <span role="alert">The notification link was blocked because it is not a safe HTTPS URL.</span>
            )}
            {completionUrl && (
              <button
                type="button"
                onClick={() => {
                  const trustedDomains = (import.meta.env.VITE_TRUSTED_REDIRECT_DOMAINS || '')
                    .split(',')
                    .map((domain: string) => domain.trim())
                    .filter(Boolean)
                  const validatedUrl = validateExternalUrl(
                    completionUrl,
                    window.location.origin,
                    trustedDomains
                  )
                  if (!validatedUrl) return
                  const isExternal = validatedUrl.url.origin !== window.location.origin
                  if (
                    isExternal &&
                    !window.confirm(
                      validatedUrl.trusted
                        ? `Open the trusted external destination ${validatedUrl.url.host}?`
                        : `This destination is not in the trusted allowlist (${validatedUrl.url.host}). Continue?`
                    )
                  ) return
                  console.info('[security-audit] External redirect approved', {
                    host: validatedUrl.url.host,
                    timestamp: new Date().toISOString(),
                  })
                  window.open(validatedUrl.url.href, '_blank', 'noopener,noreferrer')
                }}
              >
                Open export link
              </button>
            )}
          </div>
        )}
        <button
          className={`export-button ${exporting ? 'loading' : ''}`}
          onClick={() => (exporting ? null : setShowOptions(!showOptions))}
          disabled={exporting}
          aria-haspopup="true"
          aria-expanded={showOptions}
        >
          {exporting ? (
            <>
              <Loader size={18} className="spinner" />
              {progress > 0 ? `${Math.round(progress)}%` : 'Preparing...'}
            </>
          ) : (
            <>
              <Download size={18} />
              Export CSV
            </>
          )}
        </button>

        {exporting && progress > 0 && (
          <div
            className="progress-bar"
            role="progressbar"
            aria-label="CSV export progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {exportAnnouncement}
        </div>

        {showOptions && !exporting && (
          <div className="export-options" role="group" aria-label="Export options">
            <label className="option-item">
              <input
                type="checkbox"
                checked={includeAudit}
                onChange={(e) => setIncludeAudit(e.target.checked)}
              />
              <span>Include Audit Trail</span>
            </label>
          )}

          <div className="option-info">
            <p>
              <strong>{transactions.length}</strong> transaction
              {transactions.length !== 1 ? 's' : ''} will be exported
            </p>
            {platform !== 'generic' && (
              <p className="format-help">
                Formatted for import into {platform === 'quickbooks' ? 'QuickBooks Online' : 'Xero'}.
              </p>
            )}
            {transactions.length > 10000 && (
              <p className="warning">
                Progress will be shown for large exports
              </p>
              {transactions.length > 10000 && (
                <p className="warning">Progress will be shown for large exports</p>
              )}
            </div>

          <button className="action-button primary" onClick={handleExport}>
            Download {platform === 'generic' ? 'CSV' : 'import file'}
          </button>

          <button className="action-button report" onClick={handleReport}>
            <FileText size={16} />
            Print / Save PDF Report
          </button>

          <label className="schedule-field">
            <span>Notify me when ready</span>
            <input
              type="datetime-local"
              value={scheduledFor}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(event) => setScheduledFor(event.target.value)}
              disabled={scheduling}
            />
          </label>
          <button
            className="action-button schedule"
            onClick={handleSchedule}
            disabled={scheduling || !scheduledFor}
          >
            <CalendarClock size={16} />
            {scheduling ? 'Scheduling...' : 'Schedule Export'}
          </button>

          <button
            className="action-button secondary"
            onClick={() => setShowOptions(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
