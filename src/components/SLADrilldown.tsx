/**
 * SLADrilldown Component
 * Provides drill-down interface for SLA breaches with error logs and troubleshooting docs
 */

import React, { useState, useMemo, useLayoutEffect } from 'react';
import { ErrorLogViewer } from './ErrorLogViewer';
import { TroubleshootingDocs } from './TroubleshootingDocs';

export interface EndpointBenchmark {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  avgResponseTime: number;
  p50: number;
  p95: number;
  p99: number;
  throughput: number;
  uptime: number;
  slaTarget: number;
  slaStatus: 'ok' | 'warn' | 'breach';
  category: string;
}

interface SLADrilldownProps {
  /** The endpoint data to drill down into */
  endpoint: EndpointBenchmark;
  /** Whether to show the drilldown modal */
  isOpen: boolean;
  /** Callback when closing the modal */
  onClose: () => void;
}

// ── Helper Functions ──────────────────────────────────────────────
function getStatusBadgeStyle(status: string): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    ok: { bg: '#dcfce7', fg: '#166534' },
    warn: { bg: '#fef3c7', fg: '#92400e' },
    breach: { bg: '#fee2e2', fg: '#991b1b' },
  };
  const c = colors[status] || colors.ok;
  return {
    display: 'inline-block',
    padding: '0.3rem 0.75rem',
    borderRadius: 12,
    fontSize: '0.85rem',
    fontWeight: 700,
    background: c.bg,
    color: c.fg,
  };
}

// ── Styles ────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    transition: 'opacity 0.3s ease',
  },
  modal: {
    position: 'relative',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    width: '90%',
    maxWidth: 900,
    maxHeight: '90vh',
    overflow: 'auto',
    animation: 'slideUp 0.3s ease',
  },
  closeButton: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    color: '#94a3b8',
    transition: 'color 0.2s',
  },
  header: {
    padding: '2rem 2rem 1rem',
    borderBottom: '1px solid #e8ecf0',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  headerTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  content: {
    padding: '2rem',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  metricCard: {
    background: '#f8fafc',
    borderRadius: 10,
    border: '1px solid #e8ecf0',
    padding: '1.25rem',
    textAlign: 'center' as const,
  },
  metricLabel: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
  },
  metricValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1e293b',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '1rem',
    marginTop: '1.5rem',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #e8ecf0',
  },
  warningBox: {
    background: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: 10,
    padding: '1rem',
    marginBottom: '1.5rem',
    fontSize: '0.95rem',
    color: '#92400e',
  },
  breachBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: 10,
    padding: '1rem',
    marginBottom: '1.5rem',
    fontSize: '0.95rem',
    color: '#991b1b',
  },
  actionButton: {
    display: 'inline-block',
    padding: '0.5rem 1rem',
    borderRadius: 8,
    border: 'none',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginRight: '0.5rem',
  },
};

/**
 * Calculate SLA breach severity and recommendations
 */
function calculateSeverity(
  endpoint: EndpointBenchmark
): { severity: 'critical' | 'warning' | 'ok'; percentage: number } {
  const targetMs = endpoint.slaTarget;
  const actualMs = endpoint.avgResponseTime;
  const percentage = (actualMs / targetMs) * 100;

  if (percentage >= 150) return { severity: 'critical', percentage };
  if (percentage >= 100) return { severity: 'warning', percentage };
  return { severity: 'ok', percentage };
}

/**
 * Generate recommendations based on performance metrics
 */
function generateRecommendations(endpoint: EndpointBenchmark): string[] {
  const recommendations: string[] = [];
  const { severity, percentage } = calculateSeverity(endpoint);

  if (severity === 'critical') {
    recommendations.push(`🚨 Critical: Response time is ${Math.round(percentage - 100)}% above SLA target`);
  } else if (severity === 'warning') {
    recommendations.push(`⚠️ Warning: Response time is ${Math.round(percentage - 100)}% above SLA target`);
  }

  if (endpoint.uptime < 99.9) {
    recommendations.push(`📉 Uptime below target: Currently at ${endpoint.uptime}% (target: 99.9%)`);
  }

  if (endpoint.p99 > endpoint.slaTarget * 2) {
    recommendations.push(`📊 High tail latency (p99): Consider query optimization or caching`);
  }

  if (endpoint.throughput < 50) {
    recommendations.push(`🔄 Low throughput detected: ${endpoint.throughput} req/s may indicate bottleneck`);
  }

  return recommendations;
}

/**
 * SLADrilldown Component
 * Modal interface for viewing SLA breach details, errors, and troubleshooting steps
 */
export function SLADrilldown({ endpoint, isOpen, onClose }: SLADrilldownProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'overview' | 'errors' | 'docs'>('overview');
  
  const { severity, percentage } = useMemo(() => calculateSeverity(endpoint), [endpoint]);
  const recommendations = useMemo(() => generateRecommendations(endpoint), [endpoint]);

  // Add CSS animation
  useLayoutEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  if (!isOpen) return <></>;

  return (
    <>
      <div style={styles.overlay} onClick={onClose}>
        <div
          style={styles.modal}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            style={styles.closeButton}
            onClick={onClose}
            title="Close drill-down"
            aria-label="Close drill-down"
          >
            ✕
          </button>

          {/* Header */}
          <div style={styles.header}>
            <h2 style={styles.headerTitle}>
              {endpoint.method} {endpoint.endpoint}
            </h2>
            <span style={getStatusBadgeStyle(endpoint.slaStatus)}>
              {endpoint.slaStatus === 'breach' ? '🔴 Breach' : endpoint.slaStatus === 'warn' ? '⚠️ Warning' : '✅ OK'}
            </span>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #e8ecf0',
              background: '#f8fafc',
              paddingLeft: '2rem',
            }}
          >
            {['overview', 'errors', 'docs'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                style={{
                  padding: '1rem 1.5rem',
                  border: 'none',
                  background: activeTab === tab ? '#fff' : 'transparent',
                  color: activeTab === tab ? '#1e293b' : '#94a3b8',
                  fontSize: '0.95rem',
                  fontWeight: activeTab === tab ? 600 : 400,
                  cursor: 'pointer',
                  borderBottom: activeTab === tab ? '3px solid #3b82f6' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {tab === 'overview' && '📊 Overview'}
                {tab === 'errors' && '❌ Error Logs'}
                {tab === 'docs' && '📚 Troubleshooting'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={styles.content}>
            {activeTab === 'overview' && (
              <div>
                {/* Severity Alert */}
                {severity === 'critical' ? (
                  <div style={styles.breachBox}>
                    <strong>🚨 Critical SLA Breach</strong>
                    <p style={{ margin: '0.5rem 0 0' }}>
                      Average response time ({endpoint.avgResponseTime}ms) exceeds SLA target ({endpoint.slaTarget}ms) by{' '}
                      {Math.round(percentage - 100)}%
                    </p>
                  </div>
                ) : severity === 'warning' ? (
                  <div style={styles.warningBox}>
                    <strong>⚠️ SLA Warning</strong>
                    <p style={{ margin: '0.5rem 0 0' }}>
                      Response time approaching target: {endpoint.avgResponseTime}ms of {endpoint.slaTarget}ms target
                    </p>
                  </div>
                ) : null}

                {/* Key Metrics */}
                <div style={styles.metricsGrid}>
                  <div style={styles.metricCard}>
                    <div style={styles.metricLabel}>SLA Target</div>
                    <div style={styles.metricValue}>{endpoint.slaTarget}ms</div>
                  </div>
                  <div style={styles.metricCard}>
                    <div style={styles.metricLabel}>Avg Response</div>
                    <div style={styles.metricValue}>{endpoint.avgResponseTime}ms</div>
                  </div>
                  <div style={styles.metricCard}>
                    <div style={styles.metricLabel}>P95 Latency</div>
                    <div style={styles.metricValue}>{endpoint.p95}ms</div>
                  </div>
                  <div style={styles.metricCard}>
                    <div style={styles.metricLabel}>P99 Latency</div>
                    <div style={styles.metricValue}>{endpoint.p99}ms</div>
                  </div>
                  <div style={styles.metricCard}>
                    <div style={styles.metricLabel}>Throughput</div>
                    <div style={styles.metricValue}>{endpoint.throughput}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>req/s</div>
                  </div>
                  <div style={styles.metricCard}>
                    <div style={styles.metricLabel}>Uptime</div>
                    <div style={styles.metricValue}>{endpoint.uptime.toFixed(2)}%</div>
                  </div>
                </div>

                {/* Recommendations */}
                <h3 style={styles.sectionTitle}>📋 Recommendations</h3>
                <div>
                  {recommendations.length > 0 ? (
                    recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '0.75rem 1rem',
                          background: '#f1f5f9',
                          borderRadius: 8,
                          marginBottom: '0.5rem',
                          fontSize: '0.9rem',
                          color: '#334155',
                          borderLeft: '4px solid #3b82f6',
                        }}
                      >
                        {rec}
                      </div>
                    ))
                  ) : (
                    <div style={{ color: '#94a3b8' }}>No specific recommendations at this time.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'errors' && <ErrorLogViewer endpoint={endpoint} />}

            {activeTab === 'docs' && <TroubleshootingDocs endpoint={endpoint} />}
          </div>
        </div>
      </div>
    </>
  );
}

export default SLADrilldown;
