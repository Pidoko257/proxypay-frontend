import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import AuditTrail from '../components/AuditTrail';
import TransactionDrawer from '../components/TransactionDrawer';

export default function Home(): React.JSX.Element {
  return (
    <Layout title="Developer Portal" description="ProxyPay partner API docs">
      <main style={{ padding: '4rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
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

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <hr style={{ margin: '3rem 0', borderColor: '#e5e7eb' }} />

        {/* ── Issue #502 / #503 — Transaction Drawer ────────────────────── */}
        <section aria-labelledby="transaction-drawer-heading">
          <h2
            id="transaction-drawer-heading"
            style={{ fontSize: '1.1rem', fontWeight: 700, color: '#6b7280', marginBottom: '1rem' }}
          >
            Transaction Details Preview
          </h2>
          <TransactionDrawer />
        </section>

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <hr style={{ margin: '3rem 0', borderColor: '#e5e7eb' }} />

        {/* ── Issue #501 — Audit Trail ───────────────────────────────────── */}
        <AuditTrail />
      </main>
    </Layout>
  );
}
