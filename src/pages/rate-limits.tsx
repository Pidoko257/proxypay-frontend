import React from 'react';
import Layout from '@theme/Layout';
import RateLimitDashboard from '../components/RateLimitDashboard';

export default function RateLimitPage(): React.JSX.Element {
  return (
    <Layout
      title="Rate Limit Dashboard"
      description="Monitor your API rate limit status and usage in real-time"
    >
      <main style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <RateLimitDashboard />
      </main>
    </Layout>
  );
}
