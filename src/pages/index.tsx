import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home(): React.JSX.Element {
  return (
    <Layout title="Developer Portal" description="ProxyPay partner API docs">
      {/* aria-label on main landmark so screen readers can navigate directly to it */}
      <main
        aria-label="ProxyPay API Documentation Portal"
        style={{ padding: '4rem 1.5rem', maxWidth: 900, margin: '0 auto' }}
      >
        {/* Live region: announces dynamic status messages to screen readers */}
        <div
          id="status-announcer"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
        />

        <h1 id="portal-heading">ProxyPay API Documentation Portal</h1>
        <p aria-describedby="portal-heading">
          This portal publishes a searchable, first-class API reference for partners using the
          canonical <code>openapi.yaml</code> in this repository.
        </p>

        {/* Navigation region for the primary call-to-action */}
        <nav aria-label="Primary actions">
          <p>
            <Link
              className="button button--primary button--lg"
              to="/api"
              aria-label="Open API Reference documentation"
              role="link"
            >
              Open API Reference
            </Link>
          </p>
        </nav>
      </main>
    </Layout>
  );
}
