/**
 * ErrorLogViewer Component
 * Displays recent errors and error patterns for a specific endpoint
 */

import React, { useMemo } from 'react';

export interface ErrorLogEntry {
  timestamp: Date;
  endpoint: string;
  method: string;
  statusCode: number;
  error?: string;
  responseTime: number;
  userId?: string;
  ip?: string;
}

interface ErrorLogViewerProps {
  /** The endpoint to show error logs for */
  endpoint: {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    avgResponseTime: number;
  };
}

// Mock error log data for demonstration
function generateMockErrorLogs(
  endpoint: string,
  method: string,
  count: number = 20
): ErrorLogEntry[] {
  const errorPatterns = [
    { code: 500, error: 'Internal Server Error - Database connection timeout', probability: 0.4 },
    { code: 503, error: 'Service Unavailable - High load detected', probability: 0.3 },
    { code: 504, error: 'Gateway Timeout - Backend processing timeout', probability: 0.2 },
    { code: 429, error: 'Too Many Requests - Rate limit exceeded', probability: 0.1 },
  ];

  const logs: ErrorLogEntry[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const rand = Math.random();
    let pattern = errorPatterns[0];
    
    let sum = 0;
    for (const p of errorPatterns) {
      sum += p.probability;
      if (rand <= sum) {
        pattern = p;
        break;
      }
    }

    logs.push({
      timestamp: new Date(now.getTime() - i * 1000 * 60 * (Math.random() * 30 + 5)),
      endpoint,
      method,
      statusCode: pattern.code,
      error: pattern.error,
      responseTime: Math.round(1000 + Math.random() * 3000),
      userId: `user_${Math.floor(Math.random() * 100)}`,
      ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    });
  }

  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// ── Helper Functions ──────────────────────────────────────────────
function getStatusBadgeStyle(code: number): React.CSSProperties {
  let bg = '#dcfce7',
    fg = '#166534';
  if (code >= 500) {
    bg = '#fee2e2';
    fg = '#991b1b';
  } else if (code >= 400) {
    bg = '#fef3c7';
    fg = '#92400e';
  }
  return {
    display: 'inline-block',
    padding: '0.2rem 0.6rem',
    borderRadius: 6,
    fontSize: '0.8rem',
    fontWeight: 700,
    background: bg,
    color: fg,
  };
}

// ── Styles ────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  } as React.CSSProperties,
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
  },
  summaryCard: {
    background: '#f8fafc',
    borderRadius: 10,
    border: '1px solid #e8ecf0',
    padding: '1rem',
    textAlign: 'center' as const,
  },
  summaryLabel: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.35rem',
  },
  summaryValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1e293b',
  },
  errorTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    background: '#fff',
    borderRadius: 10,
    border: '1px solid #e8ecf0',
    overflow: 'hidden',
  },
  th: {
    textAlign: 'left' as const,
    padding: '0.75rem 1rem',
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: '2px solid #e8ecf0',
    background: '#f8fafc',
  },
  td: {
    padding: '0.75rem 1rem',
    fontSize: '0.9rem',
    color: '#475569',
    borderBottom: '1px solid #f1f5f9',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.2rem 0.6rem',
    borderRadius: 6,
    fontSize: '0.8rem',
    fontWeight: 700,
  } as React.CSSProperties,
  emptyState: {
    textAlign: 'center' as const,
    padding: '2rem 1rem',
    color: '#94a3b8',
  },
  errorPatterns: {
    marginTop: '1rem',
  },
  patternTitle: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '0.75rem',
  },
  patternItem: {
    background: '#f8fafc',
    borderRadius: 8,
    padding: '0.75rem 1rem',
    marginBottom: '0.5rem',
    borderLeft: '4px solid #ef4444',
  },
  patternError: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '0.25rem',
  },
  patternMeta: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
};

/**
 * ErrorLogViewer Component
 * Shows recent error logs and error patterns for an endpoint
 */
export function ErrorLogViewer({ endpoint }: ErrorLogViewerProps): React.JSX.Element {
  const logs = useMemo(() => generateMockErrorLogs(endpoint.endpoint, endpoint.method), [
    endpoint.endpoint,
    endpoint.method,
  ]);

  // Error statistics
  const stats = useMemo(() => {
    const errorLogs = logs.filter((l) => l.statusCode >= 400);
    const errorsByCode: Record<number, number> = {};
    const errorsByMessage: Record<string, number> = {};

    for (const log of errorLogs) {
      errorsByCode[log.statusCode] = (errorsByCode[log.statusCode] || 0) + 1;
      if (log.error) {
        errorsByMessage[log.error] = (errorsByMessage[log.error] || 0) + 1;
      }
    }

    return {
      total: logs.length,
      errors: errorLogs.length,
      errorRate: Math.round((errorLogs.length / logs.length) * 100),
      topErrors: Object.entries(errorsByMessage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  }, [logs]);

  const recentLogs = logs.slice(0, 10);

  return (
    <div style={styles.container}>
      {/* Statistics Summary */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Requests</div>
          <div style={styles.summaryValue}>{stats.total}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Errors</div>
          <div style={{ ...styles.summaryValue, color: '#ef4444' }}>{stats.errors}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Error Rate</div>
          <div style={{ ...styles.summaryValue, color: stats.errorRate > 5 ? '#ef4444' : '#22c55e' }}>
            {stats.errorRate}%
          </div>
        </div>
      </div>

      {/* Top Error Patterns */}
      {stats.topErrors.length > 0 && (
        <div style={styles.errorPatterns}>
          <div style={styles.patternTitle}>🔍 Top Error Patterns</div>
          {stats.topErrors.map(([error, count], idx) => (
            <div key={idx} style={styles.patternItem}>
              <div style={styles.patternError}>{error}</div>
              <div style={styles.patternMeta}>
                Occurred {count} time{count > 1 ? 's' : ''} ({Math.round((count / stats.errors) * 100)}% of errors)
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Error Logs Table */}
      <div>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>
          📋 Recent Error Logs (Last 10)
        </h4>

        {recentLogs.length === 0 ? (
          <div style={styles.emptyState}>No error logs found for this endpoint.</div>
        ) : (
          <table style={styles.errorTable}>
            <thead>
              <tr>
                <th style={styles.th}>Timestamp</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Response Time</th>
                <th style={styles.th}>Error Message</th>
                <th style={styles.th}>User ID</th>
                <th style={styles.th}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log, idx) => (
                <tr key={idx}>
                  <td style={styles.td}>
                    <code style={{ fontSize: '0.8rem' }}>
                      {log.timestamp.toLocaleTimeString()} {log.timestamp.toLocaleDateString()}
                    </code>
                  </td>
                  <td style={styles.td}>
                    <span style={getStatusBadgeStyle(log.statusCode)}>{log.statusCode}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontWeight: 600, color: log.responseTime > 1000 ? '#ef4444' : '#1e293b' }}>
                      {log.responseTime}ms
                    </span>
                  </td>
                  <td style={styles.td}>
                    <code style={{ fontSize: '0.8rem', color: '#666' }}>{log.error || 'N/A'}</code>
                  </td>
                  <td style={styles.td}>
                    <code style={{ fontSize: '0.8rem', color: '#666' }}>{log.userId || '—'}</code>
                  </td>
                  <td style={styles.td}>
                    <code style={{ fontSize: '0.8rem', color: '#666' }}>{log.ip || '—'}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default ErrorLogViewer;
