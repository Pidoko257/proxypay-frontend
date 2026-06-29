import React from 'react';
import Layout from '@theme/Layout';
import SEP24FlowDiagram from '../components/SEP24FlowDiagram';

export default function SEP24Page(): React.JSX.Element {
  return (
    <Layout title="SEP-24 Flow" description="Interactive SEP-24 deposit and withdrawal flow diagram">
      <main style={{ padding: '2rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <h1>SEP-24 Interactive Flow</h1>
        <p>
          Click on any step in the diagram below to see the corresponding API endpoint and example payload.
          SEP-24 defines the standard for anchor/customer interactive deposit and withdrawal flows on the Stellar network.
        </p>
        <SEP24FlowDiagram />
      </main>
    </Layout>
  );
}
