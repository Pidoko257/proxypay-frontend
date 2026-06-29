import React, { useRef, useState } from 'react';

const RATE_LIMIT = 5;
const BASE_URLS: Record<string, string> = {
  testnet: 'https://api-testnet.proxypay.io/v1/payments/initiate',
  mainnet: 'https://api.proxypay.io/v1/payments/initiate',
};

interface ResponseState {
  status: number | null;
  body: unknown;
  error: string | null;
}

function JsonDisplay({ value }: { value: unknown }): React.JSX.Element {
  const text = JSON.stringify(value, null, 2);
  const TOKEN_RE =
    /("(?:[^"\\]|\\.)*"(?:\s*:)?|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    let color = '#005cc5';
    if (tok.startsWith('"')) {
      color = tok.trimEnd().endsWith(':') ? '#d73a49' : '#22863a';
    } else if (tok === 'true' || tok === 'false') {
      color = '#e36209';
    } else if (tok === 'null') {
      color = '#6f42c1';
    }
    parts.push(
      <span key={key++} style={{ color }}>
        {tok}
      </span>,
    );
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return (
    <pre className="pp-playground__json">
      <code>{parts}</code>
    </pre>
  );
}

export default function ApiPlayground(): React.JSX.Element {
  const [token, setToken] = useState('');
  const [network, setNetwork] = useState('testnet');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [recipient, setRecipient] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ResponseState | null>(null);
  const [remaining, setRemaining] = useState(RATE_LIMIT);

  const timestamps = useRef<number[]>([]);

  function refreshRemaining(): number {
    const now = Date.now();
    timestamps.current = timestamps.current.filter((t) => now - t < 60_000);
    const rem = RATE_LIMIT - timestamps.current.length;
    setRemaining(rem);
    return rem;
  }

  async function handleSend() {
    const rem = refreshRemaining();
    if (rem <= 0) {
      setResponse({ status: null, body: null, error: 'Rate limit reached. Try again in 1 minute.' });
      return;
    }

    timestamps.current.push(Date.now());
    setRemaining((r) => r - 1);
    setLoading(true);
    setResponse(null);

    const body = {
      amount: parseFloat(amount) || 0,
      currency,
      recipient,
      description: description || undefined,
    };

    try {
      const res = await fetch(BASE_URLS[network], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      let parsed: unknown;
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        parsed = await res.json();
      } else {
        parsed = { message: await res.text() };
      }
      setResponse({ status: res.status, body: parsed, error: null });
    } catch (err) {
      setResponse({
        status: null,
        body: null,
        error: err instanceof Error ? err.message : 'Network error',
      });
    } finally {
      setLoading(false);
    }
  }

  const isOk = response?.status !== null && response?.status !== undefined && response.status < 400;

  return (
    <div className="pp-playground">
      <div className="pp-playground__header">
        <h3>POST /payments/initiate</h3>
        <span
          className={`pp-playground__rate-limit${remaining <= 1 ? ' pp-playground__rate-limit--low' : ''}`}
          aria-live="polite"
        >
          {remaining}/{RATE_LIMIT} sandbox calls remaining
        </span>
      </div>

      <div className="pp-playground__form">
        <div className="pp-playground__row">
          <div className="pp-playground__field">
            <label htmlFor="pg-network">Network</label>
            <select id="pg-network" value={network} onChange={(e) => setNetwork(e.target.value)}>
              <option value="testnet">Testnet (sandbox)</option>
              <option value="mainnet">Mainnet</option>
            </select>
          </div>
          <div className="pp-playground__field">
            <label htmlFor="pg-token">Bearer Token</label>
            <input
              id="pg-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="sk_test_..."
            />
          </div>
        </div>

        <div className="pp-playground__row">
          <div className="pp-playground__field">
            <label htmlFor="pg-amount">Amount</label>
            <input
              id="pg-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10.00"
              min="0.01"
              step="0.01"
            />
          </div>
          <div className="pp-playground__field">
            <label htmlFor="pg-currency">Currency</label>
            <select id="pg-currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="KES">KES</option>
            </select>
          </div>
        </div>

        <div className="pp-playground__field">
          <label htmlFor="pg-recipient">Recipient</label>
          <input
            id="pg-recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="recipient@example.com or +254700000000"
          />
        </div>

        <div className="pp-playground__field">
          <label htmlFor="pg-description">Description (optional)</label>
          <input
            id="pg-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Payment for services"
          />
        </div>

        <div>
          <button
            type="button"
            className="button button--primary"
            onClick={handleSend}
            disabled={loading || !amount || !recipient || !token}
          >
            {loading ? 'Sending…' : 'Send Request'}
          </button>
        </div>
      </div>

      {response !== null && (
        <div className="pp-playground__response">
          <div className="pp-playground__response-header">
            <strong>Response</strong>
            {response.status !== null && (
              <span className={`pp-playground__status${isOk ? ' pp-playground__status--ok' : ' pp-playground__status--err'}`}>
                {response.status}
              </span>
            )}
          </div>
          {response.error !== null ? (
            <pre className="pp-playground__json pp-playground__json--error">{response.error}</pre>
          ) : (
            <JsonDisplay value={response.body} />
          )}
        </div>
      )}
    </div>
  );
}
