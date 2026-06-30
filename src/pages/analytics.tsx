import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function AnalyticsPage(): React.JSX.Element {
  return (
    <Layout title="Analytics" description="ProxyPay transaction volume analytics">
      <main style={{ padding: '3rem 1.5rem', maxWidth: 1100, margin: '0 auto' }}>
        <h1>Transaction Volume</h1>
        <p style={{ color: 'var(--ifm-color-emphasis-700)', marginBottom: '2rem', maxWidth: 640 }}>
          Daily and cumulative transaction volume across all integrated currencies.
          Filter by currency and zoom into any date range to investigate trends.
        </p>
        <div style={{
          border: '1px solid var(--ifm-color-emphasis-200)',
          borderRadius: 12,
          padding: '1.5rem',
          background: 'var(--ifm-background-surface-color)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <BrowserOnly fallback={<div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ifm-color-emphasis-500)' }}>Loading chart…</div>}>
            {() => {
              const Chart = require('../components/TransactionVolumeChart').default;
              return <Chart />;
            }}
          </BrowserOnly>
        </div>
      </main>
    </Layout>
  );
}
