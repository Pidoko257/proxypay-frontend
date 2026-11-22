import React, { Suspense, lazy } from 'react';
import Layout from '@theme/Layout';
import Breadcrumb from '../components/Breadcrumb';

/**
 * ApiPage
 *
 * Renders the Redoc-powered API reference inside the Docusaurus layout.
 *
 * React.lazy + Suspense is used instead of BrowserOnly + require() because
 * a synchronous require() inside a BrowserOnly callback loads the entire
 * module on first render without code-splitting. React.lazy defers the
 * import to a dynamic import(), so the bundle is split and only loaded
 * in the browser when the component is first needed.
 *
 * RedocStandalone relies on browser APIs (window, document) that are not
 * available during SSR/static-site generation. The lazy import is never
 * executed on the server, so `npm run build` remains safe (#229).
 */
const IntegratedApiReference = lazy(
  () => import('../components/IntegratedApiReference'),
);

export default function ApiPage(): React.JSX.Element {
  return (
    <Layout title="API Reference" description="ProxyPay REST API reference">
      <Breadcrumb />
      <Suspense fallback={<div style={{ padding: '2rem' }}>Loading API reference…</div>}>
        <div style={{ width: '100%', height: 'calc(100vh - 120px)' }}>
          <IntegratedApiReference
            specUrl="/openapi.yaml"
            title="ProxyPay API Reference"
            showSidebar={true}
            enableDeepLinking={true}
            expandTagsByDefault={true}
          />
        </div>
      </Suspense>
    </Layout>
  );
}
