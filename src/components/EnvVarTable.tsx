import React, { useState, useMemo } from 'react';

interface EnvVar {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
  group: string;
}

const ENV_VARS: EnvVar[] = [
  { group: 'Server', name: 'PORT', type: 'number', required: false, default: '3000', description: 'HTTP port the server listens on' },
  { group: 'Server', name: 'NODE_ENV', type: 'string', required: false, default: 'development', description: 'Runtime environment (development | production | test)' },
  { group: 'Database', name: 'DATABASE_URL', type: 'url', required: true, description: 'PostgreSQL connection string' },
  { group: 'Database', name: 'REDIS_URL', type: 'url', required: true, description: 'Redis connection string for caching and job queues' },
  { group: 'Auth', name: 'JWT_SECRET', type: 'string', required: true, description: 'Secret key used to sign JWT access tokens' },
  { group: 'Auth', name: 'JWT_EXPIRES_IN', type: 'string', required: false, default: '24h', description: 'JWT token expiry duration (e.g. 1h, 7d)' },
  { group: 'Auth', name: 'REFRESH_TOKEN_SECRET', type: 'string', required: true, description: 'Secret key used to sign refresh tokens' },
  { group: 'Auth', name: 'REFRESH_TOKEN_EXPIRES_IN', type: 'string', required: false, default: '30d', description: 'Refresh token TTL' },
  { group: 'Auth', name: 'API_KEY_SALT_ROUNDS', type: 'number', required: false, default: '12', description: 'bcrypt salt rounds for API key hashing' },
  { group: 'ProxyPay Gateway', name: 'PROXYPAY_WEBHOOK_SECRET', type: 'string', required: true, description: 'HMAC secret for validating inbound ProxyPay webhook signatures' },
  { group: 'ProxyPay Gateway', name: 'PROXYPAY_API_BASE_URL', type: 'url', required: true, description: 'Base URL for the ProxyPay payment gateway API' },
  { group: 'ProxyPay Gateway', name: 'PROXYPAY_PARTNER_ID', type: 'string', required: true, description: 'ProxyPay partner account identifier' },
  { group: 'ProxyPay Gateway', name: 'PROXYPAY_PARTNER_SECRET', type: 'string', required: true, description: 'ProxyPay partner secret for request signing' },
  { group: 'Security', name: 'ALLOWED_ORIGINS', type: 'string', required: false, default: 'http://localhost:3000', description: 'Comma-separated list of allowed CORS origins' },
  { group: 'Security', name: 'RATE_LIMIT_WINDOW_MS', type: 'number', required: false, default: '900000', description: 'Rate limiting window in milliseconds (default: 15 min)' },
  { group: 'Security', name: 'RATE_LIMIT_MAX_REQUESTS', type: 'number', required: false, default: '100', description: 'Maximum requests per IP per rate limit window' },
  { group: 'Security', name: 'ENCRYPTION_KEY', type: 'string', required: true, description: '32-byte hex string for AES-256 encryption of PII' },
  { group: 'Logging', name: 'LOG_LEVEL', type: 'string', required: false, default: 'info', description: 'Logging level (error | warn | info | debug)' },
  { group: 'Logging', name: 'LOG_FORMAT', type: 'string', required: false, default: 'json', description: 'Log output format (json | pretty)' },
  { group: 'Email', name: 'SMTP_HOST', type: 'string', required: false, description: 'SMTP server hostname for transactional email' },
  { group: 'Email', name: 'SMTP_PORT', type: 'number', required: false, default: '587', description: 'SMTP server port' },
  { group: 'Email', name: 'SMTP_USER', type: 'string', required: false, description: 'SMTP authentication username' },
  { group: 'Email', name: 'SMTP_PASS', type: 'string', required: false, description: 'SMTP authentication password' },
  { group: 'Email', name: 'EMAIL_FROM', type: 'string', required: false, default: 'noreply@proxypay.io', description: 'Sender address for outbound emails' },
  { group: 'File Storage', name: 'S3_BUCKET', type: 'string', required: false, description: 'AWS S3 bucket name for file uploads' },
  { group: 'File Storage', name: 'S3_REGION', type: 'string', required: false, default: 'us-east-1', description: 'AWS region for S3 bucket' },
  { group: 'File Storage', name: 'AWS_ACCESS_KEY_ID', type: 'string', required: false, description: 'AWS access key for S3 access' },
  { group: 'File Storage', name: 'AWS_SECRET_ACCESS_KEY', type: 'string', required: false, description: 'AWS secret key for S3 access' },
  { group: 'Observability', name: 'SENTRY_DSN', type: 'url', required: false, description: 'Sentry Data Source Name for error tracking' },
  { group: 'Observability', name: 'FEATURE_FLAGS', type: 'json', required: false, default: '{}', description: 'JSON object of runtime feature flag overrides' },
];

const TYPE_COLORS: Record<string, string> = {
  string: '#3b82f6',
  number: '#f59e0b',
  boolean: '#8b5cf6',
  url: '#10b981',
  json: '#ef4444',
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      title="Copy value"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0 4px',
        color: copied ? 'var(--ifm-color-primary)' : 'var(--ifm-color-emphasis-400)',
        fontSize: '0.85rem',
        lineHeight: 1,
      }}
    >
      {copied ? '✓' : '⎘'}
    </button>
  );
}

export default function EnvVarTable(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [requiredFilter, setRequiredFilter] = useState<'all' | 'required' | 'optional'>('all');

  const filtered = useMemo(() => {
    return ENV_VARS.filter(v => {
      const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.description.toLowerCase().includes(search.toLowerCase());
      const matchRequired =
        requiredFilter === 'all' ||
        (requiredFilter === 'required' && v.required) ||
        (requiredFilter === 'optional' && !v.required);
      return matchSearch && matchRequired;
    });
  }, [search, requiredFilter]);

  const groups = useMemo(() => {
    const map: Record<string, EnvVar[]> = {};
    filtered.forEach(v => {
      (map[v.group] ??= []).push(v);
    });
    return map;
  }, [filtered]);

  return (
    <div style={{ fontFamily: 'var(--ifm-font-family-base)' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Filter variables…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 240px',
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            border: '1px solid var(--ifm-color-emphasis-300)',
            fontSize: '0.9rem',
            background: 'var(--ifm-background-color)',
            color: 'inherit',
          }}
        />
        {(['all', 'required', 'optional'] as const).map(f => (
          <button
            key={f}
            onClick={() => setRequiredFilter(f)}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: 6,
              border: '1px solid var(--ifm-color-emphasis-300)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.85rem',
              textTransform: 'capitalize',
              background: requiredFilter === f ? 'var(--ifm-color-primary)' : 'transparent',
              color: requiredFilter === f ? '#fff' : 'inherit',
            }}
          >
            {f}
          </button>
        ))}
        <span style={{ fontSize: '0.8rem', color: 'var(--ifm-color-emphasis-500)', marginLeft: 'auto' }}>
          {filtered.length} / {ENV_VARS.length} variables
        </span>
      </div>

      {/* Groups */}
      {Object.entries(groups).map(([group, vars]) => (
        <div key={group} style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.5rem', color: 'var(--ifm-color-emphasis-700)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {group}
          </h4>
          <div style={{ border: '1px solid var(--ifm-color-emphasis-200)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--ifm-color-emphasis-100)' }}>
                  {['Variable', 'Type', 'Status', 'Default', 'Description'].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '0.5rem 0.75rem',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        color: 'var(--ifm-color-emphasis-700)',
                        borderBottom: '1px solid var(--ifm-color-emphasis-200)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vars.map((v, i) => (
                  <tr
                    key={v.name}
                    style={{
                      background: i % 2 === 0 ? 'transparent' : 'var(--ifm-color-emphasis-50, rgba(0,0,0,0.02))',
                    }}
                  >
                    {/* Name */}
                    <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'var(--ifm-font-family-monospace)', fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                      <span>{v.name}</span>
                      <CopyButton value={v.name} />
                    </td>
                    {/* Type */}
                    <td style={{ padding: '0.5rem 0.75rem', verticalAlign: 'top' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0 0.45rem',
                        borderRadius: 4,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: `${TYPE_COLORS[v.type]}22`,
                        color: TYPE_COLORS[v.type],
                        border: `1px solid ${TYPE_COLORS[v.type]}44`,
                      }}>
                        {v.type}
                      </span>
                    </td>
                    {/* Status */}
                    <td style={{ padding: '0.5rem 0.75rem', verticalAlign: 'top' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0 0.45rem',
                        borderRadius: 4,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: v.required ? '#ef444422' : '#6b728022',
                        color: v.required ? '#dc2626' : '#6b7280',
                        border: `1px solid ${v.required ? '#ef444444' : '#6b728044'}`,
                      }}>
                        {v.required ? 'required' : 'optional'}
                      </span>
                    </td>
                    {/* Default */}
                    <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'var(--ifm-font-family-monospace)', fontSize: '0.8rem', color: 'var(--ifm-color-emphasis-600)', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      {v.default != null ? (
                        <>
                          <span>{v.default}</span>
                          <CopyButton value={v.default} />
                        </>
                      ) : (
                        <span style={{ color: 'var(--ifm-color-emphasis-400)' }}>—</span>
                      )}
                    </td>
                    {/* Description */}
                    <td style={{ padding: '0.5rem 0.75rem', color: 'var(--ifm-color-emphasis-700)', verticalAlign: 'top' }}>
                      {v.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--ifm-color-emphasis-500)', padding: '2rem' }}>
          No variables match your filter.
        </p>
      )}
    </div>
  );
}
