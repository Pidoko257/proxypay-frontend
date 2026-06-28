import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import OnboardingChecklist from '../components/OnboardingChecklist';

export default function Home(): React.JSX.Element {
  return (
    <Layout title="Developer Portal" description="ProxyPay partner API docs">
      <main className="home-page">
        <div className="home-page-content">
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
        </div>
        <OnboardingChecklist />
      </main>
    </Layout>
  );
}
