import React, { useState } from 'react'
import { Download, Loader } from 'lucide-react'
import { useTransactionStore } from '../stores/transactionStore'
import { CSVExporter } from '../services/csv'
import '../styles/ExportButton.css'

export const ExportButton: React.FC = () => {
  const { transactions } = useTransactionStore()
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [includeAudit, setIncludeAudit] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  const handleExport = async () => {
    if (transactions.length === 0) {
      alert('No transactions to export')
      return
    }

    setExporting(true)
    setProgress(0)

    try {
      // Simulate progress for large exports
      const totalRows = transactions.length
      const isLargeExport = totalRows > 10000

      if (isLargeExport) {
        // Show progress every 10% increment
        const increment = Math.max(1, Math.floor(totalRows / 10))
        for (let i = 0; i < totalRows; i += increment) {
          setProgress(Math.min((i / totalRows) * 100, 99))
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      }

      // Generate CSV
      const csv = CSVExporter.generateCSV(transactions, includeAudit)
      const filename = CSVExporter.generateFilename('transactions')

      // Download
      CSVExporter.downloadCSV(csv, filename)

      setProgress(100)
      setShowOptions(false)

      // Reset after short delay
      setTimeout(() => {
        setExporting(false)
        setProgress(0)
      }, 1500)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export transactions')
      setExporting(false)
      setProgress(0)
    }
  }

  return (
    <div className="export-container">
      {/* Main Button */}
      <button
        className={`export-button ${exporting ? 'loading' : ''}`}
        onClick={() => (exporting ? null : setShowOptions(!showOptions))}
        disabled={exporting || transactions.length === 0}
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

      {/* Progress Bar (Large Exports) */}
      {exporting && progress > 0 && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Options Menu */}
      {showOptions && !exporting && (
        <div className="export-options">
          <label className="option-item">
            <input
              type="checkbox"
              checked={includeAudit}
              onChange={(e) => setIncludeAudit(e.target.checked)}
            />
            <span>Include Audit Trail</span>
          </label>

          <div className="option-info">
            <p>
              <strong>{transactions.length}</strong> transaction
              {transactions.length !== 1 ? 's' : ''} will be exported
            </p>
            {transactions.length > 10000 && (
              <p className="warning">
                Progress will be shown for large exports
              </p>
            )}
          </div>

          <button className="action-button primary" onClick={handleExport}>
            Download CSV
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
