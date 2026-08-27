import React from 'react';
import Layout from '@theme/Layout';
import { METRIC_DEFINITIONS } from '../components/LogsDashboard';

/**
 * Reference page: plain-language definitions for every metric shown on the
 * Server Logs Analytics dashboard. Linked from each metric's "docs" affordance.
 */
export default function LogsGlossaryPage(): React.JSX.Element {
  return (
    <Layout
      title="Logs Metrics Glossary"
      description="Definitions for the metrics shown on the ProxyPay server logs analytics dashboard"
    >
      <main
        style={{
          maxWidth: 820,
          margin: '0 auto',
          padding: '2.5rem 1.5rem 4rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <h1 style={{ marginBottom: '0.5rem' }}>📖 Logs Metrics Glossary</h1>
        <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '2rem' }}>
          Every metric on the{' '}
          <a href="/logs">Server Logs Analytics dashboard</a> explained. Percentile latencies
          (P95/P99) describe tail behaviour and are usually more actionable than a plain average.
        </p>

        <dl data-testid="metrics-glossary">
          {Object.entries(METRIC_DEFINITIONS).map(([name, definition]) => (
            <div
              key={name}
              id={name.toLowerCase().replace(/\s+/g, '-')}
              style={{
                padding: '1rem 1.25rem',
                marginBottom: '0.75rem',
                background: '#f8fafc',
                border: '1px solid #e8ecf0',
                borderRadius: 10,
              }}
            >
              <dt style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                {name}
              </dt>
              <dd style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>{definition}</dd>
            </div>
          ))}
        </dl>

        <h2 style={{ marginTop: '2.5rem' }}>Further reading</h2>
        <ul style={{ color: '#475569', lineHeight: 1.8 }}>
          <li>
            <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Status">
              MDN — HTTP response status codes
            </a>
          </li>
          <li>
            <a href="https://sre.google/sre-book/monitoring-distributed-systems/">
              Google SRE Book — Monitoring distributed systems (latency, errors, saturation)
            </a>
          </li>
        </ul>
      </main>
    </Layout>
  );
}
