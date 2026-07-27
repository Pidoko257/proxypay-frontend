import React, { Suspense, lazy } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Head from '@docusaurus/Head';

const ApiReference = lazy(() => import('../components/ApiReference'));

export default function ApiPage(): React.JSX.Element {
  return (
    <Layout title="ProxyPay API Reference" description="Complete REST API reference for the ProxyPay Mobile Money ↔ Stellar Bridge, including all endpoints, request/response schemas, and authentication details.">
      <Head>
        <meta property="og:title" content="ProxyPay API Reference" />
        <meta property="og:description" content="Complete REST API reference for the ProxyPay Mobile Money ↔ Stellar Bridge, including all endpoints, request/response schemas, and authentication details." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://sublime247.github.io/proxypay/api" />
        <meta property="og:site_name" content="ProxyPay API Portal" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="ProxyPay API Reference" />
        <meta name="twitter:description" content="Complete REST API reference for the ProxyPay Mobile Money ↔ Stellar Bridge, including all endpoints, request/response schemas, and authentication details." />
        <link rel="canonical" href="https://sublime247.github.io/proxypay/api" />
      </Head>
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading API reference...</p>}>
        {() => (
          <Suspense fallback={<p style={{ padding: '2rem', textAlign: 'center' }}>Loading API documentation...</p>}>
            <ApiReference />
          </Suspense>
        )}
      </BrowserOnly>
    </Layout>
  );
}
