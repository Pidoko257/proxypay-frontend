import React from 'react';
import Layout from '@theme/Layout';
import DashboardLayout from '../../components/dashboard/DashboardLayout';

export default function DashboardTransactionsPage(): React.JSX.Element {
  return (
    <Layout title="Transactions" description="ProxyPay transaction activity">
      <DashboardLayout
        title="Transactions"
        subtitle="Review and export partner payment activity."
        activePath="/dashboard/transactions"
      >
        <p>
          Transaction history and filters will appear here. Press <kbd>N</kbd> to create a new
          transaction or <kbd>E</kbd> to export the current view.
        </p>
      </DashboardLayout>
    </Layout>
  );
}
