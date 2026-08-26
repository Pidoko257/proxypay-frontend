import React, { useState, useMemo } from 'react';

// ── Types ──────────────────────────────────────────────────────────
type ChangeSeverity = 'breaking' | 'non-breaking' | 'deprecation' | 'addition';
type SunsetStatus = 'active' | 'deprecated' | 'sunset';

interface EndpointDiff {
  path: string;
  method: string;
  fromVersion: string;
  toVersion: string;
  severity: ChangeSeverity;
  summary: string;
  oldSignature?: string;
  newSignature?: string;
  oldResponse?: string;
  newResponse?: string;
  migrationCode?: string;
  codeExamples?: Record<string, string>;
  rollbackSteps?: string[];
  deprecationDate?: string;
  sunsetDate?: string;
  sunsetStatus: SunsetStatus;
  category: string;
}

interface MigrationVersion {
  from: string;
  to: string;
  date: string;
  title: string;
  overview: string;
  diffs: EndpointDiff[];
}

// ── Mock Data ──────────────────────────────────────────────────────
const MIGRATION_DATA: MigrationVersion[] = [
  {
    from: 'v1.x',
    to: 'v2.0',
    date: '2026-03-01',
    title: 'Major API Redesign — v2.0',
    overview: 'v2.0 introduces API key authentication (replacing OAuth2), unified error responses, and a new Mobile Money provider abstraction layer. This is a **breaking** release — all v1.x endpoints are sunset as of 2026-09-01.',
    diffs: [
      {
        path: '/auth/token',
        method: 'POST',
        fromVersion: 'v1.x',
        toVersion: 'v2.0',
        severity: 'breaking',
        summary: 'OAuth2 token endpoint removed. Use API keys in `X-API-Key` header instead.',
        oldSignature: 'POST /auth/token\nAuthorization: Basic base64(client_id:client_secret)\nBody: { grant_type: "client_credentials" }',
        newSignature: 'All requests:\nX-API-Key: pp_live_xxxxxxxxxxxxxxxx',
        oldResponse: '{\n  "access_token": "eyJ...",\n  "expires_in": 3600,\n  "token_type": "Bearer"\n}',
        newResponse: 'No token needed — API key validates on every request.',
        migrationCode: `// BEFORE (v1.x - OAuth2)
const tokenRes = await fetch('https://api.proxypay.dev/auth/token', {
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ grant_type: 'client_credentials' })
});
const { access_token } = await tokenRes.json();

// AFTER (v2.0 - API Key)
// Simply include your API key in every request:
const res = await fetch('https://api.proxypay.dev/payments', {
  headers: {
    'X-API-Key': 'pp_live_xxxxxxxxxxxxxxxx',
    'Content-Type': 'application/json'
  }
});`,
        codeExamples: {
          javascript: `// BEFORE (v1.x - OAuth2)
const tokenRes = await fetch('https://api.proxypay.dev/auth/token', {
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ grant_type: 'client_credentials' })
});
const { access_token } = await tokenRes.json();

// AFTER (v2.0 - API Key)
// Simply include your API key in every request:
const res = await fetch('https://api.proxypay.dev/payments', {
  headers: {
    'X-API-Key': 'pp_live_xxxxxxxxxxxxxxxx',
    'Content-Type': 'application/json'
  }
});`,
          python: `# BEFORE (v1.x - OAuth2)
import requests
from requests.auth import HTTPBasicAuth

token_res = requests.post(
  'https://api.proxypay.dev/auth/token',
  auth=HTTPBasicAuth(client_id, client_secret),
  json={'grant_type': 'client_credentials'}
)
access_token = token_res.json()['access_token']

# AFTER (v2.0 - API Key)
# Simply include your API key in every request:
headers = {'X-API-Key': 'pp_live_xxxxxxxxxxxxxxxx'}
res = requests.get('https://api.proxypay.dev/payments', headers=headers)`,
          go: `// BEFORE (v1.x - OAuth2)
client := &http.Client{}
req, _ := http.NewRequest("POST", "https://api.proxypay.dev/auth/token", strings.NewReader("grant_type=client_credentials"))
req.Header.Set("Authorization", "Basic " + base64.StdEncoding.EncodeToString([]byte(clientID+":"+clientSecret)))
req.Header.Set("Content-Type", "application/json")
resp, _ := client.Do(req)

// AFTER (v2.0 - API Key)
// Simply include your API key in every request:
req, _ := http.NewRequest("GET", "https://api.proxypay.dev/payments", nil)
req.Header.Set("X-API-Key", "pp_live_xxxxxxxxxxxxxxxx")
resp, _ := client.Do(req)`,
        },
        rollbackSteps: ['Switch back to v1.x base URL: https://api-v1.proxypay.dev', 'Re-enable OAuth2 client credentials flow'],
        sunsetDate: '2026-09-01',
        sunsetStatus: 'sunset',
        category: 'Authentication',
      },
      {
        path: '/errors',
        method: 'ALL',
        fromVersion: 'v1.x',
        toVersion: 'v2.0',
        severity: 'breaking',
        summary: 'Error response format unified across all endpoints.',
        oldSignature: 'HTTP 400\n{ "error": "bad_request" }',
        newSignature: 'HTTP 400\n{\n  "error": {\n    "code": "BAD_REQUEST",\n    "message": "Missing required field: amount",\n    "request_id": "req_abc123"\n  }\n}',
        migrationCode: `// BEFORE (v1.x)
if (res.status !== 200) {
  const err = await res.json();
  console.log(err.error); // "bad_request"
}

// AFTER (v2.0)
if (!res.ok) {
  const err = await res.json();
  console.log(err.error.code);    // "BAD_REQUEST"
  console.log(err.error.message); // "Missing required field: amount"
  console.log(err.error.request_id); // "req_abc123" — use for support
}`,
        codeExamples: {
          javascript: `// BEFORE (v1.x)
if (res.status !== 200) {
  const err = await res.json();
  console.log(err.error); // "bad_request"
}

// AFTER (v2.0)
if (!res.ok) {
  const err = await res.json();
  console.log(err.error.code);    // "BAD_REQUEST"
  console.log(err.error.message); // "Missing required field: amount"
  console.log(err.error.request_id); // "req_abc123" — use for support
}`,
          python: `# BEFORE (v1.x)
res = requests.get(url)
if res.status_code != 200:
  err = res.json()
  print(err["error"])  # "bad_request"

# AFTER (v2.0)
res = requests.get(url)
if not res.ok:
  err = res.json()
  print(err["error"]["code"])        # "BAD_REQUEST"
  print(err["error"]["message"])     # "Missing required field: amount"
  print(err["error"]["request_id"])  # "req_abc123" — use for support`,
          go: `// BEFORE (v1.x)
resp, _ := http.Get(url)
if resp.StatusCode != 200 {
  body, _ := ioutil.ReadAll(resp.Body)
  var err map[string]interface{}
  json.Unmarshal(body, &err)
  fmt.Println(err["error"]) // "bad_request"
}

// AFTER (v2.0)
resp, _ := http.Get(url)
if resp.StatusCode < 200 || resp.StatusCode >= 300 {
  body, _ := ioutil.ReadAll(resp.Body)
  var err map[string]interface{}
  json.Unmarshal(body, &err)
  fmt.Println(err["error"].(map[string]interface{})["code"])        // "BAD_REQUEST"
  fmt.Println(err["error"].(map[string]interface{})["message"])     // "Missing required field: amount"
  fmt.Println(err["error"].(map[string]interface{})["request_id"])  // "req_abc123" — use for support
}`,
        },
        rollbackSteps: [],
        sunsetStatus: 'sunset',
        category: 'Core',
      },
      {
        path: '/momo/providers',
        method: 'GET',
        fromVersion: 'v1.x',
        toVersion: 'v2.0',
        severity: 'addition',
        summary: 'New Mobile Money provider abstraction layer with unified interface.',
        oldSignature: 'GET /momo/mtn/pay\nGET /momo/airtel/pay\nGET /momo/orange/pay',
        newSignature: 'GET /momo/providers\nPOST /momo/pay\n  Body: { provider: "mtn" | "airtel" | "orange", ... }',
        migrationCode: `// BEFORE (v1.x)
await fetch('https://api.proxypay.dev/momo/mtn/pay', {
  method: 'POST',
  body: JSON.stringify({ phone: '+256...', amount: 5000 })
});

// AFTER (v2.0)
await fetch('https://api.proxypay.dev/momo/pay', {
  method: 'POST',
  headers: { 'X-API-Key': 'pp_live_...', 'Content-Type': 'application/json' },
  body: JSON.stringify({ provider: 'mtn', phone: '+256...', amount: 5000 })
});`,
        codeExamples: {
          javascript: `// BEFORE (v1.x)
await fetch('https://api.proxypay.dev/momo/mtn/pay', {
  method: 'POST',
  body: JSON.stringify({ phone: '+256...', amount: 5000 })
});

// AFTER (v2.0)
await fetch('https://api.proxypay.dev/momo/pay', {
  method: 'POST',
  headers: { 'X-API-Key': 'pp_live_...', 'Content-Type': 'application/json' },
  body: JSON.stringify({ provider: 'mtn', phone: '+256...', amount: 5000 })
});`,
          python: `# BEFORE (v1.x)
requests.post('https://api.proxypay.dev/momo/mtn/pay', json={'phone': '+256...', 'amount': 5000})

# AFTER (v2.0)
requests.post('https://api.proxypay.dev/momo/pay', headers={'X-API-Key': 'pp_live_...'}, json={'provider': 'mtn', 'phone': '+256...', 'amount': 5000})`,
          go: `// BEFORE (v1.x)
http.Post("https://api.proxypay.dev/momo/mtn/pay", "application/json", strings.NewReader("{\"phone\":\"+256...\",\"amount\":5000}"))

// AFTER (v2.0)
req, _ := http.NewRequest("POST", "https://api.proxypay.dev/momo/pay", strings.NewReader("{\"provider\":\"mtn\",\"phone\":\"+256...\",\"amount\":5000}"))
req.Header.Set("X-API-Key", "pp_live_...")
req.Header.Set("Content-Type", "application/json")
client.Do(req)`,
        },
        category: 'Mobile Money',
        sunsetStatus: 'sunset',
      },
    ],
  },
  {
    from: 'v2.0',
    to: 'v2.1',
    date: '2026-04-02',
    title: 'JSON-Only & Real-Time Streaming — v2.1',
    overview: 'v2.1 deprecates XML response format and introduces Server-Sent Events for real-time payment status. XML is in a 6-month sunset period ending 2026-10-02.',
    diffs: [
      {
        path: '* (all endpoints)',
        method: 'ALL',
        fromVersion: 'v2.0',
        toVersion: 'v2.1',
        severity: 'deprecation',
        summary: 'XML response format deprecated. All endpoints now default to JSON. Opt-in via Accept header during sunset.',
        oldSignature: 'Accept: application/xml',
        newSignature: 'Accept: application/json  (default, no header needed)',
        migrationCode: `// BEFORE (v2.0 - XML)
const res = await fetch('https://api.proxypay.dev/payments/123', {
  headers: { 'Accept': 'application/xml' }
});
const xml = await res.text();
// Parse XML manually...

// AFTER (v2.1 - JSON, default)
const res = await fetch('https://api.proxypay.dev/payments/123');
const data = await res.json();
console.log(data.amount, data.status);`,
        codeExamples: {
          javascript: `// BEFORE (v2.0 - XML)
const res = await fetch('https://api.proxypay.dev/payments/123', {
  headers: { 'Accept': 'application/xml' }
});
const xml = await res.text();
// Parse XML manually...

// AFTER (v2.1 - JSON, default)
const res = await fetch('https://api.proxypay.dev/payments/123');
const data = await res.json();
console.log(data.amount, data.status);`,
          python: `# BEFORE (v2.0 - XML)
res = requests.get('https://api.proxypay.dev/payments/123', headers={'Accept': 'application/xml'})
xml = res.text
# Parse XML manually...

# AFTER (v2.1 - JSON, default)
res = requests.get('https://api.proxypay.dev/payments/123')
data = res.json()
print(data['amount'], data['status'])`,
          go: `// BEFORE (v2.0 - XML)
req, _ := http.NewRequest("GET", "https://api.proxypay.dev/payments/123", nil)
req.Header.Set("Accept", "application/xml")
resp, _ := client.Do(req)
xml, _ := ioutil.ReadAll(resp.Body)
// Parse XML manually...

// AFTER (v2.1 - JSON, default)
resp, _ := http.Get("https://api.proxypay.dev/payments/123")
data, _ := ioutil.ReadAll(resp.Body)
var result map[string]interface{}
json.Unmarshal(data, &result)
fmt.Println(result["amount"], result["status"])`,
        },
        rollbackSteps: ['Add `Accept: application/xml` to request headers (works until 2026-10-02)'],
        deprecationDate: '2026-04-02',
        sunsetDate: '2026-10-02',
        sunsetStatus: 'deprecated',
        category: 'Format',
      },
      {
        path: '/payments/stream',
        method: 'GET',
        fromVersion: 'v2.0',
        toVersion: 'v2.1',
        severity: 'addition',
        summary: 'New SSE endpoint for real-time payment status updates.',
        migrationCode: `// New — subscribe to live payment updates
const evtSource = new EventSource('https://api.proxypay.dev/payments/stream');

evtSource.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log(\`Payment \${update.id}: \${update.status}\`);
};

evtSource.addEventListener('error', () => {
  // Auto-reconnects by default
  console.log('SSE connection lost — retrying...');
});`,
        codeExamples: {
          javascript: `// New — subscribe to live payment updates
const evtSource = new EventSource('https://api.proxypay.dev/payments/stream');

evtSource.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log(\`Payment \${update.id}: \${update.status}\`);
};

evtSource.addEventListener('error', () => {
  // Auto-reconnects by default
  console.log('SSE connection lost — retrying...');
});`,
          python: `# New — subscribe to live payment updates
import sseclient

stream_url = 'https://api.proxypay.dev/payments/stream'
client = sseclient.SSEClient(stream_url)

for event in client.events():
  update = json.loads(event.data)
  print(f\"Payment {update['id']}: {update['status']}\")`,
          go: `// New — subscribe to live payment updates
resp, _ := http.Get("https://api.proxypay.dev/payments/stream")
defer resp.Body.Close()

scanner := bufio.NewScanner(resp.Body)
for scanner.Scan() {
  line := scanner.Text()
  if strings.HasPrefix(line, "data: ") {
    update := json.RawMessage(strings.TrimPrefix(line, "data: "))
    fmt.Printf(\"Payment %s: status update\\n\", update)
  }
}`,
        },
        category: 'Payments',
        sunsetStatus: 'active',
      },
    ],
  },
  {
    from: 'v2.3',
    to: 'v2.4',
    date: '2026-07-14',
    title: 'Bulk Payments & Webhook Signatures — v2.4',
    overview: 'v2.4 adds bulk payment processing (up to 1000 payments per request) and HMAC-SHA256 webhook signature verification. No breaking changes.',
    diffs: [
      {
        path: '/payments/bulk',
        method: 'POST',
        fromVersion: 'v2.3',
        toVersion: 'v2.4',
        severity: 'addition',
        summary: 'New bulk payment endpoint for submitting up to 1000 payments in one request.',
        migrationCode: `// BEFORE (v2.3 - individual payments)
for (const payment of payments) {
  await fetch('https://api.proxypay.dev/payments', {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payment)
  });
}

// AFTER (v2.4 - bulk)
await fetch('https://api.proxypay.dev/payments/bulk', {
  method: 'POST',
  headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ payments: [...payments] }) // up to 1000
});`,
        codeExamples: {
          javascript: `// BEFORE (v2.3 - individual payments)
for (const payment of payments) {
  await fetch('https://api.proxypay.dev/payments', {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payment)
  });
}

// AFTER (v2.4 - bulk)
await fetch('https://api.proxypay.dev/payments/bulk', {
  method: 'POST',
  headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ payments: [...payments] }) // up to 1000
});`,
          python: `# BEFORE (v2.3 - individual payments)
for payment in payments:
  requests.post('https://api.proxypay.dev/payments', headers={'X-API-Key': api_key}, json=payment)

# AFTER (v2.4 - bulk)
requests.post('https://api.proxypay.dev/payments/bulk', headers={'X-API-Key': api_key}, json={'payments': payments}) # up to 1000`,
          go: `// BEFORE (v2.3 - individual payments)
for _, payment := range payments {
  body, _ := json.Marshal(payment)
  req, _ := http.NewRequest("POST", "https://api.proxypay.dev/payments", bytes.NewBuffer(body))
  req.Header.Set("X-API-Key", apiKey)
  client.Do(req)
}

// AFTER (v2.4 - bulk)
bulkBody, _ := json.Marshal(map[string]interface{}{"payments": payments})
req, _ := http.NewRequest("POST", "https://api.proxypay.dev/payments/bulk", bytes.NewBuffer(bulkBody))
req.Header.Set("X-API-Key", apiKey)
client.Do(req)`,
        },
        category: 'Payments',
        sunsetStatus: 'active',
      },
      {
        path: '/webhooks',
        method: 'POST',
        fromVersion: 'v2.3',
        toVersion: 'v2.4',
        severity: 'addition',
        summary: 'Webhook payloads now include HMAC-SHA256 signature for verification.',
        migrationCode: `// Verify webhook signature
import crypto from 'crypto';

function verifyWebhook(req) {
  const signature = req.headers['x-proxypay-signature'];
  const payload = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', process.env.PROXYPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  if (signature !== expected) {
    throw new Error('Invalid webhook signature');
  }
  // Process webhook...
}`,
        codeExamples: {
          javascript: `// Verify webhook signature
import crypto from 'crypto';

function verifyWebhook(req) {
  const signature = req.headers['x-proxypay-signature'];
  const payload = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', process.env.PROXYPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  if (signature !== expected) {
    throw new Error('Invalid webhook signature');
  }
  // Process webhook...
}`,
          python: `# Verify webhook signature
import hmac
import hashlib

def verify_webhook(payload, signature):
  secret = os.environ['PROXYPAY_WEBHOOK_SECRET']
  expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
  
  if signature != expected:
    raise Exception('Invalid webhook signature')
  # Process webhook...`,
          go: `// Verify webhook signature
import "crypto/hmac"
import "crypto/sha256"

func verifyWebhook(payload []byte, signature string) {
  secret := []byte(os.Getenv("PROXYPAY_WEBHOOK_SECRET"))
  h := hmac.New(sha256.New, secret)
  h.Write(payload)
  expected := fmt.Sprintf("%x", h.Sum(nil))
  
  if signature != expected {
    panic("Invalid webhook signature")
  }
  // Process webhook...
}`,
        },
        category: 'Webhooks',
        sunsetStatus: 'active',
      },
    ],
  },
];

// ── Styles ─────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '2rem 1.5rem 4rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--ifm-color-primary-darkest, #1a5c32)',
    margin: '0 0 0.5rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748b',
    lineHeight: 1.6,
  },
  migrationCard: {
    background: '#fff',
    border: '1px solid #e8ecf0',
    borderRadius: 14,
    marginBottom: '2rem',
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    transition: 'box-shadow 0.2s',
  },
  migrationHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid #e8ecf0',
    background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
  },
  migrationTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 0.25rem',
  },
  migrationMeta: {
    fontSize: '0.82rem',
    color: '#94a3b8',
    marginTop: '0.35rem',
  },
  migrationOverview: {
    padding: '1.25rem 1.5rem',
    fontSize: '0.92rem',
    color: '#475569',
    lineHeight: 1.7,
    borderBottom: '1px solid #f1f5f9',
  },
  diffCard: {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.15s',
  },
  diffHeader: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.75rem',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  severityBadge: (s: ChangeSeverity): React.CSSProperties => {
    const c: Record<ChangeSeverity, { bg: string; fg: string }> = {
      breaking: { bg: '#fee2e2', fg: '#991b1b' },
      'non-breaking': { bg: '#dcfce7', fg: '#166534' },
      deprecation: { bg: '#fef3c7', fg: '#92400e' },
      addition: { bg: '#dbeafe', fg: '#1e40af' },
    };
    return {
      display: 'inline-block',
      padding: '0.2rem 0.6rem',
      borderRadius: 6,
      fontSize: '0.72rem',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
      background: c[s].bg,
      color: c[s].fg,
    };
  },
  endpointTag: {
    fontFamily: 'SF Mono, Fira Code, monospace',
    fontSize: '0.82rem',
    background: '#f1f5f9',
    color: '#334155',
    padding: '0.15rem 0.55rem',
    borderRadius: 5,
    fontWeight: 500,
  },
  sunsetBadge: (status: SunsetStatus): React.CSSProperties => {
    const c: Record<SunsetStatus, { bg: string; fg: string; label: string }> = {
      active: { bg: '#dcfce7', fg: '#166534', label: '✅ Active' },
      deprecated: { bg: '#fef3c7', fg: '#92400e', label: '⚠ Deprecated' },
      sunset: { bg: '#fee2e2', fg: '#991b1b', label: '🔴 Sunset' },
    };
    return {
      display: 'inline-block',
      padding: '0.2rem 0.6rem',
      borderRadius: 6,
      fontSize: '0.72rem',
      fontWeight: 700,
      background: c[status].bg,
      color: c[status].fg,
    };
  },
  codeBlock: {
    background: '#1e293b',
    color: '#e2e8f0',
    borderRadius: 10,
    padding: '1.25rem',
    fontSize: '0.82rem',
    fontFamily: 'SF Mono, Fira Code, monospace',
    lineHeight: 1.7,
    overflowX: 'auto' as const,
    whiteSpace: 'pre' as const,
    margin: '0.75rem 0',
    position: 'relative' as const,
  },
  comparisonGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    margin: '0.75rem 0',
  },
  comparisonBox: {
    background: '#fff',
    border: '1px solid #e8ecf0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  comparisonLabel: {
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    padding: '0.5rem 1rem',
    background: '#f8fafc',
    borderBottom: '1px solid #e8ecf0',
  },
  comparisonContent: {
    padding: '0.75rem 1rem',
    fontFamily: 'SF Mono, Fira Code, monospace',
    fontSize: '0.78rem',
    whiteSpace: 'pre' as const,
    overflowX: 'auto' as const,
    lineHeight: 1.6,
    maxHeight: 200,
    overflowY: 'auto' as const,
  },
  toggleBtn: {
    padding: '0.35rem 0.75rem',
    borderRadius: 6,
    border: '1px solid #d0d5dd',
    background: '#fff',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    color: '#475569',
    transition: 'background 0.15s, border-color 0.15s',
  },
  timeline: {
    marginTop: '2rem',
    padding: '1.5rem',
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e8ecf0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  timelineHeader: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '1rem',
  },
  timelineItems: {
    position: 'relative' as const,
    paddingLeft: '2rem',
    borderLeft: '3px solid var(--ifm-color-primary, #2e8555)',
    marginLeft: '0.5rem',
  },
  timelineItem: {
    position: 'relative' as const,
    marginBottom: '1.25rem',
  },
  timelineDot: {
    position: 'absolute' as const,
    left: '-2.4rem',
    top: '0.2rem',
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: 'var(--ifm-color-primary, #2e8555)',
    border: '2px solid #fff',
    boxShadow: '0 0 0 2px var(--ifm-color-primary, #2e8555)',
  },
};

// ── Main Component ─────────────────────────────────────────────────
export default function MigrationGuide(): React.JSX.Element {
  const [expandedMigration, setExpandedMigration] = useState<string | null>(MIGRATION_DATA[0]?.to || null);
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());
  const [codeLanguage, setCodeLanguage] = useState<string>('javascript');

  const LANGUAGES = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'go', label: 'Go' },
  ];

  const toggleMigration = (to: string) => {
    setExpandedMigration((prev) => (prev === to ? null : to));
  };

  const toggleDiff = (key: string) => {
    setExpandedDiffs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allDiffs = useMemo(
    () => MIGRATION_DATA.flatMap((m) => m.diffs),
    []
  );

  const breakingCount = allDiffs.filter((d) => d.severity === 'breaking').length;
  const deprecationCount = allDiffs.filter((d) => d.severity === 'deprecation').length;
  const additionCount = allDiffs.filter((d) => d.severity === 'addition').length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🔄 Migration Guides</h1>
        <p style={styles.subtitle}>
          Auto-detected changes between API versions.{' '}
          <strong style={{ color: '#991b1b' }}>{breakingCount} breaking</strong>,{' '}
          <strong style={{ color: '#92400e' }}>{deprecationCount} deprecations</strong>,{' '}
          <strong style={{ color: '#1e40af' }}>{additionCount} additions</strong>.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Code Example Language:</span>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              onClick={() => setCodeLanguage(lang.value)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 6,
                border: codeLanguage === lang.value ? '2px solid #1e40af' : '1px solid #d0d5dd',
                background: codeLanguage === lang.value ? '#dbeafe' : '#fff',
                color: codeLanguage === lang.value ? '#1e40af' : '#475569',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Per-version Migrations */}
      {MIGRATION_DATA.map((migration) => {
        const isExpanded = expandedMigration === migration.to;
        return (
          <div
            key={migration.to}
            style={styles.migrationCard}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
            }}
          >
            <div
              style={{ ...styles.migrationHeader, cursor: 'pointer' }}
              onClick={() => toggleMigration(migration.to)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={styles.migrationTitle}>
                    {migration.from} → {migration.to}: {migration.title}
                  </h2>
                  <div style={styles.migrationMeta}>
                    {migration.date} · {migration.diffs.length} changes ·{' '}
                    {migration.diffs.filter((d) => d.severity === 'breaking').length} breaking
                  </div>
                </div>
                <span style={{ fontSize: '1.2rem', color: '#94a3b8', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▼
                </span>
              </div>
            </div>

            {isExpanded && (
              <>
                <div style={styles.migrationOverview}>
                  <strong>Overview:</strong> {migration.overview}
                </div>

                {migration.diffs.map((diff) => {
                  const diffKey = `${migration.to}-${diff.path}-${diff.method}`;
                  const isDiffExpanded = expandedDiffs.has(diffKey);
                  return (
                    <div
                      key={diffKey}
                      style={styles.diffCard}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <div style={styles.diffHeader}>
                        <span style={styles.severityBadge(diff.severity)}>{diff.severity}</span>
                        <code style={styles.endpointTag}>
                          {diff.method} {diff.path}
                        </code>
                        <span style={styles.sunsetBadge(diff.sunsetStatus)}>
                          {diff.sunsetStatus === 'active' ? '✅ Active' : diff.sunsetStatus === 'deprecated' ? '⚠ Deprecated' : '🔴 Sunset'}
                        </span>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            color: '#94a3b8',
                            background: '#f1f5f9',
                            borderRadius: 5,
                            padding: '0.1rem 0.45rem',
                          }}
                        >
                          {diff.category}
                        </span>
                      </div>
                      <p style={{ margin: '0.35rem 0', fontSize: '0.9rem', color: '#475569' }}>
                        {diff.summary}
                      </p>

                      {/* Side-by-side comparison */}
                      {(diff.oldSignature || diff.newSignature) && (
                        <div style={styles.comparisonGrid}>
                          {diff.oldSignature && (
                            <div style={styles.comparisonBox}>
                              <div style={{ ...styles.comparisonLabel, color: '#991b1b' }}>
                                ❌ Before ({diff.fromVersion})
                              </div>
                              <div style={{ ...styles.comparisonContent, color: '#991b1b' }}>
                                {diff.oldSignature}
                              </div>
                            </div>
                          )}
                          {diff.newSignature && (
                            <div style={styles.comparisonBox}>
                              <div style={{ ...styles.comparisonLabel, color: '#166534' }}>
                                ✅ After ({diff.toVersion})
                              </div>
                              <div style={{ ...styles.comparisonContent, color: '#166534' }}>
                                {diff.newSignature}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Response comparison */}
                      {(diff.oldResponse || diff.newResponse) && (
                        <div style={styles.comparisonGrid}>
                          {diff.oldResponse && (
                            <div style={styles.comparisonBox}>
                              <div style={{ ...styles.comparisonLabel, color: '#991b1b' }}>❌ Old Response</div>
                              <div style={{ ...styles.comparisonContent, color: '#991b1b' }}>{diff.oldResponse}</div>
                            </div>
                          )}
                          {diff.newResponse && (
                            <div style={styles.comparisonBox}>
                              <div style={{ ...styles.comparisonLabel, color: '#166534' }}>✅ New Response</div>
                              <div style={{ ...styles.comparisonContent, color: '#166534' }}>{diff.newResponse}</div>
                            </div>
                          )}
                        </div>
                      )}

                      <button style={styles.toggleBtn} onClick={() => toggleDiff(diffKey)}>
                        {isDiffExpanded ? '▲ Hide' : '▼ Show'} Migration Code
                        {diff.rollbackSteps && diff.rollbackSteps.length > 0 ? ' & Rollback' : ''}
                      </button>

                      {isDiffExpanded && (diff.codeExamples?.[codeLanguage] || diff.migrationCode) && (
                        <div style={styles.codeBlock}>
                          <span
                            style={{
                              position: 'absolute' as const,
                              top: 8,
                              right: 12,
                              fontSize: '0.7rem',
                              color: '#94a3b8',
                              background: '#334155',
                              padding: '0.15rem 0.5rem',
                              borderRadius: 4,
                            }}
                          >
                            {codeLanguage !== 'javascript' ? codeLanguage.charAt(0).toUpperCase() + codeLanguage.slice(1) : 'Migration Code'}
                          </span>
                          {diff.codeExamples?.[codeLanguage] || diff.migrationCode}
                        </div>
                      )}

                      {isDiffExpanded && diff.rollbackSteps && diff.rollbackSteps.length > 0 && (
                        <div
                          style={{
                            marginTop: '0.75rem',
                            padding: '0.75rem 1rem',
                            background: '#fef2f2',
                            borderRadius: 8,
                            border: '1px solid #fecaca',
                            fontSize: '0.82rem',
                          }}
                        >
                          <strong style={{ color: '#991b1b' }}>🔄 Rollback Instructions:</strong>
                          <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.2rem', color: '#991b1b' }}>
                            {diff.rollbackSteps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {diff.deprecationDate && diff.sunsetDate && (
                        <div
                          style={{
                            marginTop: '0.5rem',
                            fontSize: '0.8rem',
                            color: '#92400e',
                            background: '#fefce8',
                            padding: '0.4rem 0.75rem',
                            borderRadius: 6,
                            display: 'inline-block',
                          }}
                        >
                          ⏳ Deprecated: {diff.deprecationDate} · Sunset: {diff.sunsetDate} ·{' '}
                          {(() => {
                            const now = new Date();
                            const sunset = new Date(diff.sunsetDate);
                            const days = Math.ceil((sunset.getTime() - now.getTime()) / 86400000);
                            return days > 0 ? `${days} days remaining` : 'SUNSET PASSED';
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        );
      })}

      {/* Migration Timeline */}
      <div style={styles.timeline}>
        <h3 style={styles.timelineHeader}>📅 Migration Timeline to Sunset</h3>
        <div style={styles.timelineItems}>
          {[
            { label: 'v1.x Sunset', date: '2026-09-01', desc: 'All v1.x endpoints shut down. Must be on v2.0+.' },
            { label: 'XML Format Sunset', date: '2026-10-02', desc: 'XML response format fully removed. JSON only.' },
            { label: 'v2.0 Minimum', date: '2027-01-01', desc: 'v2.0 becomes the minimum supported version.' },
          ].map((item) => (
            <div key={item.label} style={styles.timelineItem}>
              <div style={styles.timelineDot} />
              <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{item.label}</strong>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: 8 }}>{item.date}</span>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
