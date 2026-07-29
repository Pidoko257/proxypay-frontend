import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Spinner from '../components/Spinner';

export default function ApiPage(): React.JSX.Element {
  return (
    <Layout title="API Reference" description="ProxyPay REST API reference">
      <BrowserOnly
        fallback={
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Spinner label="Loading API reference..." />
          </div>
        }
      >
        {() => {
          const ApiReference = require('../components/ApiReference').default;
          return <ApiReference />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
