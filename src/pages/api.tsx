import React, { Suspense, lazy } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

/**
 * ApiPage
 *
 * Renders the Redoc-powered API reference inside the Docusaurus layout.
 *
 * BrowserOnly is required because RedocStandalone relies on browser APIs
 * (window, document) that are not available during SSR/static-site generation.
 * Without it, `npm run build` throws "window is not defined" errors (#229).
 */
export default function ApiPage(): React.JSX.Element {
  return (
    <Layout title="API Reference" description="ProxyPay REST API reference">
      <BrowserOnly fallback={<div style={{ padding: '2rem' }}>Loading API reference…</div>}>
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
