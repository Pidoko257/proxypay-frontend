import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function MigrationPage(): React.JSX.Element {
  return (
    <Layout title="Migration Guides" description="ProxyPay API version migration guides and breaking change detection">
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading migration guides...</p>}>
        {() => {
          const MigrationGuide = require('../components/MigrationGuide').default;
          return <MigrationGuide />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
