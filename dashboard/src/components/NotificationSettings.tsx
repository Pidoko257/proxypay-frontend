import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, AlertCircle, Loader, Send } from 'lucide-react'
import { useNotificationStore } from '../stores/notificationStore'
import { proxyPayAPI, WebhookTestResult } from '../services/api'
import { SkeletonCard } from './Skeleton'
import '../styles/NotificationSettings.css'

interface WebhookTestHistoryEntry extends WebhookTestResult {
  error?: string
}

export const NotificationSettings: React.FC = () => {
  const { settings, loading, error, optimisticUpdates, fetchSettings, updateSetting, clearError } =
    useNotificationStore()
  const [testEventType, setTestEventType] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [testHistory, setTestHistory] = useState<WebhookTestHistoryEntry[]>([])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    if (!testEventType && settings.length > 0) setTestEventType(settings[0].eventType)
  }, [settings, testEventType])

  const previewPayload = useMemo(
    () => ({
      id: 'webhook-test-preview',
      eventType: testEventType || 'payment.settled',
      createdAt: '<generated when sent>',
      data: { test: true, message: 'This is a test webhook from ProxyPay.' },
    }),
    [testEventType]
  )

  const handleTestWebhook = async () => {
    if (!testEventType) return
    setTestLoading(true)
    setTestError(null)
    setTestResult(null)
    try {
      const result = await proxyPayAPI.testWebhook(testEventType)
      setTestResult(result)
      setTestHistory((history) => [result, ...history])
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Failed to send webhook test'
      setTestError(message)
      setTestHistory((history) => [
        {
          status: 0,
          body: null,
          payload: { ...previewPayload, id: `webhook-test-${Date.now()}` },
          requestStartedAt: new Date().toISOString(),
          responseReceivedAt: new Date().toISOString(),
          attempts: 3,
          error: message,
        },
        ...history,
      ])
    } finally {
      setTestLoading(false)
    }
  }

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

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}

      <section className="webhook-test-panel" aria-labelledby="webhook-test-title">
        <div className="webhook-test-header">
          <div>
            <h2 id="webhook-test-title">Test webhook delivery</h2>
            <p>Send a sample event to your configured webhook endpoint before deploying.</p>
          </div>
          <Send size={22} aria-hidden="true" />
        </div>
        <div className="webhook-test-controls">
          <label htmlFor="webhook-test-event">Test event type</label>
          <select
            id="webhook-test-event"
            value={testEventType}
            onChange={(event) => setTestEventType(event.target.value)}
            disabled={testLoading || settings.length === 0}
          >
            {settings.length === 0 && <option value="">No event types available</option>}
            {settings.map((setting) => (
              <option key={setting.eventType} value={setting.eventType}>
                {formatEventType(setting.eventType)}
              </option>
            ))}
          </select>
        </div>
        <div className="webhook-preview">
          <h3>Payload preview</h3>
          <pre>{JSON.stringify(previewPayload, null, 2)}</pre>
        </div>
        <button
          className="webhook-test-button"
          onClick={handleTestWebhook}
          disabled={testLoading || !testEventType}
        >
          {testLoading ? <Loader size={16} className="spinner" /> : <Send size={16} />}
          {testLoading ? 'Sending test...' : 'Send Test Webhook'}
        </button>

        {(testResult || testError) && (
          <div className={`webhook-result ${testError ? 'webhook-result-error' : ''}`}>
            <strong>{testError ? 'Webhook test failed' : `Response status: ${testResult?.status}`}</strong>
            <span>{testError || `Completed in ${testResult?.attempts} attempt(s)`}</span>
            <pre>{JSON.stringify(testError ? { error: testError } : testResult?.body, null, 2)}</pre>
            {testResult && (
              <div className="webhook-timeline">
                <span>Request: {formatTimestamp(testResult.requestStartedAt)}</span>
                <span>Response: {formatTimestamp(testResult.responseReceivedAt)}</span>
              </div>
            )}
          </div>
        )}

        {testHistory.length > 0 && (
          <div className="webhook-history">
            <h3>Test history</h3>
            {testHistory.map((entry) => (
              <div className="webhook-history-entry" key={`${entry.payload.id}-${entry.responseReceivedAt}`}>
                <span>{formatEventType(entry.payload.eventType)}</span>
                <span className={entry.error ? 'history-failed' : 'history-success'}>
                  {entry.error ? 'Failed' : `${entry.status} OK`}
                </span>
                <time dateTime={entry.responseReceivedAt}>{formatTimestamp(entry.responseReceivedAt)}</time>
              </div>
            ))}
          </div>
        )}
      </section>

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

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString()
}
