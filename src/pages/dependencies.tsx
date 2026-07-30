import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function DependenciesPage(): React.JSX.Element {
  return (
    <Layout title="Endpoint Dependencies" description="Interactive graph of ProxyPay API endpoint dependencies">
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading dependency graph...</p>}>
        {() => {
          const DependencyGraph = require('../components/DependencyGraph').default;
          return <DependencyGraph />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
