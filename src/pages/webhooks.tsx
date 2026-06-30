import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function WebhooksPage(): React.JSX.Element {
  return (
    <Layout title="Webhook Events" description="Interactive webhook payload inspector">
      <main style={{ padding: '2rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}>
        <h1>Webhook Events</h1>
        <p>
          Webhooks allow your application to receive real-time notifications about events
          happening in your ProxyPay account. Use the inspector below to explore the payload
          structure for each event type.
        </p>
        <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading webhook inspector...</p>}>
          {() => {
            const WebhookPayloadInspector =
              require('../components/WebhookPayloadInspector').default;
            return <WebhookPayloadInspector />;
          }}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
