import React, { useState } from 'react';
import Layout from '@theme/Layout';

/* ── Event types ─────────────────────────────────────────── */
interface EventType {
  name: string;
  description: string;
  payload: string;
}

const eventTypes: EventType[] = [
  { name: 'payment.created', description: 'A new payment has been initiated.', payload: '{ paymentId, amount, currency, status }' },
  { name: 'payment.updated', description: 'Payment status changed (e.g. processing → completed).', payload: '{ paymentId, status, timestamp }' },
  { name: 'payment.failed', description: 'Payment could not be completed.', payload: '{ paymentId, reason, code }' },
  { name: 'transfer.initiated', description: 'A Mobile Money ↔ Stellar transfer started.', payload: '{ transferId, source, destination, amount }' },
  { name: 'transfer.completed', description: 'Transfer settled on both ledgers.', payload: '{ transferId, stellarTxId, momoRef }' },
  { name: 'transfer.reversed', description: 'Transfer was rolled back.', payload: '{ transferId, reason }' },
  { name: 'wallet.linked', description: 'A mobile-money wallet was linked.', payload: '{ walletId, provider, msisdn }' },
  { name: 'wallet.unlinked', description: 'A linked wallet was removed.', payload: '{ walletId }' },
  { name: 'kyc.verified', description: 'KYC verification completed for a partner.', payload: '{ partnerId, tier }' },
  { name: 'webhook.delivery_failed', description: 'Webhook delivery exhausted retries.', payload: '{ eventId, statusCode, attempts }' },
];

/* ── Connection snippets ─────────────────────────────────── */
interface SnippetTab {
  label: string;
  lang: string;
  code: string;
}

const wsSnippets: SnippetTab[] = [
  {
    label: 'WebSocket (JS)',
    lang: 'javascript',
    code: `const ws = new WebSocket('wss://api.proxypay.io/stream?token=YOUR_API_KEY');

ws.onopen = () => console.log('Connected');
ws.onmessage = (msg) => {
  const event = JSON.parse(msg.data);
  console.log(event.type, event.data);
};
ws.onclose = (e) => {
  // Reconnect with exponential back-off
  if (!e.wasClean) setTimeout(connect, 1000);
};`,
  },
  {
    label: 'WebSocket (Python)',
    lang: 'python',
    code: `import websocket, json, time

def on_message(ws, message):
    event = json.loads(message)
    print(event["type"], event["data"])

def on_error(ws, error):
    print("Error:", error)

def connect():
    ws = websocket.WebSocketApp(
        "wss://api.proxypay.io/stream",
        header={"Authorization": "Bearer YOUR_API_KEY"},
        on_message=on_message,
        on_error=on_error,
    )
    ws.run_forever()

while True:
    connect()
    time.sleep(2)  # back-off`,
  },
  {
    label: 'SSE (JS)',
    lang: 'javascript',
    code: `const es = new EventSource('https://api.proxypay.io/stream/sse?token=YOUR_API_KEY');

es.addEventListener('payment.created', (e) => {
  console.log(JSON.parse(e.data));
});

es.addEventListener('transfer.completed', (e) => {
  console.log(JSON.parse(e.data));
});

es.onerror = () => {
  // EventSource auto-reconnects; handle fatal errors here
};`,
  },
  {
    label: 'gRPC (Go)',
    lang: 'go',
    code: `import (
  "context"
  "log"
  pb "proxypay/api/events/v1"
  "google.golang.org/grpc"
  "google.golang.org/grpc/credentials/insecure"
)

func main() {
  conn, _ := grpc.Dial("api.proxypay.io:443",
    grpc.WithTransportCredentials(insecure.NewCredentials()),
    grpc.WithPerRPCCredentials(tokenAuth{token: "YOUR_API_KEY"}),
  )
  defer conn.Close()

  client := pb.NewEventServiceClient(conn)
  stream, _ := client.StreamEvents(context.Background(),
    &pb.StreamRequest{Types: []string{"payment.*"}},
  )
  for {
    event, err := stream.Recv()
    if err != nil { break }
    log.Println(event.Type, string(event.Data))
  }
}`,
  },
  {
    label: 'cURL (SSE)',
    lang: 'bash',
    code: `curl -N https://api.proxypay.io/stream/sse \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  },
];

/* ── Page component ──────────────────────────────────────── */
export default function Streaming(): React.JSX.Element {
  const [activeSnippet, setActiveSnippet] = useState(0);

  return (
    <Layout title="Streaming & Webhooks" description="ProxyPay real-time event streaming docs">
      <main style={{ padding: '4rem 1.5rem', maxWidth: 960, margin: '0 auto' }}>

        {/* ── Hero ──────────────────────────────────── */}
        <h1>Event Streaming &amp; Webhooks</h1>
        <p>
          ProxyPay delivers real-time events over <strong>WebSocket</strong>,{' '}
          <strong>Server-Sent Events (SSE)</strong>, and <strong>gRPC</strong> streams.
          Use them to react instantly to payment life-cycle changes, transfers, wallet
          links, and KYC updates.
        </p>

        {/* ── Event types table ──────────────────────── */}
        <h2 id="event-types">Event Types</h2>
        <div className="streaming-table-wrapper">
          <table className="streaming-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Description</th>
                <th>Payload keys</th>
              </tr>
            </thead>
            <tbody>
              {eventTypes.map((ev) => (
                <tr key={ev.name}>
                  <td><code>{ev.name}</code></td>
                  <td>{ev.description}</td>
                  <td><code>{ev.payload}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Connection examples ────────────────────── */}
        <h2 id="connection-examples">Connection Examples</h2>
        <div className="streaming-tabs">
          {wsSnippets.map((tab, i) => (
            <button
              key={tab.label}
              className={`streaming-tab ${i === activeSnippet ? 'streaming-tab--active' : ''}`}
              onClick={() => setActiveSnippet(i)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="streaming-code-block">
          <pre><code>{wsSnippets[activeSnippet].code}</code></pre>
        </div>

        {/* ── Auth ───────────────────────────────────── */}
        <h2 id="auth">Authentication for Streaming Endpoints</h2>
        <p>
          All streaming endpoints accept the same API key you use for REST calls.
          Pass it as:
        </p>
        <ul>
          <li><strong>WebSocket / SSE:</strong> query parameter <code>?token=KEY</code> or <code>Authorization: Bearer KEY</code> header.</li>
          <li><strong>gRPC:</strong> per-RPC credentials (<code>authorization</code> metadata key).</li>
        </ul>
        <p>
          For server-to-server webhooks, ProxyPay signs each delivery with an
          <code>X-ProxyPay-Signature</code> HMAC-SHA256 header. Verify it with your
          dashboard secret before processing the payload.
        </p>

        {/* ── Reconnection strategies ────────────────── */}
        <h2 id="reconnection">Reconnection Strategies</h2>
        <div className="streaming-grid">
          <div className="streaming-card">
            <h3>Exponential Back-off</h3>
            <p>Start at 1 s, double up to 60 s, add ±20 % jitter.</p>
            <pre><code>{`delay = min(base * 2^attempt + jitter, max)`}</code></pre>
          </div>
          <div className="streaming-card">
            <h3>Idempotency</h3>
            <p>Every event carries a unique <code>eventId</code>. Deduplicate on receipt to
            safely replay.</p>
          </div>
          <div className="streaming-card">
            <h3>Heartbeat / Ping-Pong</h3>
            <p>WebSocket servers send a ping every 30 s. If three pings go unanswered the
            connection is dropped.</p>
          </div>
        </div>

        {/* ── Backpressure ───────────────────────────── */}
        <h2 id="backpressure">Backpressure Handling</h2>
        <p>
          When your consumer cannot keep up, ProxyPay buffers up to <strong>10 000 events</strong>{' '}
          per connection. The buffer is a ring — once full the oldest events are dropped and a{' '}
          <code>stream.backpressure</code> event is emitted with the count of lost events.
        </p>
        <div className="streaming-card">
          <h3>Recommendations</h3>
          <ul>
            <li>Process events asynchronously — acknowledge receipt immediately.</li>
            <li>Use a dedicated worker thread / queue for heavy processing.</li>
            <li>Monitor the <code>stream.backpressure</code> event to trigger auto-scaling.</li>
          </ul>
        </div>
      </main>
    </Layout>
  );
}
