import React, { useCallback, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { useViewPreferencesStore } from '../stores/viewPreferencesStore'
import '../styles/ViewPreferencesPanel.css'

export const ViewPreferencesPanel: React.FC<{
  isOpen: boolean
  onClose: () => void
}> = ({ isOpen, onClose }) => {
  const {
    preferences,
    toggleColumnVisibility,
    resetToDefaults,
  } = useViewPreferencesStore()

  const panelRef = useRef<HTMLDivElement>(null)

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !(event.target instanceof Node) ||
        !panelRef.current.contains(event.target)
      ) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const columns = [
    { key: 'reference' as const, label: 'Reference' },
    { key: 'amount' as const, label: 'Amount' },
    { key: 'status' as const, label: 'Status' },
    { key: 'provider' as const, label: 'Provider' },
    { key: 'timestamp' as const, label: 'Date' },
    { key: 'actions' as const, label: 'Actions' },
  ]

  const handleToggleColumn = useCallback(
    (column: keyof typeof preferences.visibleColumns) => {
      toggleColumnVisibility(column)
    },
    [toggleColumnVisibility]
  )

  const handleReset = useCallback(() => {
    resetToDefaults()
    onClose()
  }, [resetToDefaults, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="view-preferences-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="view-preferences-panel"
        role="dialog"
        aria-labelledby="view-prefs-title"
        aria-modal="true"
      >
        <div className="panel-header">
          <h2 id="view-prefs-title" className="panel-title">
            Visible Columns
          </h2>
          <button
            className="panel-close-btn"
            onClick={onClose}
            aria-label="Close preferences panel"
          >
            ×
          </button>
        </div>

        <div className="panel-content">
          <div className="column-toggles">
            {columns.map((col) => (
              <label key={col.key} className="column-toggle">
                <input
                  type="checkbox"
                  checked={preferences.visibleColumns[col.key]}
                  onChange={() => handleToggleColumn(col.key)}
                  aria-label={`Toggle ${col.label} column visibility`}
                />
                <span className="toggle-label">{col.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="panel-footer">
          <button
            className="btn-reset"
            onClick={handleReset}
            aria-label="Reset all preferences to defaults"
          >
            Reset to Defaults
          </button>
          <button
            className="btn-done"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </>
  )
}
