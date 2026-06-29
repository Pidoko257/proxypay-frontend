import React, { useState } from 'react';
import Layout from '@theme/Layout';
import CodeBlock from '@theme/CodeBlock';

const SAMPLE_PAYLOAD = `{
  "id": "evt_01HZ9XKPQ3MWVN7RBTF5YC2DA",
  "type": "payment.completed",
  "created_at": "2025-06-30T12:00:00Z",
  "data": {
    "payment_id": "pay_01HZ9XKPQ3MWVN7RBTF5YC2DA",
    "amount": 5000,
    "currency": "USD",
    "status": "completed"
  }
}`;

const SAMPLE_SIGNATURE = `t=1719748800,v1=3b2e6d5a8f1c4e9b0d7a2f5c8e1b4d7a0e3b6d9c2f5a8b1d4e7c0f3a6b9e2`;

const NODE_EXAMPLE = `const crypto = require('crypto');

/**
 * Verifies a ProxyPay webhook signature.
 * @param {string} rawBody  - The raw (unparsed) request body string.
 * @param {string} sigHeader - The value of the X-ProxyPay-Signature header.
 * @param {string} secret   - Your webhook signing secret from the dashboard.
 */
function verifyWebhookSignature(rawBody, sigHeader, secret) {
  // Header format: t=<timestamp>,v1=<hmac>
  const parts = Object.fromEntries(
    sigHeader.split(',').map((part) => part.split('='))
  );

  const timestamp = parts['t'];
  const receivedHmac = parts['v1'];

  if (!timestamp || !receivedHmac) {
    throw new Error('Invalid signature header format');
  }

  // Reject events older than 5 minutes to prevent replay attacks
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > 300) {
    throw new Error('Webhook timestamp too old');
  }

  // Recompute expected HMAC-SHA256
  const signedPayload = \`\${timestamp}.\${rawBody}\`;
  const expectedHmac = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  // Constant-time comparison prevents timing attacks
  const expected = Buffer.from(expectedHmac, 'hex');
  const received = Buffer.from(receivedHmac, 'hex');

  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw new Error('Signature mismatch');
  }

  return true;
}

// Express example
const express = require('express');
const app = express();

app.post('/webhooks/proxypay', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-proxypay-signature'];

  try {
    verifyWebhookSignature(req.body.toString('utf8'), signature, process.env.PROXYPAY_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(\`Webhook verification failed: \${err.message}\`);
  }

  const event = JSON.parse(req.body);
  console.log('Verified event:', event.type);
  res.sendStatus(200);
});`;

const PYTHON_EXAMPLE = `import hashlib
import hmac
import json
import time


def verify_webhook_signature(raw_body: str, sig_header: str, secret: str) -> bool:
    """
    Verifies a ProxyPay webhook signature.

    :param raw_body:  The raw (unparsed) request body as a string.
    :param sig_header: The value of the X-ProxyPay-Signature header.
    :param secret:    Your webhook signing secret from the dashboard.
    """
    # Header format: t=<timestamp>,v1=<hmac>
    parts = dict(part.split("=", 1) for part in sig_header.split(","))

    timestamp = parts.get("t")
    received_hmac = parts.get("v1")

    if not timestamp or not received_hmac:
        raise ValueError("Invalid signature header format")

    # Reject events older than 5 minutes to prevent replay attacks
    age = int(time.time()) - int(timestamp)
    if age > 300:
        raise ValueError("Webhook timestamp too old")

    # Recompute expected HMAC-SHA256
    signed_payload = f"{timestamp}.{raw_body}"
    expected_hmac = hmac.new(
        secret.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # Constant-time comparison prevents timing attacks
    if not hmac.compare_digest(expected_hmac, received_hmac):
        raise ValueError("Signature mismatch")

    return True


# Flask example
from flask import Flask, request, abort

app = Flask(__name__)

@app.route("/webhooks/proxypay", methods=["POST"])
def handle_webhook():
    sig_header = request.headers.get("X-ProxyPay-Signature", "")
    raw_body = request.get_data(as_text=True)

    try:
        verify_webhook_signature(raw_body, sig_header, PROXYPAY_WEBHOOK_SECRET)
    except ValueError as exc:
        abort(400, description=str(exc))

    event = json.loads(raw_body)
    print("Verified event:", event["type"])
    return "", 200`;

const PHP_EXAMPLE = `<?php

/**
 * Verifies a ProxyPay webhook signature.
 *
 * @param string $rawBody   The raw (unparsed) request body.
 * @param string $sigHeader The value of the X-ProxyPay-Signature header.
 * @param string $secret    Your webhook signing secret from the dashboard.
 *
 * @throws RuntimeException on verification failure.
 */
function verifyWebhookSignature(string $rawBody, string $sigHeader, string $secret): bool
{
    // Header format: t=<timestamp>,v1=<hmac>
    $parts = [];
    foreach (explode(',', $sigHeader) as $part) {
        [$key, $value] = explode('=', $part, 2);
        $parts[$key] = $value;
    }

    $timestamp    = $parts['t']  ?? null;
    $receivedHmac = $parts['v1'] ?? null;

    if (!$timestamp || !$receivedHmac) {
        throw new RuntimeException('Invalid signature header format');
    }

    // Reject events older than 5 minutes to prevent replay attacks
    if ((time() - (int) $timestamp) > 300) {
        throw new RuntimeException('Webhook timestamp too old');
    }

    // Recompute expected HMAC-SHA256
    $signedPayload = $timestamp . '.' . $rawBody;
    $expectedHmac  = hash_hmac('sha256', $signedPayload, $secret);

    // hash_equals uses constant-time comparison to prevent timing attacks
    if (!hash_equals($expectedHmac, $receivedHmac)) {
        throw new RuntimeException('Signature mismatch');
    }

    return true;
}

// Raw PHP handler example
$rawBody   = file_get_contents('php://input');
$sigHeader = $_SERVER['HTTP_X_PROXYPAY_SIGNATURE'] ?? '';

try {
    verifyWebhookSignature($rawBody, $sigHeader, getenv('PROXYPAY_WEBHOOK_SECRET'));
} catch (RuntimeException $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

$event = json_decode($rawBody, true);
error_log('Verified event: ' . $event['type']);
http_response_code(200);`;

type Tab = 'nodejs' | 'python' | 'php';

export default function Webhooks(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('nodejs');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'nodejs', label: 'Node.js' },
    { id: 'python', label: 'Python' },
    { id: 'php', label: 'PHP' },
  ];

  const codeMap: Record<Tab, string> = {
    nodejs: NODE_EXAMPLE,
    python: PYTHON_EXAMPLE,
    php: PHP_EXAMPLE,
  };

  const langMap: Record<Tab, string> = {
    nodejs: 'javascript',
    python: 'python',
    php: 'php',
  };

  return (
    <Layout title="Webhook Security" description="Verify ProxyPay webhook signatures with HMAC-SHA256">
      <main style={{ padding: '3rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <h1>Webhook Security</h1>
        <p>
          ProxyPay signs every webhook delivery with an HMAC-SHA256 signature so you can confirm
          the payload came from ProxyPay and has not been tampered with. The signature is sent in
          the <code>X-ProxyPay-Signature</code> HTTP header.
        </p>

        <h2>How Signatures Work</h2>
        <ol>
          <li>ProxyPay concatenates the Unix timestamp and the raw request body: <code>{"<timestamp>.<body>"}</code>.</li>
          <li>It computes <code>HMAC-SHA256</code> over that string using your signing secret.</li>
          <li>The header value is <code>{"t=<timestamp>,v1=<hmac>"}</code>.</li>
          <li>You recompute the HMAC on your end and compare using a constant-time function.</li>
        </ol>

        <h2>Sample Payload &amp; Signature</h2>
        <p>Use these values to test your verification implementation:</p>

        <h3>Payload</h3>
        <CodeBlock language="json">{SAMPLE_PAYLOAD}</CodeBlock>

        <h3>X-ProxyPay-Signature header</h3>
        <CodeBlock language="text">{SAMPLE_SIGNATURE}</CodeBlock>

        <p>
          <strong>Test signing secret:</strong> <code>whsec_testProxyPaySigningSecret1234567890</code>
        </p>

        <h2>Verification Examples</h2>
        <p>Select your language. All examples implement the full HMAC-SHA256 verification, not pseudocode.</p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.4rem 1rem',
                border: '1px solid var(--ifm-color-primary)',
                borderRadius: 4,
                background: activeTab === tab.id ? 'var(--ifm-color-primary)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'var(--ifm-color-primary)',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 600 : 400,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <CodeBlock language={langMap[activeTab]}>{codeMap[activeTab]}</CodeBlock>

        {activeTab === 'nodejs' && (
          <p>
            Using the ProxyPay Node.js SDK?{' '}
            <code>proxypay.webhooks.constructEvent(rawBody, sigHeader, secret)</code> wraps this
            logic for you.
          </p>
        )}
        {activeTab === 'python' && (
          <p>
            Using the ProxyPay Python SDK?{' '}
            <code>proxypay.webhooks.construct_event(raw_body, sig_header, secret)</code> wraps this
            logic for you.
          </p>
        )}

        <h2>Security Checklist</h2>
        <ul>
          <li>Always verify the signature before processing any event.</li>
          <li>Use the <strong>raw</strong> request body — JSON parsing may reorder keys and invalidate the HMAC.</li>
          <li>Reject payloads older than 5 minutes to prevent replay attacks.</li>
          <li>Use constant-time comparison (<code>crypto.timingSafeEqual</code>, <code>hmac.compare_digest</code>, <code>hash_equals</code>) to prevent timing attacks.</li>
          <li>Return <code>HTTP 200</code> quickly; process events asynchronously via a queue.</li>
        </ul>
      </main>
    </Layout>
  );
}
