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
// A change is treated as "deprecated" when it is flagged as a deprecation
// severity or its endpoint has entered the deprecated sunset phase.
const isDeprecated = (d: EndpointDiff): boolean =>
  d.severity === 'deprecation' || d.sunsetStatus === 'deprecated';

export default function MigrationGuide(): React.JSX.Element {
  const [expandedMigration, setExpandedMigration] = useState<string | null>(MIGRATION_DATA[0]?.to || null);
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());
  const [deprecatedOnly, setDeprecatedOnly] = useState(false);

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

  const deprecatedDiffs = useMemo(() => allDiffs.filter(isDeprecated), [allDiffs]);
  const hasDeprecated = deprecatedDiffs.length > 0;

  // When the deprecated-only filter is active, keep only migrations that still
  // contain a deprecated change.
  const visibleMigrations = useMemo(
    () =>
      deprecatedOnly
        ? MIGRATION_DATA.filter((m) => m.diffs.some(isDeprecated))
        : MIGRATION_DATA,
    [deprecatedOnly]
  );

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
      </div>

      {/* Deprecation banner — shown whenever any deprecated change exists */}
      {hasDeprecated && (
        <div
          data-testid="deprecation-banner"
          role="alert"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.9rem 1.25rem',
            marginBottom: '1.5rem',
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderLeft: '5px solid #d97706',
            borderRadius: 10,
            color: '#92400e',
            fontSize: '0.9rem',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>⚠️</span>
          <span style={{ flex: '1 1 260px' }}>
            <strong>
              {deprecatedDiffs.length} deprecated{' '}
              {deprecatedDiffs.length === 1 ? 'endpoint/change' : 'endpoints/changes'} found.
            </strong>{' '}
            Deprecated items are still available but will be removed at their sunset date — migrate
            before then.
          </span>
          <button
            type="button"
            onClick={() => setDeprecatedOnly((v) => !v)}
            style={{
              ...styles.toggleBtn,
              borderColor: deprecatedOnly ? '#d97706' : '#d0d5dd',
              background: deprecatedOnly ? '#d97706' : '#fff',
              color: deprecatedOnly ? '#fff' : '#92400e',
            }}
          >
            {deprecatedOnly ? '↺ Show all changes' : '⚠ Show deprecated only'}
          </button>
        </div>
      )}

      {/* Per-version Migrations */}
      {visibleMigrations.map((migration) => {
        // While the deprecated-only filter is active, force-expand any migration
        // that still has a deprecated change so the highlighted cards are visible.
        const isExpanded =
          expandedMigration === migration.to ||
          (deprecatedOnly && migration.diffs.some(isDeprecated));
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

                {migration.diffs
                  .filter((diff) => !deprecatedOnly || isDeprecated(diff))
                  .map((diff) => {
                  const diffKey = `${migration.to}-${diff.path}-${diff.method}`;
                  const isDiffExpanded = expandedDiffs.has(diffKey);
                  const deprecated = isDeprecated(diff);
                  const baseBg = deprecated ? '#fffbeb' : 'transparent';
                  return (
                    <div
                      key={diffKey}
                      data-testid={deprecated ? 'diff-card-deprecated' : 'diff-card'}
                      data-deprecated={deprecated ? 'true' : 'false'}
                      style={{
                        ...styles.diffCard,
                        background: baseBg,
                        ...(deprecated
                          ? { borderLeft: '4px solid #d97706', paddingLeft: 'calc(1.5rem - 4px)' }
                          : {}),
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = deprecated
                          ? '#fef3c7'
                          : '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = baseBg;
                      }}
                    >
                      <div style={styles.diffHeader}>
                        {deprecated && (
                          <span
                            data-testid="deprecated-flag"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '0.2rem 0.6rem',
                              borderRadius: 6,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              background: '#d97706',
                              color: '#fff',
                            }}
                          >
                            ⚠ Deprecated
                          </span>
                        )}
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

                      {isDiffExpanded && diff.migrationCode && (
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
                            Migration Code
                          </span>
                          {diff.migrationCode}
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
