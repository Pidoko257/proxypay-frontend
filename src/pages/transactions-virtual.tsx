import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function VirtualPage(): React.JSX.Element {
  return (
    <Layout title="Virtualized Transactions" description="High-performance virtualized transaction table">
      <main style={{ padding: '2rem 1.5rem', maxWidth: 1100, margin: '0 auto' }}>
        <h1>Virtualized Transaction Table</h1>
        <p style={{ color: '#64748b', marginBottom: 24 }}>
          Rendering 5,000 rows with DOM virtualization — only visible rows are mounted, keeping scroll buttery smooth.
        </p>
        <BrowserOnly fallback={<p>Loading…</p>}>
          {() => {
            const VirtualizedTransactionTable = require('../components/VirtualizedTransactionTable').default;
            return <VirtualizedTransactionTable rowCount={5000} />;
          }}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
