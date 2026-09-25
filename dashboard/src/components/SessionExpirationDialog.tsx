import React from 'react'
import { AlertTriangle } from 'lucide-react'
import '../styles/SessionExpirationDialog.css'

interface SessionExpirationDialogProps {
  secondsRemaining: number
  onExtend: () => void
  onSignOut: () => void
}

export const SessionExpirationDialog: React.FC<SessionExpirationDialogProps> = ({
  secondsRemaining,
  onExtend,
  onSignOut,
}) => (
  <div className="session-dialog-backdrop" role="presentation">
    <section
      className="session-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-dialog-title"
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
        <button className="session-dialog-primary" onClick={onExtend}>
          Extend Session
        </button>
      </div>
    </section>
  </div>
)

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}
