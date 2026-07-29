import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function ApiPage(): React.JSX.Element {
  return (
    <Layout title="API Reference" description="ProxyPay REST API reference">
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading API reference...</p>}>
        {() => {
          const IntegratedApiReference = require('../components/IntegratedApiReference').default;
          return (
            <div style={{ width: '100%', height: 'calc(100vh - 120px)' }}>
              <IntegratedApiReference
                specUrl="/openapi.yaml"
                title="ProxyPay API Reference"
                showSidebar={true}
                enableDeepLinking={true}
                expandTagsByDefault={true}
              />
            </div>
          );
        }}
      </BrowserOnly>
    </Layout>
  );
}
