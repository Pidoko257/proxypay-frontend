import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function ConfirmPage(): React.JSX.Element {
  return (
    <Layout title="Confirm Payment" description="Payment confirmation demo">
      <main style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
        <h2>Confirm Payment</h2>
        <p>You're about to send <strong>50 XLM</strong> to <em>G...RECIPIENT</em>.</p>

        <BrowserOnly fallback={<div>Loading fee estimator...</div>}>
          {() => {
            // Dynamically import to ensure this runs in the browser
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const NetworkFeeEstimator = require('../components/NetworkFeeEstimator').default;
            return (
              <div style={{ display: 'grid', gap: 12 }}>
                <NetworkFeeEstimator operations={2} />
                <div>
                  <button className="button button--primary">Confirm and Send</button>
                  <button style={{ marginLeft: 8 }} className="button">
                    Cancel
                  </button>
                </div>
              </div>
            );
          }}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
