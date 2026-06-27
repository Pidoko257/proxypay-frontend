import React from 'react';
import Layout from '@theme/Layout';
import Breadcrumb from '../components/Breadcrumb';
import TransactionTable from '../components/TransactionTable';

export default function TransactionsPage(): React.JSX.Element {
  return (
    <Layout title="Transactions" description="Transaction history">
      <Breadcrumb />
      <main style={{ padding: '2rem 1.5rem', maxWidth: 1100, margin: '0 auto' }}>
        <h1>Transaction History</h1>
        <TransactionTable />
      </main>
    </Layout>
  );
}
