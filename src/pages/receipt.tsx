import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function ReceiptPage(): React.JSX.Element {
  return (
    <Layout title="Transaction Receipt" description="ProxyPay payment receipt">
      <main style={{ padding: '2rem 1.5rem', maxWidth: 600, margin: '0 auto' }}>
        <h1>Payment Receipt</h1>
        <p style={{ color: '#64748b', marginBottom: 24 }}>
          Download as PDF or share via a deep link.
        </p>
        <BrowserOnly fallback={<p>Loading…</p>}>
          {() => {
            const TransactionReceipt = require('../components/TransactionReceipt').default;
            return <TransactionReceipt />;
          }}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
