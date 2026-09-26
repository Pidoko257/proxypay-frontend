import React, { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Loader } from 'lucide-react'
import { useNotificationStore } from '../stores/notificationStore'
import { SkeletonCard } from './Skeleton'
import {
  CorsDiagnostic,
  getCorsDiagnostic,
  subscribeCorsDiagnostic,
} from '../services/security'
import '../styles/NotificationSettings.css'

export const NotificationSettings: React.FC = () => {
  const [corsDiagnostic, setCorsDiagnostic] = useState<CorsDiagnostic | null>(getCorsDiagnostic)
  const { settings, loading, error, optimisticUpdates, fetchSettings, updateSetting, clearError } =
    useNotificationStore()

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => subscribeCorsDiagnostic(setCorsDiagnostic), [])

  const handleToggle = (
    eventType: string,
    toggleType: 'email' | 'webhook',
    currentValue: boolean
  ) => {
    const setting = settings.find((s) => s.eventType === eventType)
    if (!setting) return

    updateSetting(
      eventType,
      toggleType === 'email' ? !currentValue : setting.emailEnabled,
      toggleType === 'webhook' ? !currentValue : setting.webhookEnabled
    )
  }

  const isOptimistic = (eventType: string) => optimisticUpdates.has(eventType)

  return (
    <div className="notification-settings">
      <header className="settings-header">
        <h1>Notification Settings</h1>
        <p>Configure which events trigger email and webhook notifications</p>
      </header>

      <section className="cors-diagnostic" aria-labelledby="cors-diagnostic-heading">
        <h2 id="cors-diagnostic-heading">CORS response check</h2>
        {corsDiagnostic ? (
          <div role={corsDiagnostic.status === 'permissive' ? 'alert' : 'status'}>
            <p>
              Allowed origin: <code>{corsDiagnostic.allowOrigin || 'not reported'}</code>
            </p>
            <p>
              {corsDiagnostic.status === 'permissive'
                ? 'The API allows any origin. Restrict this to trusted dashboard origins.'
                : corsDiagnostic.status === 'restricted'
                  ? 'The API response allows this dashboard origin.'
                  : 'The response did not expose an allow-origin value; check the API or same-origin proxy configuration.'}
            </p>
            {corsDiagnostic.allowCredentials && corsDiagnostic.allowOrigin === '*' && (
              <p role="alert">Wildcard origins cannot be used with credentialed CORS requests.</p>
            )}
          </div>
        ) : (
          <p>Waiting for a cross-origin API response. CORS policy is enforced by the API and browser.</p>
        )}
      </section>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}

      {loading && settings.length === 0 ? (
        <div className="skeleton-settings-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} height="180px" />
          ))}
        </div>
      ) : (
        <div className="settings-grid">
          {settings.map((setting) => {
            const isUpdating = isOptimistic(setting.eventType)

            return (
              <div
                key={setting.eventType}
                className={`setting-card ${isUpdating ? 'optimistic' : ''}`}
              >
                {isUpdating && (
                  <div className="optimistic-indicator">
                    <Loader size={16} className="spinner" />
                  </div>
                )}

                <div className="card-header">
                  <h3>{formatEventType(setting.eventType)}</h3>
                  {!isUpdating && (
                    <CheckCircle2
                      size={20}
                      className="check-icon"
                      style={{
                        opacity:
                          setting.emailEnabled || setting.webhookEnabled
                            ? 1
                            : 0.3,
                      }}
                    />
                  )}
                </div>

                <div className="toggle-group">
                  {/* Email Toggle */}
                  <div className="toggle-item">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={setting.emailEnabled}
                        onChange={() =>
                          handleToggle(setting.eventType, 'email', setting.emailEnabled)
                        }
                        disabled={isUpdating}
                        className="toggle-input"
                      />
                      <span className="toggle-track">
                        <span className="toggle-thumb" />
                      </span>
                    </label>
                    <span className="toggle-text">Email Notifications</span>
                  </div>

                  {/* Webhook Toggle */}
                  <div className="toggle-item">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={setting.webhookEnabled}
                        onChange={() =>
                          handleToggle(
                            setting.eventType,
                            'webhook',
                            setting.webhookEnabled
                          )
                        }
                        disabled={isUpdating}
                        className="toggle-input"
                      />
                      <span className="toggle-track">
                        <span className="toggle-thumb" />
                      </span>
                    </label>
                    <span className="toggle-text">Webhook Notifications</span>
                  </div>
                </div>

                {isUpdating && (
                  <div className="update-status">Updating...</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && settings.length === 0 && !error && (
        <div className="empty-state">
          <p>No notification settings available</p>
        </div>
      )}
    </div>
  )
}

/**
 * Formats event type names for display
 * e.g., "payment.settled" -> "Payment Settled"
 */
function formatEventType(eventType: string): string {
  return eventType
    .split('.')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
