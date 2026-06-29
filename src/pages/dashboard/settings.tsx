import React from 'react';
import Layout from '@theme/Layout';
import DashboardLayout from '../../components/dashboard/DashboardLayout';

export default function DashboardSettingsPage(): React.JSX.Element {
  return (
    <Layout title="Settings" description="ProxyPay dashboard settings">
      <DashboardLayout
        title="Settings"
        subtitle="Configure API keys, webhooks, and dashboard preferences."
        activePath="/dashboard/settings"
      >
        <label htmlFor="dashboard-webhook-url" style={{ display: 'block', marginBottom: '0.5rem' }}>
          Webhook URL
        </label>
        <input
          id="dashboard-webhook-url"
          type="url"
          placeholder="https://example.com/webhooks/proxypay"
          style={{ width: '100%', maxWidth: '28rem', padding: '0.5rem 0.75rem' }}
        />
        <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--ifm-color-emphasis-700)' }}>
          Typing in this field will not trigger dashboard keyboard shortcuts.
        </p>
      </DashboardLayout>
    </Layout>
  );
}
