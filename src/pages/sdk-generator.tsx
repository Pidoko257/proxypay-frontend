import React from 'react';
import Layout from '@theme/Layout';
import SdkGenerator from '../components/SdkGenerator';

export default function SdkGeneratorPage(): React.JSX.Element {
  return (
    <Layout title="SDK Generator" description="Generate client SDK packages from an OpenAPI definition">
      <SdkGenerator />
    </Layout>
  );
}
