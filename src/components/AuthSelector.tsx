import React, { useState } from 'react';

type AuthMethod = 'apiKey' | 'oauth2' | 'bearer' | 'mtls';

const exampleTemplates: Record<AuthMethod, Record<string, string>> = {
  apiKey: {
    curl: `curl -H "X-API-KEY: YOUR_API_KEY" https://api.example.com/endpoint`,
    python: `import requests
resp = requests.get('https://api.example.com/endpoint', headers={'X-API-KEY': 'YOUR_API_KEY'})
print(resp.json())`,
    js: `fetch('https://api.example.com/endpoint', { headers: { 'X-API-KEY': 'YOUR_API_KEY' } }).then(r=>r.json()).then(console.log)`,
    go: `req, _ := http.NewRequest("GET", "https://api.example.com/endpoint", nil)
req.Header.Set("X-API-KEY", "YOUR_API_KEY")
resp, _ := http.DefaultClient.Do(req)
defer resp.Body.Close()`
  },
  oauth2: {
    curl: `curl -H "Authorization: Bearer ACCESS_TOKEN" https://api.example.com/endpoint`,
    python: `import requests
resp = requests.get('https://api.example.com/endpoint', headers={'Authorization': 'Bearer ACCESS_TOKEN'})
print(resp.json())`,
    js: `fetch('https://api.example.com/endpoint', { headers: { 'Authorization': 'Bearer ACCESS_TOKEN' } }).then(r=>r.json())`,
    go: `req, _ := http.NewRequest("GET", "https://api.example.com/endpoint", nil)
req.Header.Set("Authorization", "Bearer ACCESS_TOKEN")
resp, _ := http.DefaultClient.Do(req)`
  },
  bearer: {
    curl: `curl -H "Authorization: Bearer YOUR_TOKEN" https://api.example.com/endpoint`,
    python: `import requests
resp = requests.get('https://api.example.com/endpoint', headers={'Authorization': 'Bearer YOUR_TOKEN'})
print(resp.json())`,
    js: `fetch('https://api.example.com/endpoint', { headers: { 'Authorization': 'Bearer YOUR_TOKEN' } }).then(r=>r.json())`,
    go: `req, _ := http.NewRequest("GET", "https://api.example.com/endpoint", nil)
req.Header.Set("Authorization", "Bearer YOUR_TOKEN")
resp, _ := http.DefaultClient.Do(req)`
  },
  mtls: {
    curl: `curl --cert client.crt --key client.key https://api.example.com/endpoint`,
    python: `import requests
resp = requests.get('https://api.example.com/endpoint', cert=('client.crt','client.key'))
print(resp.json())`,
    js: `// mTLS not available in browser JS; use server-side TLS config`,
    go: `cert, _ := tls.LoadX509KeyPair("client.crt", "client.key")
tr := &http.Transport{TLSClientConfig: &tls.Config{Certificates: []tls.Certificate{cert}}}
client := &http.Client{Transport: tr}
client.Get("https://api.example.com/endpoint")`
  }
};

export default function AuthSelector(): React.JSX.Element {
  const [method, setMethod] = useState<AuthMethod>('apiKey');
  const [lang, setLang] = useState<string>('curl');

  const qrUrl = encodeURIComponent(window.location.origin + '/docs/auth');
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrUrl}`;

  function recordExampleSeen() {
    try {
      const key = `auth_example_counts`;
      const raw = localStorage.getItem(key) || '{}';
      const obj = JSON.parse(raw);
      const k = `${method}:${lang}`;
      obj[k] = (obj[k] || 0) + 1;
      localStorage.setItem(key, JSON.stringify(obj));
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className="auth-selector">
      <div className="auth-controls">
        <label className="auth-label">Auth:</label>
        <select value={method} onChange={(e) => setMethod(e.target.value as AuthMethod)}>
          <option value="apiKey">API Key</option>
          <option value="oauth2">OAuth2</option>
          <option value="bearer">Bearer Token</option>
          <option value="mtls">mTLS</option>
        </select>
        <label className="lang-label">Language:</label>
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="curl">cURL</option>
          <option value="python">Python</option>
          <option value="js">JavaScript</option>
          <option value="go">Go</option>
        </select>
      </div>

      <div className="auth-description">
        {method === 'apiKey' && <p>Authenticate requests with an API key sent in a header or query parameter.</p>}
        {method === 'oauth2' && <p>Use OAuth2 to obtain an access token and send it as a bearer token.</p>}
        {method === 'bearer' && <p>Use a bearer token in the Authorization header for each request.</p>}
        {method === 'mtls' && <p>Mutual TLS (mTLS) requires client certificates for TLS connection.</p>}
      </div>

      <div className="auth-example">
        <div className="example-header">
          <strong>Example — {method === 'apiKey' ? 'API Key' : method === 'oauth2' ? 'OAuth2' : method === 'bearer' ? 'Bearer' : 'mTLS'}</strong>
          <button
            onClick={() => {
              recordExampleSeen();
              const code = exampleTemplates[method][lang] || '';
              navigator.clipboard?.writeText(code);
            }}
          >
            Copy
          </button>
        </div>
        <pre className="auth-code">{exampleTemplates[method][lang]}</pre>
      </div>

      <div className="auth-qr">
        <a href="/docs/auth" target="_blank" rel="noreferrer">Detailed auth guide</a>
        <img src={qrSrc} alt="Auth guide QR" />
      </div>
    </div>
  );
}
