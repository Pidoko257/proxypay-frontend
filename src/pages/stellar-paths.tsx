import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function StellarPathsPage(): React.JSX.Element {
  return (
    <Layout title="Stellar Path Visualizer" description="Visualize Stellar DEX payment paths">
      <main style={{ padding: '2rem 1.5rem', maxWidth: 800, margin: '0 auto' }}>
        <h1>Stellar Path Payment Visualizer</h1>
        <BrowserOnly fallback={<p>Loading…</p>}>
          {() => {
            const StellarPathVisualizer = require('../components/StellarPathVisualizer').default;
            return <StellarPathVisualizer />;
          }}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
