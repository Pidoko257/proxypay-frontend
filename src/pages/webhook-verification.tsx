/**
 * Webhook Verification page — /webhook-verification (Issue #635)
 *
 * Demonstrates the WebhookSignatureVerifier component with sample data.
 */

import React from 'react';
import Layout from '@theme/Layout';
import WebhookSignatureVerifier from '../components/WebhookSignatureVerifier';

// Sample data representing a real-looking webhook delivery
const SAMPLE_TRANSACTION_ID = 'TX-1048';

const SAMPLE_PAYLOAD = JSON.stringify(
  {
    event: 'payment.completed',
    transactionId: SAMPLE_TRANSACTION_ID,
    amount: 240,
    currency: 'USD',
    customer: 'Amina Yusuf',
    status: 'Completed',
    processingTimeMs: 820,
    createdAt: '2026-09-25T14:32:11Z',
  },
  null,
  2,
);

// A plausible-looking 64-char hex signature for the sample payload
const SAMPLE_SIGNATURE =
  'a3f2c1e8d94b7056f123ae4c8d2910bf6e75a3c9124f8e0bd547a9e2c1f30d82';

const SAMPLE_TIMESTAMP = '2026-09-25T14:32:11Z';

export default function WebhookVerificationPage(): React.JSX.Element {
  return (
    <Layout
      title="Webhook Signature Verification"
      description="Verify ProxyPay webhook signatures with the HMAC-SHA256 tool"
    >
      <main className="webhook-page-main">
        <WebhookSignatureVerifier
          transactionId={SAMPLE_TRANSACTION_ID}
          webhookPayload={SAMPLE_PAYLOAD}
          signature={SAMPLE_SIGNATURE}
          timestamp={SAMPLE_TIMESTAMP}
        />
      </main>
    </Layout>
  );
}
