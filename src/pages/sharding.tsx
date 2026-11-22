import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Breadcrumb from '../components/Breadcrumb';

export default function ShardingPage(): React.JSX.Element {
  return (
    <Layout
      title="Database Sharding Strategy"
      description="ProxyPay horizontal scaling strategy — shard map, routing, migration, rebalancing and failover"
    >
      <Breadcrumb />
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading sharding dashboard…</p>}>
        {() => {
          const ShardingStrategy = require('../components/ShardingStrategy').default;
          return <ShardingStrategy />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
