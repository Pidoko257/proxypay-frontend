import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home(): React.JSX.Element {
  return (
    <Layout title="Developer Portal" description="ProxyPay partner API docs & developer tools">
      <main style={{ padding: '4rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: '1rem' }}>ProxyPay API Portal</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--ifm-color-emphasis-700)', marginBottom: '2rem' }}>
          This portal publishes first-class API reference documentation, developer tools, and account monitoring facilities
          for partners using the canonical <code>openapi.yaml</code> specification.
        </p>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '3rem' }}>
          <Link className="button button--primary button--lg" to="/api">
            📖 API Reference
          </Link>
          <Link className="button button--secondary button--lg" to="/dashboard">
            🖥️ Developer Dashboard
          </Link>
          <Link className="button button--secondary button--lg" to="/pricing">
            🧮 Pricing Calculator
          </Link>
          <Link className="button button--secondary button--lg" to="/settings">
            ⚙️ Notification Settings
          </Link>
        </div>

        <div className="premium-card">
          <h3>📦 Developer Tools Overview</h3>
          <ul>
            <li><strong>Developer Dashboard:</strong> Monitor Stellar ledger balances, check account status flags, query Horizon operations, and export transaction histories.</li>
            <li><strong>Pricing & Fee Calculator:</strong> Simulate conversion, routing, gas, and mobile money operator charges in real time.</li>
            <li><strong>Notification Settings:</strong> Configure email and webhook routing settings with optimistic updates.</li>
          </ul>
        </div>
      </main>
    </Layout>
  );
}

