import React from 'react';
import Layout from '@theme/Layout';

export default function SdkReferencePage(): React.JSX.Element {
  return (
    <Layout title="SDK Reference" description="ProxyPay Node.js SDK reference documentation">
      <main style={{ padding: '2rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <h1>ProxyPay Node.js SDK Reference</h1>
        <p>
          Auto-generated reference documentation for the ProxyPay Node.js SDK. This documentation
          is generated from TypeScript source files using TypeDoc during the build process.
        </p>
        <p>
          To generate SDK docs, set the <code>sdkSourceDir</code> option in the plugin configuration
          within <code>docusaurus.config.ts</code> to point to the SDK source directory. Then run
          <code>npm run build</code> to generate the reference pages.
        </p>
        <h2>Configuration</h2>
        <pre><code>{`plugins: [
  ['docusaurus-sdk-reference', {
    sdkSourceDir: '../proxypay-sdk/src',
    outputDir: 'sdk-reference',
  }],
]`}</code></pre>
      </main>
    </Layout>
  );
}
