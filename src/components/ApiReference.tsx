import React, { useState, useRef, useEffect } from 'react';
import { RedocStandalone } from 'redoc';

// ============================================================
// Issue #255 — Schema Type Description data & components
// ============================================================

interface SchemaTypeInfo {
  label: string;
  description: string;
  format?: string;
  constraints?: string;
  enumValues?: string[];
}

const TYPE_DESCRIPTIONS: Record<string, SchemaTypeInfo> = {
  string: {
    label: 'string',
    description: 'A sequence of Unicode characters (UTF-8).',
    format: 'text',
    constraints: 'Any valid UTF-8 string.',
  },
  integer: {
    label: 'integer',
    description: 'A whole number without a fractional component.',
    format: 'int32 or int64',
    constraints: 'Range depends on format (int32: −2³¹ to 2³¹−1).',
  },
  number: {
    label: 'number',
    description: 'A numeric value that may include a fractional part.',
    format: 'float or double',
    constraints: 'IEEE 754 floating-point.',
  },
  boolean: {
    label: 'boolean',
    description: 'A binary true/false value.',
    enumValues: ['true', 'false'],
  },
  array: {
    label: 'array',
    description: 'An ordered list of values of the same type.',
    constraints: 'May specify minItems, maxItems, and uniqueItems.',
  },
  object: {
    label: 'object',
    description: 'A structured map of key-value pairs.',
    constraints: 'May contain required and optional properties.',
  },
  'date-time': {
    label: 'date-time',
    description: 'UTC timestamp in ISO 8601 format.',
    format: 'YYYY-MM-DDTHH:mm:ssZ',
    constraints: 'Must be a valid UTC timestamp.',
  },
  date: {
    label: 'date',
    description: 'Calendar date without time component.',
    format: 'YYYY-MM-DD',
    constraints: 'Must be a valid calendar date.',
  },
  uuid: {
    label: 'uuid',
    description: 'Universally Unique Identifier (RFC 4122).',
    format: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
    constraints: 'Must match UUID v4 pattern.',
  },
  email: {
    label: 'email',
    description: 'A valid email address (RFC 5321).',
    format: 'local-part@domain',
    constraints: 'Must contain exactly one "@" symbol.',
  },
  uri: {
    label: 'uri',
    description: 'Uniform Resource Identifier (RFC 3986).',
    format: 'scheme://authority/path',
    constraints: 'Must be a fully-qualified URI.',
  },
  password: {
    label: 'password',
    description: 'A string value rendered as masked input.',
    constraints: 'Treat as sensitive; do not log.',
  },
  binary: {
    label: 'binary',
    description: 'Binary data, typically base64-encoded.',
    format: 'base64',
    constraints: 'Must be valid base64.',
  },
  int64: {
    label: 'int64',
    description: 'A 64-bit signed integer.',
    format: 'int64',
    constraints: 'Range: −2⁶³ to 2⁶³−1.',
  },
  float: {
    label: 'float',
    description: 'A 32-bit IEEE 754 floating-point number.',
    format: 'float',
    constraints: 'Approximately ±3.4×10³⁸.',
  },
  double: {
    label: 'double',
    description: 'A 64-bit IEEE 754 floating-point number.',
    format: 'double',
    constraints: 'Approximately ±1.7×10³⁰⁸.',
  },
};

interface SchemaField {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  format?: string;
  min?: number | string;
  max?: number | string;
  enumValues?: string[];
}

const EXAMPLE_SCHEMA_FIELDS: SchemaField[] = [
  { name: 'id', type: 'uuid', required: true, description: 'Unique identifier for the resource.' },
  { name: 'created_at', type: 'date-time', required: true, description: 'Creation timestamp in UTC.' },
  { name: 'amount', type: 'number', required: true, description: 'Transaction amount.', min: 0.01, max: 999999.99 },
  { name: 'currency', type: 'string', required: true, description: 'ISO 4217 currency code.', enumValues: ['XLM', 'USD', 'EUR', 'GBP', 'KES'] },
  { name: 'status', type: 'string', required: true, description: 'Current status of the transaction.', enumValues: ['pending', 'completed', 'failed', 'cancelled'] },
  { name: 'reference', type: 'string', required: false, description: 'Optional reference identifier.' },
  { name: 'callback_url', type: 'uri', required: false, description: 'Webhook callback URL.' },
  { name: 'retry_count', type: 'integer', required: false, description: 'Number of retry attempts.', min: 0, max: 5 },
];

interface SchemaTypeTooltipProps {
  typeKey: string;
  format?: string;
  constraints?: string;
  enumValues?: string[];
}

function SchemaTypeTooltip({ typeKey, format, constraints, enumValues }: SchemaTypeTooltipProps): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const info = TYPE_DESCRIPTIONS[typeKey] ?? {
    label: typeKey,
    description: `A value of type "${typeKey}".`,
    format,
    constraints,
    enumValues,
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <span className="schema-type-wrapper" ref={ref}>
      <span className="schema-type-badge">{info.label}</span>
      <button
        className="schema-type-info-btn"
        aria-label={`Type info for ${info.label}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        i
      </button>
      {open && (
        <span
          className="schema-type-tooltip"
          role="tooltip"
          aria-live="polite"
        >
          <div className="schema-type-tooltip-title">{info.label}</div>
          <div className="schema-type-tooltip-desc">{info.description}</div>
          {(info.format || format) && (
            <div className="schema-type-tooltip-meta">
              <strong>Format:</strong> <code>{info.format ?? format}</code>
            </div>
          )}
          {(info.constraints || constraints) && (
            <div className="schema-type-tooltip-meta">
              <strong>Constraints:</strong> {info.constraints ?? constraints}
            </div>
          )}
          {(info.enumValues ?? enumValues)?.length && (
            <div className="schema-type-tooltip-meta">
              <strong>Allowed values:</strong>
              <div className="schema-type-tooltip-enum">
                {(info.enumValues ?? enumValues ?? []).map((v) => (
                  <span key={v} className="schema-enum-value">{v}</span>
                ))}
              </div>
            </div>
          )}
        </span>
      )}
    </span>
  );
}

function SchemaDisplay(): React.JSX.Element {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div className="schema-section-title">Response Schema — Transaction Object</div>
      <table className="schema-fields-table" aria-label="Response schema fields">
        <thead>
          <tr>
            <th scope="col">Field</th>
            <th scope="col">Type</th>
            <th scope="col">Required</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          {EXAMPLE_SCHEMA_FIELDS.map((field) => (
            <tr key={field.name}>
              <td><code>{field.name}</code></td>
              <td>
                <SchemaTypeTooltip
                  typeKey={field.type}
                  format={field.format}
                  constraints={
                    field.min !== undefined || field.max !== undefined
                      ? `min: ${field.min ?? '—'}, max: ${field.max ?? '—'}`
                      : undefined
                  }
                  enumValues={field.enumValues}
                />
              </td>
              <td>
                {field.required
                  ? <span className="schema-required-badge">required</span>
                  : <span style={{ color: 'var(--ifm-color-secondary-darkest)', fontSize: '0.8rem' }}>optional</span>}
              </td>
              <td>
                <span style={{ fontSize: '0.85rem' }}>{field.description}</span>
                {field.enumValues && (
                  <div className="schema-constraint">
                    Values: {field.enumValues.map((v) => (
                      <span key={v} className="schema-enum-value">{v}</span>
                    ))}
                  </div>
                )}
                {(field.min !== undefined || field.max !== undefined) && (
                  <div className="schema-constraint">
                    Range: {field.min ?? '—'} – {field.max ?? '—'}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Issue #253 — Authentication Flow Builder
// ============================================================

type AuthMethod = 'oauth2' | 'apikey' | 'bearer' | 'session';

interface TokenState {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  issuedAt: number;
  status: 'idle' | 'active' | 'expired';
}

const INITIAL_TOKEN: TokenState = {
  accessToken: '',
  refreshToken: '',
  expiresIn: 3600,
  issuedAt: 0,
  status: 'idle',
};

function generateMockToken(prefix = 'tok'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = `${prefix}_`;
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function OAuth2FlowBuilder(): React.JSX.Element {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [scope, setScope] = useState('read:payments write:payments');
  const [grantType, setGrantType] = useState('authorization_code');
  const [token, setToken] = useState<TokenState>(INITIAL_TOKEN);
  const [popup, setPopup] = useState(false);

  function handleAuthorize() {
    setPopup(true);
    // Simulate authorization popup → code exchange
    setTimeout(() => {
      setPopup(false);
      setToken({
        accessToken: generateMockToken('acc'),
        refreshToken: generateMockToken('ref'),
        expiresIn: 3600,
        issuedAt: Date.now(),
        status: 'active',
      });
    }, 1500);
  }

  function handleRefresh() {
    setToken((prev) => ({
      ...prev,
      accessToken: generateMockToken('acc'),
      issuedAt: Date.now(),
      status: 'active',
    }));
  }

  function handleRevoke() {
    setToken({ ...INITIAL_TOKEN, status: 'idle' });
  }

  const elapsed = token.issuedAt ? Math.floor((Date.now() - token.issuedAt) / 1000) : 0;
  const remaining = Math.max(0, token.expiresIn - elapsed);

  return (
    <div className="auth-field-group">
      <div className="auth-field">
        <label htmlFor="oauth2-grant">Grant Type</label>
        <select
          id="oauth2-grant"
          value={grantType}
          onChange={(e) => setGrantType(e.target.value)}
        >
          <option value="authorization_code">Authorization Code</option>
          <option value="pkce">Authorization Code + PKCE</option>
          <option value="client_credentials">Client Credentials</option>
          <option value="implicit">Implicit (legacy)</option>
        </select>
      </div>
      <div className="auth-field">
        <label htmlFor="oauth2-client-id">Client ID</label>
        <input
          id="oauth2-client-id"
          type="text"
          placeholder="your-client-id"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="auth-field">
        <label htmlFor="oauth2-client-secret">Client Secret</label>
        <input
          id="oauth2-client-secret"
          type="password"
          placeholder="••••••••••••••••"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div className="auth-field">
        <label htmlFor="oauth2-scope">Scopes</label>
        <input
          id="oauth2-scope"
          type="text"
          placeholder="read:payments write:payments"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        />
      </div>

      {token.accessToken && (
        <>
          <div>
            <div className="auth-token-label">Access Token</div>
            <div className="auth-token-display" aria-label="Access token value">
              {token.accessToken}
            </div>
          </div>
          {token.refreshToken && (
            <div>
              <div className="auth-token-label">Refresh Token</div>
              <div className="auth-token-display" aria-label="Refresh token value">
                {token.refreshToken}
              </div>
            </div>
          )}
          <div style={{ fontSize: '0.8rem', color: 'var(--ifm-color-secondary-darkest)' }}>
            Token expires in: <strong>{remaining}s</strong>
          </div>
        </>
      )}

      <div className="auth-actions">
        <button
          className="button button--primary"
          onClick={handleAuthorize}
          disabled={popup}
          aria-busy={popup}
          type="button"
          style={{ fontSize: '0.875rem', padding: '0.4rem 0.9rem' }}
        >
          {popup ? 'Authorizing…' : 'Authorize'}
        </button>
        {token.status === 'active' && (
          <button
            className="button button--secondary"
            onClick={handleRefresh}
            type="button"
            style={{ fontSize: '0.875rem', padding: '0.4rem 0.9rem' }}
          >
            Refresh Token
          </button>
        )}
        {token.status !== 'idle' && (
          <button
            className="button button--danger"
            onClick={handleRevoke}
            type="button"
            style={{ fontSize: '0.875rem', padding: '0.4rem 0.9rem' }}
          >
            Revoke
          </button>
        )}
        <span
          className={`auth-status-badge${
            token.status === 'active'
              ? ' auth-status-badge--active'
              : token.status === 'expired'
              ? ' auth-status-badge--expired'
              : ' auth-status-badge--idle'
          }`}
          aria-live="polite"
        >
          {token.status === 'active' ? '✓ Active' : token.status === 'expired' ? '✗ Expired' : '○ Idle'}
        </span>
      </div>
    </div>
  );
}

function ApiKeyBuilder(): React.JSX.Element {
  const [apiKey, setApiKey] = useState('');
  const [location, setLocation] = useState<'header' | 'query'>('header');
  const [paramName, setParamName] = useState('X-API-Key');
  const [applied, setApplied] = useState(false);

  function handleApply() {
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  }

  return (
    <div className="auth-field-group">
      <div className="auth-field">
        <label htmlFor="apikey-location">Location</label>
        <select
          id="apikey-location"
          value={location}
          onChange={(e) => {
            setLocation(e.target.value as 'header' | 'query');
            setParamName(e.target.value === 'header' ? 'X-API-Key' : 'api_key');
          }}
        >
          <option value="header">Header</option>
          <option value="query">Query Parameter</option>
        </select>
      </div>
      <div className="auth-field">
        <label htmlFor="apikey-param-name">Parameter Name</label>
        <input
          id="apikey-param-name"
          type="text"
          value={paramName}
          onChange={(e) => setParamName(e.target.value)}
        />
      </div>
      <div className="auth-field">
        <label htmlFor="apikey-value">API Key</label>
        <input
          id="apikey-value"
          type="password"
          placeholder="••••••••••••••••"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      {apiKey && (
        <div>
          <div className="auth-token-label">Preview</div>
          <div className="auth-token-display" aria-label="API key insertion preview">
            {location === 'header'
              ? `${paramName}: ${'•'.repeat(apiKey.length)}`
              : `?${paramName}=${'•'.repeat(apiKey.length)}`}
          </div>
        </div>
      )}
      <div className="auth-actions">
        <button
          className="button button--primary"
          onClick={handleApply}
          disabled={!apiKey}
          type="button"
          style={{ fontSize: '0.875rem', padding: '0.4rem 0.9rem' }}
        >
          {applied ? '✓ Applied' : 'Apply Key'}
        </button>
        <span className={`auth-status-badge${apiKey && applied ? ' auth-status-badge--active' : ' auth-status-badge--idle'}`} aria-live="polite">
          {apiKey && applied ? '✓ Inserted' : '○ Idle'}
        </span>
      </div>
    </div>
  );
}

function BearerTokenBuilder(): React.JSX.Element {
  const [token, setToken] = useState('');
  const [applied, setApplied] = useState(false);

  function handleApply() {
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  }

  function handleGenerate() {
    setToken(generateMockToken('acc'));
    setApplied(false);
  }

  return (
    <div className="auth-field-group">
      <div className="auth-field">
        <label htmlFor="bearer-token">Bearer Token</label>
        <input
          id="bearer-token"
          type="password"
          placeholder="Enter or generate a token"
          value={token}
          onChange={(e) => { setToken(e.target.value); setApplied(false); }}
          autoComplete="new-password"
        />
      </div>
      {token && (
        <div>
          <div className="auth-token-label">Authorization Header Preview</div>
          <div className="auth-token-display" aria-label="Bearer token header preview">
            Authorization: Bearer {token.slice(0, 8)}…
          </div>
        </div>
      )}
      <div className="auth-actions">
        <button
          className="button button--secondary"
          onClick={handleGenerate}
          type="button"
          style={{ fontSize: '0.875rem', padding: '0.4rem 0.9rem' }}
        >
          Generate Mock Token
        </button>
        <button
          className="button button--primary"
          onClick={handleApply}
          disabled={!token}
          type="button"
          style={{ fontSize: '0.875rem', padding: '0.4rem 0.9rem' }}
        >
          {applied ? '✓ Applied' : 'Apply Token'}
        </button>
        <span className={`auth-status-badge${token && applied ? ' auth-status-badge--active' : ' auth-status-badge--idle'}`} aria-live="polite">
          {token && applied ? '✓ Active' : '○ Idle'}
        </span>
      </div>
    </div>
  );
}

function SessionBuilder(): React.JSX.Element {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<{ id: string; expiresAt: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function handleLogin() {
    if (!username || !password) return;
    setLoading(true);
    setTimeout(() => {
      setSession({
        id: generateMockToken('sess'),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      setLoading(false);
    }, 1000);
  }

  function handleLogout() {
    setSession(null);
  }

  return (
    <div className="auth-field-group">
      <div className="auth-field">
        <label htmlFor="session-username">Username / Email</label>
        <input
          id="session-username"
          type="text"
          placeholder="user@example.com"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
      </div>
      <div className="auth-field">
        <label htmlFor="session-password">Password</label>
        <input
          id="session-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      {session && (
        <div>
          <div className="auth-token-label">Session Token</div>
          <div className="auth-token-display" aria-label="Session token value">
            {session.id}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--ifm-color-secondary-darkest)', marginTop: '0.25rem' }}>
            Expires: {new Date(session.expiresAt).toLocaleString()}
          </div>
        </div>
      )}
      <div className="auth-actions">
        {!session ? (
          <button
            className="button button--primary"
            onClick={handleLogin}
            disabled={loading || !username || !password}
            aria-busy={loading}
            type="button"
            style={{ fontSize: '0.875rem', padding: '0.4rem 0.9rem' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        ) : (
          <button
            className="button button--danger"
            onClick={handleLogout}
            type="button"
            style={{ fontSize: '0.875rem', padding: '0.4rem 0.9rem' }}
          >
            Sign Out
          </button>
        )}
        <span
          className={`auth-status-badge${session ? ' auth-status-badge--active' : ' auth-status-badge--idle'}`}
          aria-live="polite"
        >
          {session ? '✓ Authenticated' : '○ Not signed in'}
        </span>
      </div>
    </div>
  );
}

function AuthFlowBuilder(): React.JSX.Element {
  const [method, setMethod] = useState<AuthMethod>('oauth2');

  const AUTH_METHODS: { key: AuthMethod; label: string }[] = [
    { key: 'oauth2', label: 'OAuth 2.0' },
    { key: 'apikey', label: 'API Key' },
    { key: 'bearer', label: 'Bearer Token' },
    { key: 'session', label: 'Session' },
  ];

  return (
    <div className="auth-builder-panel" aria-label="Authentication Flow Builder">
      <h3>Authentication Flow Builder</h3>

      <div className="auth-method-tabs" role="tablist" aria-label="Authentication methods">
        {AUTH_METHODS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={method === key}
            className={`auth-method-tab${method === key ? ' auth-method-tab--active' : ''}`}
            onClick={() => setMethod(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {method === 'oauth2' && <OAuth2FlowBuilder />}
      {method === 'apikey' && <ApiKeyBuilder />}
      {method === 'bearer' && <BearerTokenBuilder />}
      {method === 'session' && <SessionBuilder />}
    </div>
  );
}

// ============================================================
// Main ApiReference component
// ============================================================

export default function ApiReference(): React.JSX.Element {
  return (
    <div className="api-reference-wrapper">
      {/* Issue #253: Auth Flow Builder */}
      <AuthFlowBuilder />

      {/* Issue #255: Schema type descriptions */}
      <SchemaDisplay />

      {/* Redoc OpenAPI reference */}
      <RedocStandalone
        specUrl="/openapi.yaml"
        options={{
          hideHostname: false,
          disableSearch: false,
          expandResponses: '200,201',
          requiredPropsFirst: true,
          sortPropsAlphabetically: true,
        }}
      />
    </div>
  );
}
