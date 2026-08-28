import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function QualityPage(): React.JSX.Element {
  return (
    <Layout
      title="Code Quality Metrics"
      description="ProxyPay code quality — SonarQube gates, issue tracking, technical debt and trend reports"
    >
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading quality dashboard…</p>}>
        {() => {
          const CodeQualityMetrics = require('../components/CodeQualityMetrics').default;
          return <CodeQualityMetrics />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
