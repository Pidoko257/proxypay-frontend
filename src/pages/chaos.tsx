import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function ChaosPage(): React.JSX.Element {
  return (
    <Layout
      title="Chaos Engineering Tests"
      description="ProxyPay resilience testing — failure injection, network partitions, resource exhaustion and automation"
    >
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading chaos dashboard…</p>}>
        {() => {
          const ChaosEngineering = require('../components/ChaosEngineering').default;
          return <ChaosEngineering />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
