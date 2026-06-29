import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import type { ApiPageProps } from '../types/component-props';

export default function ApiPage(_props: ApiPageProps): React.JSX.Element {
  return (
    <Layout title="API Reference" description="ProxyPay REST API reference">
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading API reference...</p>}>
        {() => {
          const ApiReference = require('../components/ApiReference').default;
          return <ApiReference />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
