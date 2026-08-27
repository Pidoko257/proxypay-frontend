/**
 * Advanced Logs Dashboard with Filters
 * Enhanced dashboard with interactive filters and date range selection
 */

import React, { useState, useCallback, useMemo } from 'react';
import { AnalyticsResult } from '../analytics/analytics-engine';
import { LogAnalyticsEngine } from '../analytics/analytics-engine';
import { ParsedLogEntry } from '../analytics/log-parser';
import { ExportControls, FilterState } from './ExportControls';
import '../css/logs-dashboard.css';

interface AdvancedDashboardProps {
  logs: ParsedLogEntry[];
  initialAnalytics?: AnalyticsResult;
}

export const AdvancedLogsDashboard: React.FC<AdvancedDashboardProps> = ({ logs, initialAnalytics }) => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [filters, setFilters] = useState<FilterState>({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    endpoint: '',
    method: '',
    statusCode: '',
    minResponseTime: 0,
    maxResponseTime: 10000,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Filter logs based on filter state
  const filteredLogs = useMemo(() => {
    let result = logs;

    // Date range filter
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);

    result = result.filter(log => log.timestamp >= startDate && log.timestamp <= endDate);

    // Endpoint filter
    if (filters.endpoint) {
      const regex = new RegExp(filters.endpoint, 'i');
      result = result.filter(log => regex.test(log.endpoint));
    }

    // Method filter
    if (filters.method) {
      result = result.filter(log => log.method === filters.method);
    }

    // Status code filter
    if (filters.statusCode) {
      if (filters.statusCode.startsWith('2')) {
        result = result.filter(log => log.statusCode >= 200 && log.statusCode < 300);
      } else if (filters.statusCode.startsWith('3')) {
        result = result.filter(log => log.statusCode >= 300 && log.statusCode < 400);
      } else if (filters.statusCode.startsWith('4')) {
        result = result.filter(log => log.statusCode >= 400 && log.statusCode < 500);
      } else if (filters.statusCode.startsWith('5')) {
        result = result.filter(log => log.statusCode >= 500 && log.statusCode < 600);
      }
    }

    // Response time filter
    result = result.filter(
      log => log.responseTime >= filters.minResponseTime && log.responseTime <= filters.maxResponseTime
    );

    return result;
  }, [logs, filters]);

  // Get unique values for filters
  const uniqueEndpoints = useMemo(() => [...new Set(logs.map(l => l.endpoint))], [logs]);
  const uniqueMethods = useMemo(() => [...new Set(logs.map(l => l.method))], [logs]);

  // Calculate analytics for filtered logs
  const analytics = useMemo(() => {
    if (filteredLogs.length === 0) {
      return initialAnalytics || createEmptyAnalytics();
    }
    return LogAnalyticsEngine.analyze(filteredLogs);
  }, [filteredLogs, initialAnalytics]);

  const anomalyExplanations = useMemo(() => {
    const explanations: Array<{ title: string; explanation: string; steps: string[] }> = [];
    if (analytics.errorRate > 5) {
      explanations.push({
        title: 'Elevated error rate',
        explanation: 'A large share of requests is failing, which can indicate an unhealthy dependency, invalid client input, or a recent deployment issue.',
        steps: ['Group errors by endpoint and status code.', 'Check dependency and deployment health.', 'Review the first occurrence time for a recent change.'],
      });
    }
    if (analytics.p95ResponseTime > 1000 || analytics.avgResponseTime > 500) {
      explanations.push({
        title: 'Slow responses',
        explanation: 'The response-time distribution suggests overloaded workers, slow database queries, or an upstream service delay.',
        steps: ['Compare the slowest endpoints in the Endpoints tab.', 'Inspect database and upstream latency.', 'Check traffic volume around the slow period.'],
      });
    }
    if (analytics.statusCodeBreakdown.some(status => status.code >= 500)) {
      explanations.push({
        title: 'Server-side failures',
        explanation: '5xx responses mean the service could not complete requests and usually require server or dependency investigation.',
        steps: ['Review application and dependency logs.', 'Check capacity, health checks, and recent deployments.', 'Capture a representative request for reproduction.'],
      });
    }
    return explanations;
  }, [analytics]);

  const handleFilterChange = useCallback(
    (key: keyof FilterState, value: any) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleResetFilters = useCallback(() => {
    setFilters({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      endpoint: '',
      method: '',
      statusCode: '',
      minResponseTime: 0,
      maxResponseTime: 10000,
    });
  }, []);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (num: number) => {
    return Math.round(num).toLocaleString();
  };

  const formatPercent = (num: number) => {
    return num.toFixed(2) + '%';
  };

  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'status-success';
    if (code >= 300 && code < 400) return 'status-redirect';
    if (code >= 400 && code < 500) return 'status-client-error';
    if (code >= 500 && code < 600) return 'status-server-error';
    return 'status-unknown';
  };

  return (
    <div className="logs-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>📊 Server Logs Analytics</h1>
        <div className="header-info">
          <div className="info-item">
            <span className="label">Logs Analyzed:</span>
            <span className="value">{formatNumber(filteredLogs.length)}</span>
          </div>
          <div className="info-item">
            <span className="label">Error Rate:</span>
            <span className={`value ${analytics.errorRate > 5 ? 'error' : 'success'}`}>
              {formatPercent(analytics.errorRate)}
            </span>
          </div>
          <div className="info-item">
            <span className="label">Avg Response:</span>
            <span className="value">{formatNumber(analytics.avgResponseTime)}ms</span>
          </div>
        </div>
      </div>

      {/* Export Controls */}
      <div className="export-section">
        {analytics && <ExportControls analytics={analytics} filters={filters} />}
      </div>

      {/* Filter Bar */}
      <div className="filter-section">
        <div className="filter-header">
          <button
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? '🔽' : '▶️'} Advanced Filters
          </button>
          <button className="filter-reset" onClick={handleResetFilters}>
            Reset Filters
          </button>
        </div>

        {showFilters && (
          <div className="filter-grid">
            <div className="filter-group">
              <label>Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Endpoint</label>
              <input
                type="text"
                placeholder="Filter by endpoint (regex)"
                value={filters.endpoint}
                onChange={(e) => handleFilterChange('endpoint', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Method</label>
              <select value={filters.method} onChange={(e) => handleFilterChange('method', e.target.value)}>
                <option value="">All Methods</option>
                {uniqueMethods.map(method => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Status Code</label>
              <select value={filters.statusCode} onChange={(e) => handleFilterChange('statusCode', e.target.value)}>
                <option value="">All Status Codes</option>
                <option value="2">2xx (Success)</option>
                <option value="3">3xx (Redirect)</option>
                <option value="4">4xx (Client Error)</option>
                <option value="5">5xx (Server Error)</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Min Response Time (ms)</label>
              <input
                type="number"
                min="0"
                value={filters.minResponseTime}
                onChange={(e) => handleFilterChange('minResponseTime', parseInt(e.target.value))}
              />
            </div>

            <div className="filter-group">
              <label>Max Response Time (ms)</label>
              <input
                type="number"
                min="0"
                value={filters.maxResponseTime}
                onChange={(e) => handleFilterChange('maxResponseTime', parseInt(e.target.value))}
              />
            </div>
          </div>
        )}
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

            {anomalyExplanations.length > 0 && (
              <section className="anomaly-explanations" aria-labelledby="anomaly-explanations-title">
                <h3 id="anomaly-explanations-title">Anomaly explanations</h3>
                {anomalyExplanations.map(anomaly => (
                  <article key={anomaly.title} className="anomaly-explanation">
                    <h4>{anomaly.title}</h4>
                    <p>{anomaly.explanation}</p>
                    <strong>Suggested checks</strong>
                    <ul>{anomaly.steps.map(step => <li key={step}>{step}</li>)}</ul>
                  </article>
                ))}
                <a href="/logs-glossary">Read the logs troubleshooting guide</a>
              </section>
            )}

            <div className="chart-section">
              <h3>Status Code Distribution</h3>
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
                          width: `${analytics.totalRequests > 0 ? (status.count / analytics.totalRequests) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <div className="status-info">{formatPercent(status.percentage)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-section">
              <h3>Hourly Usage Pattern</h3>
              <div className="hourly-chart">
                {analytics.usageByHour.map(pattern => (
                  <div
                    key={pattern.hour}
                    className="hour-bar"
                    title={`Hour ${pattern.hour}: ${pattern.count} requests`}
                  >
                    <div
                      className="bar-fill"
                      style={{
                        height: `${
                          Math.max(...analytics.usageByHour.map(p => p.count)) > 0
                            ? (pattern.count / Math.max(...analytics.usageByHour.map(p => p.count))) * 100
                            : 0
                        }%`,
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
          </div>
        )}

        {/* Endpoints Tab */}
        {selectedTab === 'endpoints' && (
          <div className="tab-content endpoints-tab">
            <div className="endpoints-list">
              {analytics.topEndpoints.length > 0 ? (
                analytics.topEndpoints.map((endpoint, idx) => (
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
                ))
              ) : (
                <div className="no-data">No endpoints found matching filters</div>
              )}
            </div>
          </div>
        )}

        {/* Errors Tab */}
        {selectedTab === 'errors' && (
          <div className="tab-content errors-tab">
            <div className="errors-list">
              {analytics.topErrors.length > 0 ? (
                analytics.topErrors.map((error, idx) => (
                  <div key={error.error} className="error-item">
                    <div className="error-rank">{idx + 1}</div>
                    <div className="error-details">
                      <div className="error-message">{error.error}</div>
                      <div className="error-meta">
                        <span className="count">Count: {formatNumber(error.count)}</span>
                        <span className="percentage">{formatPercent(error.percentage)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-data">No errors found in this time period</div>
              )}
            </div>
          </div>
        )}

        {/* Usage Tab */}
        {selectedTab === 'usage' && (
          <div className="tab-content usage-tab">
            <h3>Request Timeline</h3>
            <div className="timeline-chart">
              {analytics.usageByHour.map(pattern => (
                <div key={pattern.hour} className="timeline-item">
                  <div className="time">{pattern.hour}:00</div>
                  <div className="requests" title={`${pattern.count} requests`}>
                    {Array.from({ length: Math.min(Math.ceil(pattern.count / 100), 10) }).map((_, i) => (
                      <span key={i} className="dot">
                        ●
                      </span>
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
                  {analytics.topUsers.length > 0 ? (
                    analytics.topUsers.map((user, idx) => (
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
                    ))
                  ) : (
                    <div className="no-data">No user data available</div>
                  )}
                </div>
              </div>

              <div className="ips-section">
                <h3>Top IPs</h3>
                <div className="ips-list">
                  {analytics.topIPs.length > 0 ? (
                    analytics.topIPs.map((ip, idx) => (
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
                    ))
                  ) : (
                    <div className="no-data">No IP data available</div>
                  )}
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

function createEmptyAnalytics(): AnalyticsResult {
  return {
    totalRequests: 0,
    totalErrors: 0,
    errorRate: 0,
    dateRange: { start: new Date(), end: new Date() },
    topEndpoints: [],
    topErrors: [],
    usageByHour: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0, avgResponseTime: 0, errorRate: 0 })),
    statusCodeBreakdown: [],
    topUsers: [],
    topIPs: [],
    avgResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
  };
}

export default AdvancedLogsDashboard;
