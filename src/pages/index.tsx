import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home(): React.JSX.Element {
  return (
    <Layout title="Developer Portal" description="ProxyPay partner API docs">
      <main style={{ padding: '4rem 1.5rem', maxWidth: 960, margin: '0 auto' }}>
        <h1>ProxyPay API Documentation Portal</h1>
        <p>
          This portal publishes a searchable, first-class API reference for partners using the
          canonical <code>openapi.yaml</code> in this repository.
        </p>

        <div className="home-cards">
          <div className="home-card">
            <h3>📖 API Reference</h3>
            <p>Interactive OpenAPI docs with request/response examples and code snippets.</p>
            <Link className="button button--primary button--lg" to="/api">
              Open API Reference
            </Link>
          </div>
          <div className="home-card">
            <h3>📡 Event Streaming</h3>
            <p>WebSocket, SSE &amp; gRPC streaming guides with reconnection strategies and client examples.</p>
            <Link className="button button--secondary button--lg" to="/streaming">
              Streaming &amp; Webhooks
            </Link>
          </div>
          <div className="home-card">
            <h3>⚠️ Error Reference</h3>
            <p>Searchable catalog of every API error code with causes and troubleshooting steps.</p>
            <Link className="button button--secondary button--lg" to="/errors">
              Error Reference
            </Link>
          </div>
        </div>
      </main>
    </Layout>
  );
}
