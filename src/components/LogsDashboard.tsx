/**
 * Server Logs Analytics Dashboard
 * React component for visualizing log analytics
 */

import React, { useState, useEffect } from 'react';
import { AnalyticsResult, EndpointMetrics, ErrorAnalysis } from '../analytics/analytics-engine';
import '../css/logs-dashboard.css';

interface DashboardProps {
  analytics: AnalyticsResult;
  onDateRangeChange?: (start: Date, end: Date) => void;
  onFilterChange?: (filter: string) => void;
}

export const LogsDashboard: React.FC<DashboardProps> = ({
  analytics,
  onDateRangeChange,
  onFilterChange,
}) => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [filterText, setFilterText] = useState('');

  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return Math.round(num).toLocaleString();
  };

  // Format percentage
  const formatPercent = (num: number) => {
    return num.toFixed(2) + '%';
  };

  // Get status code color
  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'status-success';
    if (code >= 300 && code < 400) return 'status-redirect';
    if (code >= 400 && code < 500) return 'status-client-error';
    if (code >= 500 && code < 600) return 'status-server-error';
    return 'status-unknown';
  };

  // Legend definitions shared across charts
  const STATUS_LEGEND = [
    { className: 'status-success', label: '2xx Success' },
    { className: 'status-redirect', label: '3xx Redirect' },
    { className: 'status-client-error', label: '4xx Client error' },
    { className: 'status-server-error', label: '5xx Server error' },
  ];

  const HOURLY_LEGEND = [
    { color: '#4ecdc4', label: 'Error rate ≤ 5%' },
    { color: '#ff6b6b', label: 'Error rate > 5%' },
  ];

  const ChartLegend = ({
    items,
  }: {
    items: { className?: string; color?: string; label: string }[];
  }) => (
    <ul className="chart-legend" aria-label="Chart legend">
      {items.map((item) => (
        <li key={item.label} className="chart-legend-item">
          <span
            className={`chart-legend-swatch ${item.className ?? ''}`}
            style={item.color ? { backgroundColor: item.color } : undefined}
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="logs-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>📊 Server Logs Analytics</h1>
        <div className="header-info">
          <div className="info-item">
            <span className="label">Period:</span>
            <span className="value">{formatDate(analytics.dateRange.start)} - {formatDate(analytics.dateRange.end)}</span>
          </div>
          <div className="info-item">
            <span className="label">Total Requests:</span>
            <span className="value">{formatNumber(analytics.totalRequests)}</span>
          </div>
          <div className="info-item">
            <span className="label">Error Rate:</span>
            <span className={`value ${analytics.errorRate > 5 ? 'error' : 'success'}`}>
              {formatPercent(analytics.errorRate)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab ${selectedTab === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedTab('overview')}
        >
          📈 Overview
        </button>
        <button
          className={`tab ${selectedTab === 'endpoints' ? 'active' : ''}`}
          onClick={() => setSelectedTab('endpoints')}
        >
          🔗 Endpoints
        </button>
        <button
          className={`tab ${selectedTab === 'errors' ? 'active' : ''}`}
          onClick={() => setSelectedTab('errors')}
        >
          ⚠️ Errors
        </button>
        <button
          className={`tab ${selectedTab === 'usage' ? 'active' : ''}`}
          onClick={() => setSelectedTab('usage')}
        >
          📅 Usage
        </button>
        <button
          className={`tab ${selectedTab === 'users' ? 'active' : ''}`}
          onClick={() => setSelectedTab('users')}
        >
          👥 Users & IPs
        </button>
      </div>

      {/* Content */}
      <div className="dashboard-content">
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="tab-content overview-tab">
            {/* Key Metrics */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">📊</div>
                <div className="metric-title">Total Requests</div>
                <div className="metric-value">{formatNumber(analytics.totalRequests)}</div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">❌</div>
                <div className="metric-title">Total Errors</div>
                <div className="metric-value">{formatNumber(analytics.totalErrors)}</div>
              </div>

              <div className="metric-card">
                <div className={`metric-icon ${analytics.errorRate > 5 ? 'warn' : ''}`}>⚠️</div>
                <div className="metric-title">Error Rate</div>
                <div className="metric-value">{formatPercent(analytics.errorRate)}</div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">⏱️</div>
                <div className="metric-title">Avg Response Time</div>
                <div className="metric-value">{formatNumber(analytics.avgResponseTime)}ms</div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">📈</div>
                <div className="metric-title">P95 Response Time</div>
                <div className="metric-value">{formatNumber(analytics.p95ResponseTime)}ms</div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">📊</div>
                <div className="metric-title">P99 Response Time</div>
                <div className="metric-value">{formatNumber(analytics.p99ResponseTime)}ms</div>
              </div>
            </div>

            {/* Status Code Distribution */}
            <figure className="chart-section">
              <figcaption>
                <h3>Status Code Distribution</h3>
                <p className="chart-subtitle">
                  Share of responses by HTTP status code (% of total requests)
                </p>
              </figcaption>
              <ChartLegend items={STATUS_LEGEND} />
              <div className="chart-axis-label chart-axis-x">
                Bar length = share of total requests (%)
              </div>
              <div className="status-code-bars">
                {analytics.statusCodeBreakdown.map(status => (
                  <div key={status.code} className="status-bar">
                    <div className="status-header">
                      <span className={`status-badge ${getStatusColor(status.code)}`}>
                        {status.code}
                      </span>
                      <span className="count">{formatNumber(status.count)}</span>
                    </div>
                    <div className="bar">
                      <div
                        className={`bar-fill ${getStatusColor(status.code)}`}
                        style={{
                          width: `${(status.count / analytics.totalRequests) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="status-info">{formatPercent(status.percentage)}</div>
                  </div>
                ))}
              </div>
            </figure>

            {/* Hourly Usage */}
            <figure className="chart-section">
              <figcaption>
                <h3>Hourly Usage Pattern</h3>
                <p className="chart-subtitle">
                  Requests received per hour of day, coloured by error rate
                </p>
              </figcaption>
              <ChartLegend items={HOURLY_LEGEND} />
              <div className="chart-with-y-axis">
                <span className="chart-axis-label chart-axis-y">Requests</span>
                <div className="hourly-chart">
                {analytics.usageByHour.map(pattern => (
                  <div key={pattern.hour} className="hour-bar" title={`Hour ${pattern.hour}: ${pattern.count} requests`}>
                    <div
                      className="bar-fill"
                      style={{
                        height: `${(pattern.count / Math.max(...analytics.usageByHour.map(p => p.count))) * 100}%`,
                        opacity: pattern.errorRate > 5 ? 0.7 : 1,
                        backgroundColor: pattern.errorRate > 5 ? '#ff6b6b' : '#4ecdc4',
                      }}
                    >
                      <span className="hour-label">{pattern.hour}h</span>
                    </div>
                  </div>
                ))}
                </div>
              </div>
              <div className="chart-axis-label chart-axis-x">Hour of day (0–23h)</div>
            </figure>
          </div>
        )}

        {/* Endpoints Tab */}
        {selectedTab === 'endpoints' && (
          <div className="tab-content endpoints-tab">
            <div className="filter-bar">
              <input
                type="text"
                placeholder="Filter endpoints..."
                value={filterText}
                onChange={(e) => {
                  setFilterText(e.target.value);
                  onFilterChange?.(e.target.value);
                }}
                className="filter-input"
              />
            </div>

            <div className="endpoints-list">
              {analytics.topEndpoints.map((endpoint, idx) => (
                <div key={`${endpoint.method}-${endpoint.endpoint}`} className="endpoint-item">
                  <div className="endpoint-rank">{idx + 1}</div>
                  <div className="endpoint-details">
                    <div className="endpoint-path">
                      <span className="method-badge">{endpoint.method}</span>
                      <span className="path">{endpoint.endpoint}</span>
                    </div>
                    <div className="endpoint-stats">
                      <span className="stat">Requests: {formatNumber(endpoint.count)}</span>
                      <span className="stat">Avg: {formatNumber(endpoint.avgResponseTime)}ms</span>
                      <span className="stat">Error: {formatPercent(endpoint.errorRate)}</span>
                    </div>
                  </div>
                  <div className="endpoint-performance">
                    <div className="perf-indicator">
                      <div
                        className="perf-bar"
                        style={{
                          width: `${Math.min((endpoint.avgResponseTime / 1000) * 100, 100)}%`,
                          backgroundColor: endpoint.avgResponseTime > 500 ? '#ff6b6b' : '#51cf66',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Errors Tab */}
        {selectedTab === 'errors' && (
          <div className="tab-content errors-tab">
            <div className="errors-list">
              {analytics.topErrors.map((error, idx) => (
                <div key={error.error} className="error-item">
                  <div className="error-rank">{idx + 1}</div>
                  <div className="error-details">
                    <div className="error-message">{error.error}</div>
                    <div className="error-meta">
                      <span className="count">Count: {formatNumber(error.count)}</span>
                      <span className="percentage">{formatPercent(error.percentage)}</span>
                      <span className="first">First: {formatDate(error.firstOccurrence)}</span>
                      <span className="last">Last: {formatDate(error.lastOccurrence)}</span>
                    </div>
                    <div className="affected-endpoints">
                      <span className="label">Endpoints:</span>
                      {error.endpoints.slice(0, 3).map(endpoint => (
                        <span key={endpoint} className="endpoint-tag">{endpoint}</span>
                      ))}
                      {error.endpoints.length > 3 && (
                        <span className="more">+{error.endpoints.length - 3}</span>
                      )}
                    </div>
                  </div>
                  <div className="error-severity">
                    <div
                      className="severity-bar"
                      style={{
                        width: `${(error.count / analytics.totalErrors) * 100}%`,
                        backgroundColor: '#ff6b6b',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Tab */}
        {selectedTab === 'usage' && (
          <div className="tab-content usage-tab">
            <h3>Request Timeline</h3>
            <p className="chart-subtitle">
              Per-hour request volume (each ● ≈ 100 requests), average response
              time in ms, and error rate
            </p>
            <ChartLegend
              items={[
                { color: '#4ecdc4', label: '● ≈ 100 requests' },
                { color: '#2ecc71', label: 'Error rate ≤ 5%' },
                { color: '#e74c3c', label: 'Error rate > 5%' },
              ]}
            />
            <div className="timeline-chart">
              {analytics.usageByHour.map(pattern => (
                <div key={pattern.hour} className="timeline-item">
                  <div className="time">{pattern.hour}:00</div>
                  <div className="requests" title={`${pattern.count} requests`}>
                    {Array.from({ length: Math.min(Math.ceil(pattern.count / 100), 10) }).map((_, i) => (
                      <span key={i} className="dot">●</span>
                    ))}
                  </div>
                  <div className="avg-time">{formatNumber(pattern.avgResponseTime)}ms</div>
                  <div className={`error-rate ${pattern.errorRate > 5 ? 'high' : 'low'}`}>
                    {formatPercent(pattern.errorRate)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users & IPs Tab */}
        {selectedTab === 'users' && (
          <div className="tab-content users-tab">
            <div className="users-ips-grid">
              <div className="users-section">
                <h3>Top Users</h3>
                <div className="users-list">
                  {analytics.topUsers.map((user, idx) => (
                    <div key={user.userId} className="user-item">
                      <div className="user-rank">{idx + 1}</div>
                      <div className="user-info">
                        <div className="user-id">{user.userId || 'Anonymous'}</div>
                        <div className="user-stats">
                          <span>{formatNumber(user.requestCount)} requests</span>
                          <span>{user.uniqueEndpoints} endpoints</span>
                          <span>{user.errorCount} errors</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ips-section">
                <h3>Top IPs</h3>
                <div className="ips-list">
                  {analytics.topIPs.map((ip, idx) => (
                    <div key={ip.ip} className="ip-item">
                      <div className="ip-rank">{idx + 1}</div>
                      <div className="ip-info">
                        <div className="ip-address">{ip.ip || 'Unknown'}</div>
                        <div className="ip-stats">
                          <span>{formatNumber(ip.requestCount)} requests</span>
                          <span>{ip.uniqueEndpoints} endpoints</span>
                          <span className={ip.errorCount > 0 ? 'has-errors' : ''}>{ip.errorCount} errors</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <span>Generated: {new Date().toLocaleString()}</span>
      </div>
    </div>
  );
};

export default LogsDashboard;
