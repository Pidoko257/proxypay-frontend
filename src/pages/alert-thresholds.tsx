import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function AlertThresholdsPage(): JSX.Element {
  return (
    <Layout
      title="Alert Thresholds"
      description="Configure custom warning and critical thresholds for ProxyPay transaction metrics."
    >
      <BrowserOnly fallback={<div style={{ padding: '2rem' }}>Loading…</div>}>
        {() => {
          const AlertThresholds = require('../components/AlertThresholds').default;
          return <AlertThresholds />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
