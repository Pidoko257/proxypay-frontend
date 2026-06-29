import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import BrowserOnly from '@docusaurus/BrowserOnly';
import StickyNav, { NavSection } from '../components/StickyNav';

const PAGE_SECTIONS: NavSection[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'features', label: 'Features' },
];

export default function Home(): React.JSX.Element {
  return (
    <Layout title="Developer Portal" description="ProxyPay partner API docs">
      <BrowserOnly fallback={null}>
        {() => <StickyNav sections={PAGE_SECTIONS} />}
      </BrowserOnly>
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '0 1.5rem 4rem' }}>
        <section id="overview" style={{ paddingTop: '3rem' }}>
          <h1>ProxyPay API Documentation Portal</h1>
          <p>
            This portal publishes a searchable, first-class API reference for partners using the
            canonical <code>openapi.yaml</code> in this repository.
          </p>
          <Link className="button button--primary button--lg" to="/api">
            Open API Reference
          </Link>
        </section>

        <section id="getting-started" style={{ paddingTop: '3rem' }}>
          <h2>Getting Started</h2>
          <p>
            Integrate ProxyPay in three steps: obtain your API keys, configure your webhook
            endpoint, and send your first payment request. Use the onboarding guide for a
            step-by-step walkthrough.
          </p>
        </section>

        <section id="features" style={{ paddingTop: '3rem' }}>
          <h2>Features</h2>
          <ul>
            <li>Full REST API with OpenAPI 3.0 specification</li>
            <li>Sandbox and production environments</li>
            <li>Webhook event delivery with signature verification</li>
            <li>Interactive API playground for testing endpoints</li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
