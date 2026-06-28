import React from 'react';
import Layout from '@theme/Layout';
import OnboardingWidget from '../components/OnboardingWidget';

export default function Dashboard(): React.JSX.Element {
  return (
    <Layout title="Dashboard" description="User Dashboard">
      <main style={{ padding: '4rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <h1>Dashboard</h1>
        <OnboardingWidget />
        <p>Welcome to your developer dashboard.</p>
      </main>
    </Layout>
  );
}
