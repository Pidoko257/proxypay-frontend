import React from 'react';
import Layout from '@theme/Layout';
import OnboardingStepper from '../components/OnboardingStepper';

export default function OnboardingPage(): React.JSX.Element {
  return (
    <Layout title="Developer Onboarding" description="Step-by-step ProxyPay integration guide">
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>
        <h1>Developer Onboarding</h1>
        <p>
          Follow the steps below to set up your ProxyPay integration: create your account, generate
          API keys, configure webhooks, and run a test transaction.
        </p>
        <OnboardingStepper />
      </main>
    </Layout>
  );
}
