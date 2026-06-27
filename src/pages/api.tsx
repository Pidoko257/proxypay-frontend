import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Breadcrumb from '../components/Breadcrumb';

export default function ApiPage(): React.JSX.Element {
  return (
    <Layout title="API Reference" description="ProxyPay REST API reference">
      <Breadcrumb />
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading API reference...</p>}>
        {() => {
          const ApiReference = require('../components/ApiReference').default;
          return <ApiReference />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
