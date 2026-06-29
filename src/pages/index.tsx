import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function Home(): React.JSX.Element {
  return (
    <Layout title="Developer Portal" description="ProxyPay partner API docs">
      <main style={{ padding: '4rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <h1>ProxyPay API Documentation Portal</h1>
        <p>
          This portal publishes a searchable, first-class API reference for partners using the
          canonical <code>openapi.yaml</code> in this repository.
        </p>
        <p>
          <Link className="button button--primary button--lg" to="/api">
            Open API Reference
          </Link>
        </p>
      </main>
      <BrowserOnly>
        {() => {
          const MobileCtaBar = require('../components/MobileCtaBar').default;
          return <MobileCtaBar />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
