import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import DashboardLayout from '../components/DashboardLayout';

export default function DashboardPage(): React.JSX.Element {
  return (
    <Layout title="Dashboard" description="ProxyPay developer dashboard">
      <DashboardLayout>
        <h1>Developer Dashboard</h1>
        <p>Manage your ProxyPay integration from one place.</p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          <Link className="button button--primary" to="/keys">
            Manage API Keys
          </Link>
          <Link className="button button--secondary" to="/transaction-status">
            Check Transaction Status
          </Link>
          <Link className="button button--secondary" to="/api">
            API Reference
          </Link>
        </div>
      </DashboardLayout>
    </Layout>
  );
}
