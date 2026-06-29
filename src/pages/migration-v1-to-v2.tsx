import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import CodeBlock from '@theme/CodeBlock';

const V1_REQUEST = `POST https://api.proxypay.io/v1/payment
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "amount": 5000,
  "currency": "USD",
  "destination": "acct_abc123"
}`;

const V2_REQUEST = `POST https://api.proxypay.io/v2/payments
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "amount": 5000,
  "currency": "USD",
  "recipient": {
    "account_id": "acct_abc123"
  },
  "idempotency_key": "order_xyz_20250630"
}`;

export default function MigrationGuide(): React.JSX.Element {
  return (
    <Layout title="Migration Guide: v1 → v2-beta" description="How to migrate from ProxyPay API v1 to v2-beta">
      <main style={{ padding: '3rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <h1>Migration Guide: v1 → v2-beta</h1>
        <p>
          API v1 will reach end-of-life on <strong>December 31 2025</strong>. This guide covers
          every breaking change and how to update your integration before the sunset date.
        </p>

        <h2>What Changed</h2>
        <table>
          <thead>
            <tr>
              <th>Area</th>
              <th>v1</th>
              <th>v2-beta</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Base URL</td>
              <td><code>/v1/</code></td>
              <td><code>/v2/</code></td>
            </tr>
            <tr>
              <td>Payment resource</td>
              <td><code>POST /payment</code> (singular)</td>
              <td><code>POST /payments</code> (plural)</td>
            </tr>
            <tr>
              <td>Recipient field</td>
              <td><code>destination</code> (string)</td>
              <td><code>recipient</code> (object)</td>
            </tr>
            <tr>
              <td>Idempotency</td>
              <td>Not supported</td>
              <td><code>idempotency_key</code> field</td>
            </tr>
            <tr>
              <td>Error format</td>
              <td><code>{"{ \"message\": \"...\" }"}</code></td>
              <td><code>{"{ \"error\": { \"code\": \"...\", \"message\": \"...\" } }"}</code></td>
            </tr>
            <tr>
              <td>Webhook signature</td>
              <td>MD5 (deprecated)</td>
              <td>HMAC-SHA256</td>
            </tr>
          </tbody>
        </table>

        <h2>Request Comparison</h2>

        <h3>v1</h3>
        <CodeBlock language="http">{V1_REQUEST}</CodeBlock>

        <h3>v2-beta</h3>
        <CodeBlock language="http">{V2_REQUEST}</CodeBlock>

        <h2>Migration Steps</h2>
        <ol>
          <li>Replace all base URLs from <code>/v1/</code> to <code>/v2/</code>.</li>
          <li>Rename resource paths from singular to plural (<code>/payment</code> → <code>/payments</code>).</li>
          <li>Update the <code>destination</code> string to a <code>recipient</code> object with an <code>account_id</code> property.</li>
          <li>Add <code>idempotency_key</code> to payment creation requests to enable safe retries.</li>
          <li>Update error handling to read <code>error.code</code> and <code>error.message</code> from the new envelope.</li>
          <li>
            Update webhook signature verification from MD5 to HMAC-SHA256.{' '}
            <Link to="/webhooks">See the webhook security guide</Link>.
          </li>
        </ol>

        <h2>Support</h2>
        <p>
          Questions about migrating? Contact <a href="mailto:support@proxypay.io">support@proxypay.io</a> or
          open a ticket in the developer dashboard.
        </p>
      </main>
    </Layout>
  );
}
