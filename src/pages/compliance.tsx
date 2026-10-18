import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

/**
 * Compliance page — renders the ComplianceReport component.
 * Wrapped in BrowserOnly because window.print() and localStorage are browser-only APIs.
 */
export default function CompliancePage(): React.JSX.Element {
  return (
    <Layout
      title="Compliance Report"
      description="ProxyPay compliance report — audit trail, data retention policies, and security controls"
    >
      <BrowserOnly
        fallback={<p style={{ padding: '2rem' }}>Loading compliance report...</p>}
      >
        {() => {
          const ComplianceReport = require('../components/ComplianceReport').default;
          return (
            <ComplianceReport
              reportTitle="ProxyPay Compliance Report"
              organizationName="ProxyPay"
            />
          );
        }}
      </BrowserOnly>
    </Layout>
  );
}
