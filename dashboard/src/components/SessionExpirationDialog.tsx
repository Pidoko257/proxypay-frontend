import { useEffect, useRef } from 'react'
import type { FC, KeyboardEvent } from 'react'
import { AlertTriangle } from 'lucide-react'
import '../styles/SessionExpirationDialog.css'

interface SessionExpirationDialogProps {
  secondsRemaining: number
  onExtend: () => void
  onSignOut: () => void
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

export const SessionExpirationDialog: FC<SessionExpirationDialogProps> = ({
  secondsRemaining,
  onExtend,
  onSignOut,
}) => {
  const primaryButtonRef = useRef<HTMLButtonElement>(null)

  // When the dialog appears, move focus into it; when it disappears, restore
  // focus to the element that had it. This keeps keyboard users off the
  // transaction table behind the modal for the entire time it is open.
  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusTimer = window.setTimeout(() => {
      primaryButtonRef.current?.focus()
    }, 0)
    return () => {
      window.clearTimeout(focusTimer)
      previousFocus?.focus()
    }
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="session-dialog-backdrop" role="presentation">
      <section
        className="session-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-dialog-title"
        onKeyDown={handleKeyDown}
      >
        <AlertTriangle size={28} aria-hidden="true" />
        <h2 id="session-dialog-title">Your session is about to expire</h2>
        <p>
          You will be logged out in <strong>{formatRemaining(secondsRemaining)}</strong>.
          Extend your session to avoid losing your current work.
        </p>
        <div className="session-dialog-actions">
          <button className="session-dialog-secondary" onClick={onSignOut}>
            Log out
          </button>
          <button
            ref={primaryButtonRef}
            className="session-dialog-primary"
            onClick={onExtend}
          >
            Extend Session
          </button>
        </div>
      </section>
    </div>
  )
}

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}
