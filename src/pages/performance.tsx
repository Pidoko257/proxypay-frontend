import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Breadcrumb from '../components/Breadcrumb';

export default function PerformancePage(): React.JSX.Element {
  return (
    <Layout title="Performance Benchmarks" description="ProxyPay API performance benchmarks and SLA monitoring">
      <Breadcrumb />
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading benchmarks...</p>}>
        {() => {
          const PerformanceBenchmarks = require('../components/PerformanceBenchmarks').default;
          return <PerformanceBenchmarks />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
