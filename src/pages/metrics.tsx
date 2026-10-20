import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Breadcrumb from '../components/Breadcrumb';

/**
 * MetricsPage
 *
 * Renders the API metrics panel inside the Docusaurus layout with breadcrumb
 * navigation showing the hierarchy: Home > Transaction Dashboard > API Metrics.
 */
export default function MetricsPage(): React.JSX.Element {
  return (
    <Layout title="API Metrics" description="Explore API usage metrics">
      <Breadcrumb />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading metrics…</p>}>
          {() => {
            const MetricsPanel = require('../components/MetricsPanel').default;
            return <MetricsPanel />;
          }}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
