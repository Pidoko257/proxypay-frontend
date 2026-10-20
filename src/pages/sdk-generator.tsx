import React from 'react';
import Layout from '@theme/Layout';
import SdkGenerator from '../components/SdkGenerator';
import Breadcrumb from '../components/Breadcrumb';

export default function SdkGeneratorPage(): React.JSX.Element {
  return (
    <Layout title="SDK Generator" description="Generate client SDK packages from an OpenAPI definition">
      <Breadcrumb />
      <SdkGenerator />
    </Layout>
  );
}
