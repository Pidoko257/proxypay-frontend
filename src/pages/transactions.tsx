import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function TransactionsPage(): React.JSX.Element {
  return (
    <Layout title="Transactions" description="ProxyPay transaction table with column visibility">
      <main style={{ padding: '2rem 1.5rem', maxWidth: 1100, margin: '0 auto' }}>
        <h1>Transactions</h1>
        <p style={{ color: '#64748b', marginBottom: 24 }}>
          Use the column toggle to show or hide fields. Your selection is saved in localStorage.
        </p>
        <BrowserOnly fallback={<p>Loading…</p>}>
          {() => {
            const TransactionTable = require('../components/TransactionTable').default;
            return <TransactionTable rowCount={30} />;
          }}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
