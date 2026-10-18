import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

/**
 * Dashboard page — integrates:
 *  - #629 QueryTemplateManager
 *  - #630 AlertThreshold (AlertStatusBadge + useAlertThresholds)
 *  - #631 HelpTooltip (used in 3+ places)
 */
export default function DashboardPage(): React.JSX.Element {
  return (
    <Layout title="Dashboard" description="ProxyPay transaction metrics dashboard">
      <BrowserOnly
        fallback={<p style={{ padding: '2rem' }}>Loading dashboard...</p>}
      >
        {() => {
          const DashboardInner = require('../components/DashboardInner').default;
          return <DashboardInner />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
