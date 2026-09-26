import React, { useEffect, useState } from 'react'
import { CalendarPlus, Download, Loader } from 'lucide-react'
import { useTransactionStore } from '../stores/transactionStore'
import { useExportScheduleStore } from '../stores/exportScheduleStore'
import { CSVExporter } from '../services/csv'
import { sanitizeErrorMessage, validateExternalUrl } from '../services/security'
import { ExportScheduleDialog } from './ExportScheduleDialog'
import '../styles/ExportButton.css'

export const ExportButton: React.FC = () => {
  const { transactions, filters } = useTransactionStore()
  const setCompletionNotification = useExportScheduleStore(
    (state) => state.setCompletionNotification
  )
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [includeAudit, setIncludeAudit] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [completionMessage, setCompletionMessage] = useState('')
  const [completionUrl, setCompletionUrl] = useState<string | null>(null)
  const [completionUrlWarning, setCompletionUrlWarning] = useState(false)

  useEffect(() => {
    const handleCompletion = (event: Event) => {
      const detail = (event as CustomEvent<{
        scheduleId?: string
        message?: string
        url?: string
      }>).detail
      const message = detail?.message || 'Your scheduled transaction export is ready.'
      setCompletionMessage(message)
      const trustedDomains = (import.meta.env.VITE_TRUSTED_REDIRECT_DOMAINS || '')
        .split(',')
        .map((domain: string) => domain.trim())
        .filter(Boolean)
      const validatedUrl = detail?.url
        ? validateExternalUrl(detail.url, window.location.origin, trustedDomains)
        : null
      setCompletionUrl(validatedUrl?.url.href || null)
      setCompletionUrlWarning(Boolean(detail?.url && !validatedUrl))
      setCompletionNotification({
        scheduleId: detail?.scheduleId || 'scheduled-export',
        message,
        receivedAt: new Date().toISOString(),
      })
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ProxyPay export complete', { body: message })
      }
    }
    window.addEventListener('proxypay:export-completed', handleCompletion)
    return () => window.removeEventListener('proxypay:export-completed', handleCompletion)
  }, [setCompletionNotification])

  const handleExport = async () => {
    if (transactions.length === 0) {
      alert('No transactions to export')
      return
    }

    setExporting(true)
    setProgress(0)

    try {
      const totalRows = transactions.length
      const isLargeExport = totalRows > 10000

      if (isLargeExport) {
        const increment = Math.max(1, Math.floor(totalRows / 10))
        for (let i = 0; i < totalRows; i += increment) {
          setProgress(Math.min((i / totalRows) * 100, 99))
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      }

      const csv = CSVExporter.generateCSV(transactions, includeAudit)
      const filename = CSVExporter.generateFilename('transactions')
      CSVExporter.downloadCSV(csv, filename)

      setProgress(100)
      setShowOptions(false)

      setTimeout(() => {
        setExporting(false)
        setProgress(0)
      }, 1500)
    } catch (error) {
      const safeMessage = sanitizeErrorMessage(error)
      console.error('Export failed:', safeMessage)
      alert(`Failed to export transactions: ${safeMessage}`)
      setExporting(false)
      setProgress(0)
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
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        {showOptions && !exporting && (
          <div className="export-options" role="group" aria-label="Export options">
            <label className="option-item">
              <input
                type="checkbox"
                checked={includeAudit}
                onChange={(event) => setIncludeAudit(event.target.checked)}
              />
              <span>Include Audit Trail</span>
            </label>

            <div className="option-info">
              <p>
                <strong>{transactions.length}</strong> transaction
                {transactions.length !== 1 ? 's' : ''} will be exported
              </p>
              {transactions.length > 10000 && (
                <p className="warning">Progress will be shown for large exports</p>
              )}
            </div>

            <button className="action-button primary" onClick={handleExport}>
              Download CSV
            </button>
            <button
              className="action-button secondary schedule-action"
              onClick={() => {
                setShowOptions(false)
                setShowScheduleDialog(true)
              }}
            >
              <CalendarPlus size={15} /> Schedule Export
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

      <ExportScheduleDialog
        isOpen={showScheduleDialog}
        onClose={() => setShowScheduleDialog(false)}
        filters={filters}
        includeAuditTrail={includeAudit}
      />
    </>
  )
}
