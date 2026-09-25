import React, { useEffect, useState, useCallback } from 'react';
import { retryWithExponentialBackoff } from '../utils/retryWithExponentialBackoff';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RateLimitStatus {
  tier: string;
  requestsLimit: number;
  requestsUsed: number;
  requestsRemaining: number;
  resetTime: string;
  resetTimestamp: number;
  percentageUsed: number;
  endpoints: EndpointUsage[];
  usageHistory?: UsageHistoryPoint[];
}

export interface UsageHistoryPoint {
  timestamp: number;
  requestsUsed: number;
}

export interface UsageForecast {
  requestsPerHour: number;
  hoursUntilLimit: number | null;
  projectedAtLimit: number | null;
}

export function calculateUsageForecast(
  history: UsageHistoryPoint[],
  limit: number,
  now = Date.now(),
): UsageForecast {
  if (history.length < 2) return { requestsPerHour: 0, hoursUntilLimit: null, projectedAtLimit: null };
  const ordered = [...history].sort((a, b) => a.timestamp - b.timestamp);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const hours = (last.timestamp - first.timestamp) / 3600000;
  const requestsPerHour = hours > 0 ? Math.max(0, (last.requestsUsed - first.requestsUsed) / hours) : 0;
  const remaining = Math.max(0, limit - last.requestsUsed);
  const hoursUntilLimit = requestsPerHour > 0 ? remaining / requestsPerHour : null;
  return {
    requestsPerHour: Math.round(requestsPerHour),
    hoursUntilLimit,
    projectedAtLimit: hoursUntilLimit === null ? null : now + hoursUntilLimit * 3600000,
  };
}

interface EndpointUsage {
  path: string;
  method: string;
  requestsUsed: number;
  limit: number;
}

interface RateLimitAlert {
  level: 'warning' | 'critical' | 'ok';
  message: string;
  timestamp: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  ok: '#49cc90',
  warning: '#fca130',
  critical: '#f93e3e',
};

const POLLING_INTERVAL = 30000; // 30 seconds
const DEMO_MODE = true; // Set to false when connecting to real API

// ─── Mock Data Generator ──────────────────────────────────────────────────────

function generateMockStatus(): RateLimitStatus {
  const now = Date.now();
  const resetTime = new Date(now + 3600000); // 1 hour from now
  const limit = 5000;
  const used = Math.floor(Math.random() * (limit * 0.85));
  const remaining = limit - used;
  const usageHistory = Array.from({ length: 8 }, (_, index) => ({
    timestamp: now - (7 - index) * 3600000,
    requestsUsed: Math.max(0, used - (7 - index) * Math.max(1, Math.round(used * 0.025))),
  }));

  return {
    tier: 'Pro',
    requestsLimit: limit,
    requestsUsed: used,
    requestsRemaining: remaining,
    resetTime: resetTime.toISOString(),
    resetTimestamp: resetTime.getTime(),
    percentageUsed: Math.round((used / limit) * 100),
    endpoints: [
      {
        path: '/api/transactions',
        method: 'GET',
        requestsUsed: Math.floor(Math.random() * 500),
        limit: 1000,
      },
      {
        path: '/api/webhooks',
        method: 'POST',
        requestsUsed: Math.floor(Math.random() * 300),
        limit: 500,
      },
      {
        path: '/api/keys',
        method: 'GET',
        requestsUsed: Math.floor(Math.random() * 100),
        limit: 200,
      },
      {
        path: '/api/users',
        method: 'GET',
        requestsUsed: Math.floor(Math.random() * 200),
        limit: 300,
      },
      {
        path: '/api/rates',
        method: 'GET',
        requestsUsed: Math.floor(Math.random() * 150),
        limit: 250,
      },
    ],
    usageHistory,
  };
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getStatusLevel(percentageUsed: number): 'ok' | 'warning' | 'critical' {
  if (percentageUsed >= 90) return 'critical';
  if (percentageUsed >= 70) return 'warning';
  return 'ok';
}

function getTimeRemaining(resetTimestamp: number): string {
  const now = Date.now();
  const diff = Math.max(0, resetTimestamp - now);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDate(date: string | number | Date): string {
  const d = new Date(date);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({
  used,
  limit,
  status,
}: {
  used: number;
  limit: number;
  status: 'ok' | 'warning' | 'critical';
}) {
  const percentage = Math.round((used / limit) * 100);
  return (
    <div className="rate-limit-progress-container">
      <div className="rate-limit-progress-bar">
        <div
          className={`rate-limit-progress-fill rate-limit-status-${status}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className="rate-limit-progress-text">{percentage}%</span>
    </div>
  );
}

function StatusBadge({ status }: { status: 'ok' | 'warning' | 'critical' }) {
  const labels = {
    ok: 'Healthy',
    warning: 'Warning',
    critical: 'Critical',
  };
  return (
    <span className={`rate-limit-badge rate-limit-status-${status}`}>
      ● {labels[status]}
    </span>
  );
}

function Alert({ alert }: { alert: RateLimitAlert }) {
  return (
    <div className={`rate-limit-alert rate-limit-alert-${alert.level}`}>
      <span className="rate-limit-alert-icon">
        {alert.level === 'critical' && '⚠️'}
        {alert.level === 'warning' && '⚡'}
        {alert.level === 'ok' && '✓'}
      </span>
      <div className="rate-limit-alert-content">
        <p className="rate-limit-alert-message">{alert.message}</p>
      </div>
    </div>
  );
}

function EndpointUsageRow({ endpoint }: { endpoint: EndpointUsage }) {
  const percentage = Math.round((endpoint.requestsUsed / endpoint.limit) * 100);
  const status = getStatusLevel(percentage);

  return (
    <tr className={`rate-limit-endpoint-row rate-limit-status-${status}-row`}>
      <td>
        <code className="rate-limit-endpoint-method">{endpoint.method}</code>
        <code className="rate-limit-endpoint-path">{endpoint.path}</code>
      </td>
      <td className="rate-limit-usage-cell">
        <ProgressBar
          used={endpoint.requestsUsed}
          limit={endpoint.limit}
          status={status}
        />
      </td>
      <td className="rate-limit-stats-cell">
        <span className="rate-limit-stats-text">
          {endpoint.requestsUsed} / {endpoint.limit}
        </span>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RateLimitDashboard(): React.JSX.Element {
  const [status, setStatus] = useState<RateLimitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<RateLimitAlert[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  // Fetch rate limit status
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (DEMO_MODE) {
        // Use mock data
        await new Promise((resolve) => setTimeout(resolve, 500));
        const newStatus = generateMockStatus();
        setStatus(newStatus);
        setLastUpdated(Date.now());

        // Update alerts based on status
        const newAlerts: RateLimitAlert[] = [];
        if (newStatus.percentageUsed >= 90) {
          newAlerts.push({
            level: 'critical',
            message: 'You have used 90% or more of your rate limit. Your requests may be throttled soon.',
            timestamp: Date.now(),
          });
        } else if (newStatus.percentageUsed >= 70) {
          newAlerts.push({
            level: 'warning',
            message: 'You have used 70% of your rate limit. Consider optimizing your API usage.',
            timestamp: Date.now(),
          });
        } else {
          newAlerts.push({
            level: 'ok',
            message: `Your rate limit usage is healthy. You have ${newStatus.requestsRemaining} requests remaining.`,
            timestamp: Date.now(),
          });
        }
        setAlerts(newAlerts);
      } else {
        const response = await retryWithExponentialBackoff(
          () => fetch('/api/rate-limit-status', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('api_token')}`,
              'Content-Type': 'application/json',
            },
          }).then((result) => {
            if (!result.ok) throw new Error(`Failed to fetch rate limit status (${result.status})`);
            return result;
          }),
          {
            maxAttempts: 3,
            initialDelayMs: 1000,
            onRetry: (_error, attempt, delayMs) => console.warn(`Rate limit retry ${attempt} in ${delayMs}ms`),
          }
        );

        const data = (await response.json()) as RateLimitStatus;
        setStatus(data);
        setLastUpdated(Date.now());
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh polling
  useEffect(() => {
                    <button type="button" onClick={fetchStatus} disabled={loading}>Retry</button>
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      fetchStatus();
    }, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [autoRefresh, fetchStatus]);

  // Calculate time remaining for reset
  const timeRemaining = status
    ? getTimeRemaining(status.resetTimestamp)
    : null;

  const currentStatus = status ? getStatusLevel(status.percentageUsed) : 'ok';

  return (
    <div className="rate-limit-dashboard">
      {/* Header */}
      <div className="rate-limit-header">
        <div className="rate-limit-title-section">
          <h2 className="rate-limit-title">Rate Limit Status</h2>
          <p className="rate-limit-subtitle">
            Real-time monitoring of your API rate limit usage
          </p>
        </div>
        <div className="rate-limit-controls">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="rate-limit-button rate-limit-button-refresh"
            aria-label="Refresh rate limit status"
          >
            {loading ? '⟳ Updating…' : '⟳ Refresh'}
          </button>
          <label className="rate-limit-checkbox-label">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              aria-label="Auto-refresh rate limit status"
            />
            <span>Auto-refresh every {POLLING_INTERVAL / 1000}s</span>
          </label>
        </div>
      </div>

      {/* Last Updated */}
      <p className="rate-limit-last-updated">
        Last updated: {formatDate(new Date(lastUpdated))}
      </p>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="rate-limit-alerts-container">
          {alerts.map((alert, idx) => (
            <Alert key={idx} alert={alert} />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rate-limit-error">
          <p>Error loading rate limit status: {error}</p>
          <button onClick={fetchStatus} className="rate-limit-button">
            Try Again
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !status && (
        <div className="rate-limit-loading">
          <div className="rate-limit-spinner" />
          <p>Loading rate limit data…</p>
        </div>
      )}

      {/* Main Content */}
      {status && (
        <>
          {/* Overview Cards */}
          <div className="rate-limit-overview">
            {/* Overall Status Card */}
            <div className="rate-limit-card">
              <div className="rate-limit-card-header">
                <h3>Overall Usage</h3>
                <StatusBadge status={currentStatus} />
              </div>
              <div className="rate-limit-card-body">
                <ProgressBar
                  used={status.requestsUsed}
                  limit={status.requestsLimit}
                  status={currentStatus}
                />
                <div className="rate-limit-card-stats">
                  <div className="rate-limit-stat">
                    <span className="rate-limit-stat-label">Used</span>
                    <span className="rate-limit-stat-value">{status.requestsUsed.toLocaleString()}</span>
                  </div>
                  <div className="rate-limit-stat">
                    <span className="rate-limit-stat-label">Limit</span>
                    <span className="rate-limit-stat-value">{status.requestsLimit.toLocaleString()}</span>
                  </div>
                  <div className="rate-limit-stat">
                    <span className="rate-limit-stat-label">Remaining</span>
                    <span className="rate-limit-stat-value rate-limit-remaining">
                      {status.requestsRemaining.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tier & Reset Card */}
            <div className="rate-limit-card">
              <div className="rate-limit-card-header">
                <h3>Plan Details</h3>
              </div>
              <div className="rate-limit-card-body">
                <div className="rate-limit-detail-row">
                  <span className="rate-limit-detail-label">Current Tier:</span>
                  <span className="rate-limit-detail-value">{status.tier}</span>
                </div>
                <div className="rate-limit-detail-row">
                  <span className="rate-limit-detail-label">Reset Time:</span>
                  <span className="rate-limit-detail-value">{formatDate(status.resetTime)}</span>
                </div>
                <div className="rate-limit-detail-row">
                  <span className="rate-limit-detail-label">Time Remaining:</span>
                  <span className="rate-limit-detail-value rate-limit-time-remaining">
                    {timeRemaining}
                  </span>
                </div>
                <a href="#pricing" className="rate-limit-upgrade-link">
                  View upgrade options →
                </a>
              </div>
            </div>
          </div>

          {/* Endpoint Usage Table */}
          <div className="rate-limit-endpoints-section">
            <h3>Endpoint Usage</h3>
            <div className="rate-limit-table-container">
              <table className="rate-limit-table">
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th className="rate-limit-usage-header">Usage</th>
                    <th className="rate-limit-stats-header">Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {status.endpoints.map((ep) => (
                    <EndpointUsageRow
                      key={`${ep.method}:${ep.path}`}
                      endpoint={ep}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {(() => {
            const forecast = calculateUsageForecast(status.usageHistory ?? [], status.requestsLimit);
            return (
              <div className="rate-limit-forecast-section" data-testid="rate-limit-forecast">
                <h3>Usage Forecast</h3>
                <p className="rate-limit-forecast-summary">
                  Current trend: <strong>{forecast.requestsPerHour.toLocaleString()} requests/hour</strong>
                  {forecast.hoursUntilLimit === null
                    ? '. No increasing trend detected.'
                    : ` . Limit projected in ${forecast.hoursUntilLimit.toFixed(1)} hours (${formatDate(forecast.projectedAtLimit!)})`}
                </p>
                <ul className="rate-limit-tips">
                  <li>Prefer webhooks and cached responses for repeated reads.</li>
                  <li>Batch compatible operations to reduce request volume.</li>
                  <li>Use exponential backoff when usage approaches the limit.</li>
                </ul>
              </div>
            );
          })()}

          {/* Help Section */}
          <div className="rate-limit-help-section">
            <h3>Tips to Manage Your Rate Limit</h3>
            <ul className="rate-limit-tips">
              <li>
                <strong>Use webhooks:</strong> Receive real-time updates instead of polling
              </li>
              <li>
                <strong>Batch requests:</strong> Combine multiple operations into a single API call
              </li>
              <li>
                <strong>Cache responses:</strong> Store frequently accessed data locally
              </li>
              <li>
                <strong>Implement backoff:</strong> Exponential backoff when rate limit is approached
              </li>
              <li>
                <strong>Monitor usage:</strong> Use this dashboard to track endpoint usage patterns
              </li>
            </ul>
            <p className="rate-limit-help-cta">
              Need help? Check our <a href="/api">API documentation</a> or{' '}
              <a href="/support">contact support</a>.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
