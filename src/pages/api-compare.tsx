import React from 'react';
import Layout from '@theme/Layout';
import ApiVersionComparison from '../components/ApiVersionComparison';

export default function ApiComparePage(): React.JSX.Element {
  return (
    <Layout title="API Version Comparison" description="Compare OpenAPI versions and plan migrations">
      <ApiVersionComparison />
    </Layout>
  );
}
