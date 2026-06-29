import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function EnvVarsPage(): React.JSX.Element {
  return (
    <Layout title="Environment Variables" description="ProxyPay backend environment variable reference">
      <main style={{ padding: '3rem 1.5rem', maxWidth: 1100, margin: '0 auto' }}>
        <h1>Environment Variable Reference</h1>
        <p style={{ color: 'var(--ifm-color-emphasis-700)', marginBottom: '2rem', maxWidth: 680 }}>
          All configuration is supplied via environment variables. Copy the{' '}
          <a href="/proxypay/.env.example" download=".env.example"><code>.env.example</code></a>{' '}
          file to <code>.env</code> and fill in the required values before starting the server.
        </p>
        <BrowserOnly fallback={<p>Loading…</p>}>
          {() => {
            const EnvVarTable = require('../components/EnvVarTable').default;
            return <EnvVarTable />;
          }}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
