/**
 * TroubleshootingDocs Component
 * Provides troubleshooting documentation and resources based on error type
 */

import React, { useMemo } from 'react';

interface TroubleshootingDocsProps {
  /** The endpoint to show troubleshooting docs for */
  endpoint: {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    avgResponseTime: number;
    slaTarget: number;
    throughput: number;
    p99: number;
  };
}

interface DocLink {
  title: string;
  description: string;
  url: string;
  icon: string;
}

interface TroubleshootingTopic {
  title: string;
  icon: string;
  description: string;
  links: DocLink[];
  applicableIf?: (endpoint: TroubleshootingDocsProps['endpoint']) => boolean;
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  topicGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  topicCard: {
    background: '#f8fafc',
    borderRadius: 12,
    border: '1px solid #e8ecf0',
    padding: '1.5rem',
    transition: 'all 0.2s',
  },
  topicHeader: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  topicDescription: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '1rem',
    lineHeight: 1.5,
  },
  linksList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  docLink: {
    display: 'block',
    padding: '0.75rem 1rem',
    background: '#fff',
    borderRadius: 8,
    border: '1px solid #e8ecf0',
    textDecoration: 'none',
    color: '#1e293b',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  linkTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '0.25rem',
  },
  linkDescription: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  quickTips: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 10,
    padding: '1.25rem',
    marginBottom: '1.5rem',
  },
  quickTipsTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#166534',
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  quickTipsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  quickTip: {
    fontSize: '0.9rem',
    color: '#166534',
    paddingLeft: '1.5rem',
    position: 'relative' as const,
  },
  resourcesSection: {
    background: '#f8fafc',
    borderRadius: 10,
    border: '1px solid #e8ecf0',
    padding: '1.25rem',
  },
  resourceTitle: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '0.75rem',
  },
  resourceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '1rem',
  },
  resourceCard: {
    background: '#fff',
    borderRadius: 8,
    border: '1px solid #e8ecf0',
    padding: '1rem',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  resourceIcon: {
    fontSize: '1.5rem',
    marginBottom: '0.5rem',
  },
  resourceName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#1e293b',
  },
};

// Troubleshooting topics
const TROUBLESHOOTING_TOPICS: TroubleshootingTopic[] = [
  {
    title: 'High Latency Issues',
    icon: '⏱️',
    description: 'Diagnose and fix slow response times',
    applicableIf: (ep) => ep.avgResponseTime > ep.slaTarget,
    links: [
      {
        title: 'Database Query Optimization',
        description: 'Improve query performance and add indexes',
        url: 'https://docs.proxypay.com/guides/optimization/database',
        icon: '🗄️',
      },
      {
        title: 'Caching Strategies',
        description: 'Implement Redis and application-level caching',
        url: 'https://docs.proxypay.com/guides/optimization/caching',
        icon: '💾',
      },
      {
        title: 'Load Balancing',
        description: 'Distribute traffic across multiple servers',
        url: 'https://docs.proxypay.com/guides/infrastructure/load-balancing',
        icon: '⚖️',
      },
      {
        title: 'Connection Pooling',
        description: 'Reuse database connections efficiently',
        url: 'https://docs.proxypay.com/guides/optimization/connection-pool',
        icon: '🔗',
      },
    ],
  },
  {
    title: 'Error Rate & 5xx Errors',
    icon: '❌',
    description: 'Debug and resolve server-side errors',
    links: [
      {
        title: 'Server Error Debugging',
        description: 'Common 500, 502, 503 errors and solutions',
        url: 'https://docs.proxypay.com/guides/troubleshooting/5xx-errors',
        icon: '🔧',
      },
      {
        title: 'Exception Handling',
        description: 'Best practices for handling and logging exceptions',
        url: 'https://docs.proxypay.com/guides/development/error-handling',
        icon: '⚠️',
      },
      {
        title: 'Circuit Breaker Pattern',
        description: 'Implement circuit breakers for resilience',
        url: 'https://docs.proxypay.com/guides/patterns/circuit-breaker',
        icon: '🛑',
      },
      {
        title: 'Monitoring & Alerting',
        description: 'Set up alerts for error spikes',
        url: 'https://docs.proxypay.com/guides/monitoring/alerting',
        icon: '🔔',
      },
    ],
  },
  {
    title: 'Throughput & Rate Limiting',
    icon: '🔄',
    description: 'Handle traffic spikes and rate limits',
    applicableIf: (ep) => ep.throughput < 50,
    links: [
      {
        title: 'Rate Limiting Guide',
        description: 'Understanding and working with rate limits',
        url: 'https://docs.proxypay.com/guides/api/rate-limiting',
        icon: '⏳',
      },
      {
        title: 'Horizontal Scaling',
        description: 'Scale services horizontally for higher throughput',
        url: 'https://docs.proxypay.com/guides/infrastructure/scaling',
        icon: '📈',
      },
      {
        title: 'Request Queuing',
        description: 'Implement message queues for async processing',
        url: 'https://docs.proxypay.com/guides/patterns/request-queuing',
        icon: '📬',
      },
      {
        title: 'API Best Practices',
        description: 'Optimize API usage and batching',
        url: 'https://docs.proxypay.com/guides/api/best-practices',
        icon: '💡',
      },
    ],
  },
  {
    title: 'Tail Latency (p99)',
    icon: '📊',
    description: 'Fix high percentile latencies',
    applicableIf: (ep) => ep.p99 > ep.slaTarget * 2,
    links: [
      {
        title: 'Understanding Percentiles',
        description: 'Why p99 matters and how to optimize it',
        url: 'https://docs.proxypay.com/guides/monitoring/percentiles',
        icon: '📈',
      },
      {
        title: 'Garbage Collection Tuning',
        description: 'Optimize GC to reduce latency spikes',
        url: 'https://docs.proxypay.com/guides/optimization/gc-tuning',
        icon: '🧹',
      },
      {
        title: 'Network Optimization',
        description: 'Reduce network latency and timeouts',
        url: 'https://docs.proxypay.com/guides/infrastructure/network',
        icon: '🌐',
      },
      {
        title: 'Microservices Patterns',
        description: 'Optimize inter-service communication',
        url: 'https://docs.proxypay.com/guides/architecture/microservices',
        icon: '🏗️',
      },
    ],
  },
  {
    title: 'Availability & Uptime',
    icon: '📡',
    description: 'Improve service reliability',
    links: [
      {
        title: 'High Availability Design',
        description: 'Build redundant, resilient services',
        url: 'https://docs.proxypay.com/guides/architecture/ha',
        icon: '🔐',
      },
      {
        title: 'Disaster Recovery',
        description: 'Prepare for and recover from failures',
        url: 'https://docs.proxypay.com/guides/operations/disaster-recovery',
        icon: '🚨',
      },
      {
        title: 'Health Checks',
        description: 'Implement proper service health checks',
        url: 'https://docs.proxypay.com/guides/monitoring/health-checks',
        icon: '💓',
      },
      {
        title: 'SLA Management',
        description: 'Maintain and meet SLA commitments',
        url: 'https://docs.proxypay.com/guides/operations/sla',
        icon: '📜',
      },
    ],
  },
];

/**
 * Generate quick tips based on endpoint metrics
 */
function generateQuickTips(endpoint: TroubleshootingDocsProps['endpoint']): string[] {
  const tips: string[] = [];

  if (endpoint.avgResponseTime > endpoint.slaTarget * 1.5) {
    tips.push('Enable query caching to reduce database load');
    tips.push('Consider implementing a CDN for static content');
  }

  if (endpoint.throughput < 50) {
    tips.push('Review connection pool settings for database');
    tips.push('Check if backend services are hitting resource limits');
  }

  if (endpoint.p99 > endpoint.slaTarget * 2) {
    tips.push('Investigate GC pauses in the application');
    tips.push('Add monitoring for long-running queries');
  }

  if (tips.length === 0) {
    tips.push('Monitor for performance regressions');
    tips.push('Keep dependencies updated for performance improvements');
    tips.push('Profile the application regularly');
  }

  return tips;
}

/**
 * TroubleshootingDocs Component
 * Shows curated troubleshooting documentation based on endpoint issues
 */
export function TroubleshootingDocs({ endpoint }: TroubleshootingDocsProps): React.JSX.Element {
  const applicableTopics = useMemo(
    () =>
      TROUBLESHOOTING_TOPICS.filter((topic) =>
        topic.applicableIf ? topic.applicableIf(endpoint) : true
      ),
    [endpoint]
  );

  const quickTips = useMemo(() => generateQuickTips(endpoint), [endpoint]);

  return (
    <div style={styles.container}>
      {/* Quick Tips */}
      <div style={styles.quickTips}>
        <div style={styles.quickTipsTitle}>
          💡 Quick Tips
        </div>
        <ul style={styles.quickTipsList}>
          {quickTips.map((tip, idx) => (
            <li key={idx} style={styles.quickTip}>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Troubleshooting Topics */}
      <div style={styles.topicGrid}>
        {applicableTopics.map((topic, idx) => (
          <div
            key={idx}
            style={styles.topicCard}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '';
              (e.currentTarget as HTMLElement).style.transform = '';
            }}
          >
            <div style={styles.topicHeader}>
              <span>{topic.icon}</span>
              <span>{topic.title}</span>
            </div>
            <div style={styles.topicDescription}>{topic.description}</div>
            <div style={styles.linksList}>
              {topic.links.map((link, linkIdx) => (
                <a
                  key={linkIdx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.docLink}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#f0fdf4';
                    (e.currentTarget as HTMLElement).style.borderColor = '#bbf7d0';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#fff';
                    (e.currentTarget as HTMLElement).style.borderColor = '#e8ecf0';
                  }}
                >
                  <div style={styles.linkTitle}>
                    {link.icon} {link.title}
                  </div>
                  <div style={styles.linkDescription}>{link.description}</div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Additional Resources */}
      <div style={styles.resourcesSection}>
        <div style={styles.resourceTitle}>📚 Additional Resources</div>
        <div style={styles.resourceGrid}>
          <a
            href="https://docs.proxypay.com"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.resourceCard}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#f0fdf4';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#fff';
            }}
          >
            <div style={styles.resourceIcon}>📖</div>
            <div style={styles.resourceName}>Full Documentation</div>
          </a>
          <a
            href="https://api.proxypay.com/support"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.resourceCard}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#f0fdf4';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#fff';
            }}
          >
            <div style={styles.resourceIcon}>🆘</div>
            <div style={styles.resourceName}>Support Portal</div>
          </a>
          <a
            href="https://community.proxypay.com"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.resourceCard}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#f0fdf4';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#fff';
            }}
          >
            <div style={styles.resourceIcon}>👥</div>
            <div style={styles.resourceName}>Community</div>
          </a>
          <a
            href="https://status.proxypay.com"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.resourceCard}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#f0fdf4';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#fff';
            }}
          >
            <div style={styles.resourceIcon}>📊</div>
            <div style={styles.resourceName}>Status Page</div>
          </a>
        </div>
      </div>
    </div>
  );
}

export default TroubleshootingDocs;
