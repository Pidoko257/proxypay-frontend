/**
 * ApiEnvironmentSettings — Issue #598
 *
 * Settings panel for configuring the API base URL / environment.
 *
 * Features
 * ─────────
 * • Switch between production / staging / development / custom
 * • Persist selection in localStorage
 * • Validate custom URL format
 * • Test connectivity to the configured endpoint
 * • Show environment-specific warnings
 * • Display current environment in the header badge
 */

import React, { useState } from 'react'
import {
  useApiConfigStore,
  ENVIRONMENTS,
  ApiEnvironment,
  isValidApiUrl,
} from '../stores/apiConfigStore'
import '../styles/ApiEnvironmentSettings.css'

export const ApiEnvironmentSettings: React.FC = () => {
  const {
    environment,
    customUrl,
    testing,
    testResult,
    testError,
    setEnvironment,
    setCustomUrl,
    getEffectiveBaseUrl,
    getWarning,
    testConnectivity,
  } = useApiConfigStore()

  const [localCustomUrl, setLocalCustomUrl] = useState(customUrl)
  const [urlError, setUrlError] = useState<string | null>(null)

  const effectiveUrl = getEffectiveBaseUrl()
  const warning = getWarning()

  const handleEnvChange = (env: ApiEnvironment) => {
    setEnvironment(env)
    setUrlError(null)
  }

  const handleCustomUrlChange = (value: string) => {
    setLocalCustomUrl(value)
    if (value && !isValidApiUrl(value)) {
      setUrlError('Must be a valid absolute URL (https://…) or a root-relative path (/api).')
    } else {
      setUrlError(null)
    }
  }

  const handleCustomUrlApply = () => {
    if (urlError) return
    setCustomUrl(localCustomUrl)
  }

  return (
    <section className="aes-panel" aria-labelledby="aes-title">
      <h3 id="aes-title" className="aes-title">🌐 API Environment</h3>

      {/* Environment selector */}
      <div className="aes-env-grid" role="radiogroup" aria-label="Select API environment">
        {ENVIRONMENTS.map((env) => (
          <label
            key={env.name}
            className={`aes-env-card ${environment === env.name ? 'aes-env-card--active' : ''}`}
          >
            <input
              type="radio"
              name="api-environment"
              value={env.name}
              checked={environment === env.name}
              onChange={() => handleEnvChange(env.name)}
              className="aes-radio"
            />
            <span className="aes-env-label">{env.label}</span>
            {env.name !== 'custom' && (
              <span className="aes-env-url">{env.baseUrl}</span>
            )}
          </label>
        ))}
      </div>

      {/* Custom URL input */}
      {environment === 'custom' && (
        <div className="aes-custom-url">
          <label htmlFor="aes-custom-input" className="aes-field-label">
            Custom API URL
          </label>
          <div className="aes-custom-row">
            <input
              id="aes-custom-input"
              type="url"
              className={`aes-input ${urlError ? 'aes-input--error' : ''}`}
              placeholder="https://api.example.com/api"
              value={localCustomUrl}
              onChange={(e) => handleCustomUrlChange(e.target.value)}
              aria-describedby={urlError ? 'aes-url-error' : undefined}
            />
            <button
              className="aes-btn aes-btn-primary"
              onClick={handleCustomUrlApply}
              disabled={!!urlError || localCustomUrl === customUrl}
            >
              Apply
            </button>
          </div>
          {urlError && (
            <p id="aes-url-error" className="aes-field-error" role="alert">
              {urlError}
            </p>
          )}
        </div>
      )}

      {/* Current URL display */}
      <div className="aes-current-url">
        <span className="aes-current-label">Active endpoint:</span>
        <code className="aes-current-value">{effectiveUrl}</code>
      </div>

      {/* Environment warning */}
      {warning && (
        <div className="aes-warning" role="status" aria-live="polite">
          {warning}
        </div>
      )}

      {/* Connectivity test */}
      <div className="aes-connectivity">
        <button
          className="aes-btn aes-btn-secondary"
          onClick={() => void testConnectivity()}
          disabled={testing}
          aria-busy={testing}
        >
          {testing ? '⏳ Testing…' : '🔌 Test Connectivity'}
        </button>

        {testResult === 'ok' && (
          <span className="aes-test-result aes-test-ok" role="status">
            ✓ Connection successful
          </span>
        )}
        {testResult === 'error' && (
          <span className="aes-test-result aes-test-error" role="alert">
            ✕ {testError ?? 'Connection failed'}
          </span>
        )}
      </div>
    </section>
  )
}

/**
 * EnvironmentBadge — small indicator that can be placed in the app header.
 * Shows the active environment name; hidden when on production.
 */
export const EnvironmentBadge: React.FC = () => {
  const { environment } = useApiConfigStore()
  if (environment === 'production') return null

  const label = ENVIRONMENTS.find((e) => e.name === environment)?.label ?? environment
  return (
    <span
      className={`aes-env-badge aes-env-badge--${environment}`}
      aria-label={`Active API environment: ${label}`}
      title={`API environment: ${label}`}
    >
      {label}
    </span>
  )
}

export default ApiEnvironmentSettings
