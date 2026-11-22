import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function ComplianceReportPage(): JSX.Element {
  return (
    <Layout
      title="Compliance Report"
      description="Generate printable compliance reports for ProxyPay transaction audits and security controls."
    >
      <BrowserOnly fallback={<div style={{ padding: '2rem' }}>Loading…</div>}>
        {() => {
          const ComplianceReport = require('../components/ComplianceReport').default;
          return <ComplianceReport />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
