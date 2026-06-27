import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function PaymentPage(): React.JSX.Element {
  return (
    <Layout
      title="Initiate Payment"
      description="ProxyPay mobile-responsive payment initiation form"
    >
      <BrowserOnly
        fallback={
          <p style={{ padding: '2rem', textAlign: 'center', color: '#8b8fa3' }}>
            Loading payment form…
          </p>
        }
      >
        {() => {
          const PaymentForm =
            require('../components/PaymentForm').default;
          return <PaymentForm />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
