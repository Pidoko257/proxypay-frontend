import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import DateRangePicker from '../components/DateRangePicker';

export default function Home(): React.JSX.Element {
  return (
    <Layout title="Developer Portal" description="ProxyPay partner API docs">
      <main style={{ padding: '4rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <h1>ProxyPay API Documentation Portal</h1>
        <p>
          This portal publishes a searchable, first-class API reference for partners using the
          canonical <code>openapi.yaml</code> in this repository.
        </p>
        <p>
          <Link className="button button--primary button--lg" to="/api">
            Open API Reference
          </Link>
        </p>

        <section
          style={{
            marginTop: '2rem',
            border: '1px solid var(--ifm-color-emphasis-300)',
            borderRadius: '12px',
            padding: '1.5rem',
            background: 'var(--ifm-background-surface-color)',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Reusable date range picker</h2>
          <p style={{ marginBottom: '1rem' }}>
            This picker supports preset ranges and a custom calendar selection for transaction
            filters, analytics dashboards, and reconciliation reports.
          </p>
          <DateRangePicker />
        </section>
      </main>
    </Layout>
  );
}
