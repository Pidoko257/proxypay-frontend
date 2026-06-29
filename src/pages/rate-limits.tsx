import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import CodeBlock from '@theme/CodeBlock';

const RETRY_NODE = `const axios = require('axios');

async function requestWithRetry(url, options, maxRetries = 4) {
  let delay = 1000; // start at 1 second

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios(url, options);
      return response;
    } catch (err) {
      const status = err.response?.status;

      if (status === 429 && attempt < maxRetries) {
        const retryAfter = err.response.headers['retry-after'];
        const wait = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;

        console.warn(\`Rate limited. Retrying in \${wait}ms (attempt \${attempt + 1})\`);
        await new Promise((resolve) => setTimeout(resolve, wait));
        delay *= 2; // exponential backoff
        continue;
      }

      throw err;
    }
  }
}

// Usage
requestWithRetry('https://api.proxypay.io/v2/payments', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  data: { amount: 1000, currency: 'USD' },
});`;

const RETRY_PYTHON = `import time
import requests

def request_with_retry(url, method="GET", max_retries=4, **kwargs):
    delay = 1.0  # start at 1 second

    for attempt in range(max_retries + 1):
        response = requests.request(method, url, **kwargs)

        if response.status_code == 429 and attempt < max_retries:
            retry_after = response.headers.get("Retry-After")
            wait = float(retry_after) if retry_after else delay

            print(f"Rate limited. Retrying in {wait}s (attempt {attempt + 1})")
            time.sleep(wait)
            delay *= 2  # exponential backoff
            continue

        response.raise_for_status()
        return response

    raise RuntimeError("Max retries exceeded")

# Usage
response = request_with_retry(
    "https://api.proxypay.io/v2/payments",
    method="POST",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={"amount": 1000, "currency": "USD"},
)`;

const RESPONSE_429 = `HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1719700800

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded your request quota. Retry after 30 seconds.",
    "docs": "https://docs.proxypay.io/rate-limits"
  }
}`;

export default function RateLimits(): React.JSX.Element {
  return (
    <Layout title="Rate Limits" description="ProxyPay API rate limits per pricing tier and retry logic">
      <main style={{ padding: '3rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <h1>Rate Limits</h1>
        <p>
          ProxyPay enforces per-minute request quotas to ensure fair usage across all partners.
          Limits vary by pricing tier and endpoint category.
        </p>

        <h2>Limits by Tier</h2>
        <table>
          <thead>
            <tr>
              <th>Endpoint Category</th>
              <th>Free</th>
              <th>Starter</th>
              <th>Pro</th>
              <th>Enterprise</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Payments (POST)</td>
              <td>10 / min</td>
              <td>60 / min</td>
              <td>300 / min</td>
              <td>Unlimited</td>
            </tr>
            <tr>
              <td>Payments (GET)</td>
              <td>30 / min</td>
              <td>200 / min</td>
              <td>1 000 / min</td>
              <td>Unlimited</td>
            </tr>
            <tr>
              <td>Refunds</td>
              <td>5 / min</td>
              <td>30 / min</td>
              <td>150 / min</td>
              <td>Unlimited</td>
            </tr>
            <tr>
              <td>Webhooks (management)</td>
              <td>5 / min</td>
              <td>20 / min</td>
              <td>60 / min</td>
              <td>Unlimited</td>
            </tr>
            <tr>
              <td>Balance / Account</td>
              <td>10 / min</td>
              <td>60 / min</td>
              <td>300 / min</td>
              <td>Unlimited</td>
            </tr>
            <tr>
              <td>Bulk Operations</td>
              <td>—</td>
              <td>5 / min</td>
              <td>30 / min</td>
              <td>Unlimited</td>
            </tr>
          </tbody>
        </table>

        <p>
          Need higher limits?{' '}
          <Link to="/pricing">Upgrade your plan</Link> or contact enterprise sales.
        </p>

        <h2>429 Too Many Requests</h2>
        <p>
          When you exceed your quota the API returns <code>HTTP 429</code>. The response
          includes headers that tell you when to retry:
        </p>
        <CodeBlock language="http">{RESPONSE_429}</CodeBlock>

        <h3>Rate-limit headers</h3>
        <table>
          <thead>
            <tr>
              <th>Header</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>Retry-After</code></td>
              <td>Seconds to wait before the next request.</td>
            </tr>
            <tr>
              <td><code>X-RateLimit-Limit</code></td>
              <td>Maximum requests allowed in the current window.</td>
            </tr>
            <tr>
              <td><code>X-RateLimit-Remaining</code></td>
              <td>Requests remaining in the current window.</td>
            </tr>
            <tr>
              <td><code>X-RateLimit-Reset</code></td>
              <td>Unix timestamp when the window resets.</td>
            </tr>
          </tbody>
        </table>

        <h2>Retry Logic with Exponential Backoff</h2>
        <p>
          Always respect the <code>Retry-After</code> header. If it is absent, use
          exponential backoff starting at 1 second and doubling each attempt.
        </p>

        <h3>Node.js</h3>
        <CodeBlock language="javascript">{RETRY_NODE}</CodeBlock>

        <h3>Python</h3>
        <CodeBlock language="python">{RETRY_PYTHON}</CodeBlock>

        <h2>Best Practices</h2>
        <ul>
          <li>Cache GET responses where possible to reduce read traffic.</li>
          <li>Use bulk endpoints instead of looping single-resource calls.</li>
          <li>Add jitter (random 0–500 ms) to backoff delays in distributed systems to avoid thundering herd.</li>
          <li>Monitor <code>X-RateLimit-Remaining</code> and pre-emptively slow down before hitting zero.</li>
        </ul>
      </main>
    </Layout>
  );
}
