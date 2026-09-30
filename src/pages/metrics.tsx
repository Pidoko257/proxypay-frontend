import React from 'react';
import Layout from '@theme/Layout';
import MetricsPanel from '../components/MetricsPanel';

export default function MetricsPage(): React.JSX.Element {
  return (
    <Layout title="API Metrics" description="Explore API usage metrics">
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <MetricsPanel />
      </main>
    </Layout>
  );
}
