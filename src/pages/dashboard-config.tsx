import React from 'react';
import Layout from '@theme/Layout';
import DashboardConfig from '../components/DashboardConfig';

export default function DashboardConfigPage(): React.JSX.Element {
  return (
    <Layout title="Dashboard Configuration" description="Import, export, and share dashboard configurations">
      <DashboardConfig />
    </Layout>
  );
}
