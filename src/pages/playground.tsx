import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function PlaygroundPage(): React.JSX.Element {
  return (
    <Layout title="API Playground" description="Interactive ProxyPay API playground">
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>
        <h1>API Playground</h1>
        <p>
          Test the <code>/payments/initiate</code> endpoint directly from the browser. Select
          testnet to use sandbox credentials. Sandbox requests are rate-limited to 5 per minute.
        </p>
        <BrowserOnly fallback={<p>Loading playground…</p>}>
          {() => {
            const ApiPlayground = require('../components/ApiPlayground').default;
            return <ApiPlayground />;
          }}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
