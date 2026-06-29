import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function ApiPage(): React.JSX.Element {
  return (
    <Layout title="API Reference" description="ProxyPay REST API reference">
      <div id="main-content">
        <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading API reference...</p>}>
          {() => {
            const EndpointCopyList = require('../components/EndpointCopyList').default;
            const ApiReference = require('../components/ApiReference').default;
            return (
              <>
                <EndpointCopyList />
                <ApiReference />
              </>
            );
          }}
        </BrowserOnly>
      </div>
    </Layout>
  );
}
