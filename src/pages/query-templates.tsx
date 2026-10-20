import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function QueryTemplatesPage(): JSX.Element {
  return (
    <Layout
      title="Query Templates"
      description="Save, load, and share named filter combinations for ProxyPay transaction queries."
    >
      <BrowserOnly fallback={<div style={{ padding: '2rem' }}>Loading…</div>}>
        {() => {
          const QueryTemplates = require('../components/QueryTemplates').default;
          return <QueryTemplates />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
