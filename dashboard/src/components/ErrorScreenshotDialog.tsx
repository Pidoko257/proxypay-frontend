/**
 * ErrorScreenshotDialog — Issue #628
 *
 * Accessible modal that displays a captured error screenshot with download
 * and manual re-capture options.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { captureScreenshot } from '../services/screenshotCapture'
import '../styles/ErrorScreenshotDialog.css'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ErrorScreenshotDialogProps {
  isOpen: boolean
  onClose: () => void
  errorMessage?: string
  timestamp?: string
  /** Pre-captured base64 PNG data URL */
  screenshotDataUrl?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ErrorScreenshotDialog({
  isOpen,
  onClose,
  errorMessage,
  timestamp,
  screenshotDataUrl: initialDataUrl,
}: ErrorScreenshotDialogProps): React.JSX.Element | null {
  const [dataUrl, setDataUrl] = useState<string>(initialDataUrl ?? '')
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureError, setCaptureError] = useState<string | null>(null)

  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Sync external screenshotDataUrl changes
  useEffect(() => {
    if (initialDataUrl) setDataUrl(initialDataUrl)
  }, [initialDataUrl])

  // Focus the close button when dialog opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus()
    }
  }, [isOpen])

  // Trap focus inside dialog
  useEffect(() => {
    if (!isOpen) return

    const dialog = dialogRef.current
    if (!dialog) return

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleDownload = useCallback(() => {
    if (!dataUrl) return
    const anchor = document.createElement('a')
    anchor.href = dataUrl
    const ts = timestamp ? timestamp.replace(/[:.]/g, '-') : Date.now().toString()
    anchor.download = `proxypay-error-${ts}.png`
    anchor.click()
  }, [dataUrl, timestamp])

  const handleCaptureNow = useCallback(async () => {
    setIsCapturing(true)
    setCaptureError(null)
    try {
      const newUrl = await captureScreenshot()
      setDataUrl(newUrl)
    } catch (err) {
      setCaptureError('Capture failed. Please try again.')
      console.error('Manual screenshot capture failed', err)
    } finally {
      setIsCapturing(false)
    }
  }, [])

  if (!isOpen) return null

  const formattedTimestamp = timestamp
    ? new Date(timestamp).toLocaleString()
    : null

  return (
    /* Backdrop */
    <div
      className="error-screenshot-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      aria-hidden="false"
    >
      {/* Dialog */}
      <div
        ref={dialogRef}
        data-testid="error-screenshot-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Error screenshot"
        className="error-screenshot-dialog"
      >
        {/* Header */}
        <div className="error-screenshot-dialog__header">
          <h2 className="error-screenshot-dialog__title">Error Screenshot</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="error-screenshot-dialog__close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Meta */}
        {(errorMessage || formattedTimestamp) && (
          <div className="error-screenshot-dialog__meta">
            {errorMessage && (
              <p className="error-screenshot-dialog__message">
                <strong>Error:</strong> {errorMessage}
              </p>
            )}
            {formattedTimestamp && (
              <p className="error-screenshot-dialog__timestamp">
                <strong>Captured at:</strong>{' '}
                <time dateTime={timestamp}>{formattedTimestamp}</time>
              </p>
            )}
          </div>
        )}

        {/* Screenshot preview */}
        <div className="error-screenshot-dialog__preview">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="Screenshot of the page at the time of the error"
              className="error-screenshot-dialog__image"
            />
          ) : (
            <div className="error-screenshot-dialog__placeholder" aria-live="polite">
              {isCapturing ? 'Capturing screenshot…' : 'No screenshot available.'}
            </div>
          )}
        </div>

        {captureError && (
          <p className="error-screenshot-dialog__capture-error" role="alert">
            {captureError}
          </p>
        )}

        {/* Actions */}
        <div className="error-screenshot-dialog__actions">
          <button
            type="button"
            className="error-screenshot-dialog__btn error-screenshot-dialog__btn--primary"
            onClick={handleCaptureNow}
            disabled={isCapturing}
            aria-label="Capture a new screenshot now"
          >
            {isCapturing ? 'Capturing…' : 'Capture Now'}
          </button>

          <button
            type="button"
            className="error-screenshot-dialog__btn error-screenshot-dialog__btn--secondary"
            onClick={handleDownload}
            disabled={!dataUrl}
            aria-label="Download screenshot as PNG"
          >
            Download Screenshot
          </button>

          <button
            type="button"
            className="error-screenshot-dialog__btn error-screenshot-dialog__btn--ghost"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
