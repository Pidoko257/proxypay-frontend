import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function ApiPage(): React.JSX.Element {
  return (
    <Layout title="API Reference" description="ProxyPay REST API reference">
      {/* Loading fallback uses role="status" so screen readers announce it */}
      <BrowserOnly
        fallback={
          <p role="status" aria-live="polite" style={{ padding: '2rem' }}>
            Loading API reference…
          </p>
        }
      >
        {() => {
          const ApiReference = require('../components/ApiReference').default;
          return (
            /* Landmark region wrapping the full interactive API reference */
            <main aria-label="Interactive API Reference">
              <ApiReference />
            </main>
          );
        }}
      </BrowserOnly>
    </Layout>
  );
}
