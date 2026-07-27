import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function PricingPage(): React.JSX.Element {
  return (
    <Layout title="API Pricing" description="ProxyPay API cost calculator and pricing information">
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading cost calculator...</p>}>
        {() => {
          const CostCalculator = require('../components/CostCalculator').default;
          return <CostCalculator />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
