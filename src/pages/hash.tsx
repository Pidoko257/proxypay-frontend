import React from 'react';
import Layout from '@theme/Layout';
import StellarHash from '../components/StellarHash';

export default function HashPage(): React.JSX.Element {
  return (
    <Layout title="Stellar Transaction Hash" description="Stellar hash deep-link component demo">
      <main style={{ padding: '2rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <h1>Stellar Transaction Hash Deep-Link Component</h1>
        <p>
          Stellar transaction hashes are displayed with a truncated format (first 6 and last 6 characters),
          a copy button, and an external link to Stellar Explorer.
        </p>

        <h2>Testnet Example</h2>
        <p>
          Hash: <StellarHash hash="abc123def456ghi789jkl012mno345pqr678stu901vwx234yz" network="testnet" />
        </p>

        <h2>Mainnet Example</h2>
        <p>
          Hash: <StellarHash hash="def456ghi789jkl012mno345pqr678stu901vwx234yzabc123" network="mainnet" />
        </p>
      </main>
    </Layout>
  );
}
