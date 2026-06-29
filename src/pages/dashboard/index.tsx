import React from 'react';
import Layout from '@theme/Layout';
import DashboardLayout from '../../components/dashboard/DashboardLayout';

export default function DashboardHomePage(): React.JSX.Element {
  return (
    <Layout title="Dashboard" description="ProxyPay developer dashboard">
      <DashboardLayout
        title="Developer Dashboard"
        subtitle="Monitor partner API activity and manage ProxyPay operations."
        activePath="/dashboard"
      >
        <p>
          Welcome to the ProxyPay developer dashboard. Use the navigation above or keyboard
          shortcuts to move between sections.
        </p>
      </DashboardLayout>
    </Layout>
  );
}
