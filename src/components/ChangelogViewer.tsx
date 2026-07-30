import React, { useState, useMemo, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────
type EntryType = 'new' | 'fix' | 'deprecation';
type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';
type ViewMode = 'timeline' | 'compact';

interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  type: EntryType;
  title: string;
  description: string;
  impact: ImpactLevel;
  endpoints: string[];
  tags: string[];
}

// ── Mock Data ──────────────────────────────────────────────────────
const CHANGELOG_DATA: ChangelogEntry[] = [
  {
    id: 'cl-1',
    version: 'v2.4.0',
    date: '2026-07-14',
    type: 'new',
    title: 'Bulk Payment Endpoint',
    description: 'New `/payments/bulk` endpoint allows submitting up to 1000 payments in a single request, reducing network overhead for high-volume partners.',
    impact: 'low',
    endpoints: ['POST /payments/bulk'],
    tags: ['payments'],
  },
  {
    id: 'cl-2',
    version: 'v2.4.0',
    date: '2026-07-14',
    type: 'new',
    title: 'Webhook Signature Verification',
    description: 'All webhook payloads now include `X-ProxyPay-Signature` header for payload integrity verification using HMAC-SHA256.',
    impact: 'low',
    endpoints: ['POST /webhooks'],
    tags: ['webhooks', 'security'],
  },
  {
    id: 'cl-3',
    version: 'v2.3.1',
    date: '2026-06-28',
    type: 'fix',
    title: 'Rate Limit Headers Missing',
    description: 'Fixed an issue where `X-RateLimit-Remaining` header was not returned on 429 responses for the Mobile Money lookup endpoint.',
    impact: 'low',
    endpoints: ['GET /momo/lookup'],
    tags: ['mobile-money'],
  },
  {
    id: 'cl-4',
    version: 'v2.3.0',
    date: '2026-06-10',
    type: 'new',
    title: 'Transaction Reconciliation API',
    description: 'New reconciliation endpoint that returns daily settlement summaries with detailed breakdowns per currency and provider.',
    impact: 'medium',
    endpoints: ['GET /reconciliation/daily', 'GET /reconciliation/summary'],
    tags: ['reconciliation'],
  },
  {
    id: 'cl-5',
    version: 'v2.3.0',
    date: '2026-06-10',
    type: 'deprecation',
    title: 'Legacy Stellar Bridge Deprecated',
    description: 'The `/bridge/legacy` endpoint is now deprecated and will be removed in v3.0.0. Migrate to `/bridge/v2` which offers lower fees and faster settlement.',
    impact: 'high',
    endpoints: ['POST /bridge/legacy'],
    tags: ['bridge', 'stellar'],
  },
  {
    id: 'cl-6',
    version: 'v2.2.0',
    date: '2026-05-20',
    type: 'new',
    title: 'Multi-Currency Wallet Support',
    description: 'Wallets now support multiple currencies simultaneously. Added endpoints for currency conversion and balance queries per currency.',
    impact: 'medium',
    endpoints: ['GET /wallets/{id}/balances', 'POST /wallets/{id}/convert'],
    tags: ['wallets'],
  },
  {
    id: 'cl-7',
    version: 'v2.2.0',
    date: '2026-05-20',
    type: 'fix',
    title: 'Idempotency Key Race Condition',
    description: 'Resolved a race condition where duplicate idempotency keys submitted within 100ms could both be processed.',
    impact: 'high',
    endpoints: ['POST /payments'],
    tags: ['payments', 'bugfix'],
  },
  {
    id: 'cl-8',
    version: 'v2.1.0',
    date: '2026-04-02',
    type: 'deprecation',
    title: 'XML Response Format Sunset',
    description: 'XML response format is deprecated. All endpoints now default to JSON. Set `Accept: application/xml` to opt-in during the 6-month sunset period ending 2026-10-02.',
    impact: 'critical',
    endpoints: ['* (all endpoints)'],
    tags: ['format', 'breaking'],
  },
  {
    id: 'cl-9',
    version: 'v2.1.0',
    date: '2026-04-02',
    type: 'new',
    title: 'Real-Time Payment Status via SSE',
    description: 'Server-Sent Events endpoint for live payment status updates. Subscribe to `GET /payments/stream` and receive push notifications for status changes.',
    impact: 'low',
    endpoints: ['GET /payments/stream'],
    tags: ['payments', 'realtime'],
  },
  {
    id: 'cl-10',
    version: 'v2.0.0',
    date: '2026-03-01',
    type: 'new',
    title: 'v2.0 Major Release',
    description: 'Complete API redesign with simplified authentication (API keys instead of OAuth2), unified error responses, and new Mobile Money provider abstraction layer.',
    impact: 'critical',
    endpoints: ['* (all endpoints)'],
    tags: ['release', 'breaking'],
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
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--ifm-color-primary-darkest, #1a5c32)',
    margin: 0,
  },
  stats: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap' as const,
  },
  statBadge: {
    padding: '0.35rem 0.9rem',
    borderRadius: 20,
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  controls: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.75rem',
    marginBottom: '1.5rem',
    alignItems: 'center',
  },
  searchInput: {
    flex: '1 1 260px',
    padding: '0.6rem 1rem',
    borderRadius: 8,
    border: '1px solid #d0d5dd',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  filterSelect: {
    padding: '0.5rem 0.75rem',
    borderRadius: 8,
    border: '1px solid #d0d5dd',
    fontSize: '0.9rem',
    background: '#fff',
    cursor: 'pointer',
    outline: 'none',
    minWidth: 120,
  },
  viewToggle: {
    display: 'flex',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #d0d5dd',
  },
  viewBtn: (active: boolean): React.CSSProperties => ({
    padding: '0.45rem 1rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    background: active ? 'var(--ifm-color-primary, #2e8555)' : '#fff',
    color: active ? '#fff' : '#555',
    transition: 'background 0.2s, color 0.2s',
  }),
  timeline: {
    position: 'relative' as const,
    paddingLeft: '2.5rem',
  },
  timelineLine: {
    position: 'absolute' as const,
    left: 14,
    top: 0,
    bottom: 0,
    width: 3,
    background: 'linear-gradient(to bottom, var(--ifm-color-primary, #2e8555), #e0e0e0)',
    borderRadius: 2,
  },
  entryCard: {
    position: 'relative' as const,
    background: '#fff',
    border: '1px solid #e8ecf0',
    borderRadius: 12,
    padding: '1.25rem 1.5rem',
    marginBottom: '1.25rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    transition: 'box-shadow 0.2s, transform 0.15s',
    cursor: 'default',
  },
  timelineDot: (type: EntryType): React.CSSProperties => {
    const colors: Record<EntryType, string> = {
      new: '#22c55e',
      fix: '#f59e0b',
      deprecation: '#ef4444',
    };
    return {
      position: 'absolute' as const,
      left: -36,
      top: '1.5rem',
      width: 14,
      height: 14,
      borderRadius: '50%',
      background: colors[type],
      border: '3px solid #fff',
      boxShadow: `0 0 0 2px ${colors[type]}`,
      zIndex: 1,
    };
  },
  typeBadge: (type: EntryType): React.CSSProperties => {
    const colors: Record<EntryType, { bg: string; fg: string }> = {
      new: { bg: '#dcfce7', fg: '#166534' },
      fix: { bg: '#fef9c3', fg: '#854d0e' },
      deprecation: { bg: '#fee2e2', fg: '#991b1b' },
    };
    return {
      display: 'inline-block',
      padding: '0.2rem 0.6rem',
      borderRadius: 6,
      fontSize: '0.75rem',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
      background: colors[type].bg,
      color: colors[type].fg,
    };
  },
  impactBadge: (impact: ImpactLevel): React.CSSProperties => {
    const colors: Record<ImpactLevel, { bg: string; fg: string }> = {
      low: { bg: '#e0e7ff', fg: '#3730a3' },
      medium: { bg: '#fef3c7', fg: '#92400e' },
      high: { bg: '#fed7aa', fg: '#9a3412' },
      critical: { bg: '#fecaca', fg: '#7f1d1d' },
    };
    return {
      display: 'inline-block',
      padding: '0.18rem 0.55rem',
      borderRadius: 5,
      fontSize: '0.72rem',
      fontWeight: 600,
      background: colors[impact].bg,
      color: colors[impact].fg,
      marginLeft: 8,
    };
  },
  endpointTag: {
    display: 'inline-block',
    padding: '0.2rem 0.55rem',
    borderRadius: 5,
    fontSize: '0.78rem',
    fontFamily: 'SF Mono, Fira Code, monospace',
    background: '#f1f5f9',
    color: '#334155',
    marginRight: 6,
    marginTop: 6,
  },
  subscribeBox: {
    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
    border: '1px solid #bbf7d0',
    borderRadius: 12,
    padding: '1.5rem',
    marginTop: '2rem',
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '1rem',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subscribeInput: {
    flex: '1 1 220px',
    padding: '0.6rem 1rem',
    borderRadius: 8,
    border: '1px solid #d0d5dd',
    fontSize: '0.9rem',
    outline: 'none',
  },
  subscribeBtn: {
    padding: '0.6rem 1.5rem',
    borderRadius: 8,
    border: 'none',
    background: 'var(--ifm-color-primary, #2e8555)',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s, transform 0.1s',
  },
  rssLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '0.5rem 1rem',
    borderRadius: 8,
    border: '1px solid #d0d5dd',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#e87400',
    textDecoration: 'none',
    background: '#fff',
    transition: 'background 0.2s',
  },
  entryMeta: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.5rem',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  entryVersion: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#555',
  },
  entryDate: {
    fontSize: '0.82rem',
    color: '#999',
  },
  entryTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0.5rem 0 0.35rem',
  },
  entryDesc: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: 1.6,
    marginBottom: '0.6rem',
  },
  compactRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #f1f5f9',
    background: '#fff',
    transition: 'background 0.15s',
    cursor: 'default',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '4rem 1rem',
    color: '#94a3b8',
    fontSize: '1rem',
  },
};

// ── Utility ────────────────────────────────────────────────────────
function formatRSS(entries: ChangelogEntry[]): string {
  const items = entries
    .map(
      (e) => `    <item>
      <title>${e.title} [${e.version}]</title>
      <link>https://proxypay.dev/changelog#${e.id}</link>
      <description>${e.description}</description>
      <pubDate>${new Date(e.date).toUTCString()}</pubDate>
      <category>${e.type}</category>
    </item>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ProxyPay API Changelog</title>
    <link>https://proxypay.dev/changelog</link>
    <description>ProxyPay API updates, new endpoints, and deprecation notices.</description>
    <atom:link href="https://proxypay.dev/changelog/rss" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

function formatAtom(entries: ChangelogEntry[]): string {
  const items = entries
    .map(
      (e) => `    <entry>
      <title>${e.title}</title>
      <id>urn:proxypay:changelog:${e.id}</id>
      <updated>${new Date(e.date).toISOString()}</updated>
      <summary>${e.description}</summary>
      <category term="${e.type}"/>
    </entry>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>ProxyPay API Changelog</title>
  <link href="https://proxypay.dev/changelog" rel="alternate"/>
  <link href="https://proxypay.dev/changelog/atom" rel="self"/>
  <id>https://proxypay.dev/changelog</id>
${items}
</feed>`;
}

// ── Component ─────────────────────────────────────────────────────
export default function ChangelogViewer(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<EntryType | 'all'>('all');
  const [impactFilter, setImpactFilter] = useState<ImpactLevel | 'all'>('all');
  const [versionFilter, setVersionFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const allVersions = useMemo(
    () => [...new Set(CHANGELOG_DATA.map((e) => e.version))].sort().reverse(),
    []
  );

  const filtered = useMemo(() => {
    return CHANGELOG_DATA.filter((entry) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        entry.title.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.endpoints.some((ep) => ep.toLowerCase().includes(q)) ||
        entry.tags.some((t) => t.toLowerCase().includes(q));
      const matchType = typeFilter === 'all' || entry.type === typeFilter;
      const matchImpact = impactFilter === 'all' || entry.impact === impactFilter;
      const matchVersion = versionFilter === 'all' || entry.version === versionFilter;
      return matchSearch && matchType && matchImpact && matchVersion;
    });
  }, [search, typeFilter, impactFilter, versionFilter]);

  const handleRSSExport = useCallback(
    (format: 'rss' | 'atom') => {
      const data = format === 'rss' ? formatRSS(filtered) : formatAtom(filtered);
      const blob = new Blob([data], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proxypay-changelog.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [filtered]
  );

  const handleSubscribe = () => {
    if (!subscribeEmail.trim()) return;
    setSubscribed(true);
    setSubscribeEmail('');
  };

  const stats = useMemo(
    () => ({
      total: CHANGELOG_DATA.length,
      new: CHANGELOG_DATA.filter((e) => e.type === 'new').length,
      fix: CHANGELOG_DATA.filter((e) => e.type === 'fix').length,
      deprecation: CHANGELOG_DATA.filter((e) => e.type === 'deprecation').length,
    }),
    []
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📋 API Changelog</h1>
        <div style={styles.stats}>
          <span style={{ ...styles.statBadge, background: '#dcfce7', color: '#166534' }}>
            ✨ {stats.new} new
          </span>
          <span style={{ ...styles.statBadge, background: '#fef9c3', color: '#854d0e' }}>
            🔧 {stats.fix} fixes
          </span>
          <span style={{ ...styles.statBadge, background: '#fee2e2', color: '#991b1b' }}>
            ⚠️ {stats.deprecation} deprecated
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <input
          style={styles.searchInput}
          type="text"
          placeholder="🔍 Search by endpoint, keyword, or tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={styles.filterSelect}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as EntryType | 'all')}
        >
          <option value="all">All Types</option>
          <option value="new">✨ New</option>
          <option value="fix">🔧 Fix</option>
          <option value="deprecation">⚠️ Deprecation</option>
        </select>
        <select
          style={styles.filterSelect}
          value={impactFilter}
          onChange={(e) => setImpactFilter(e.target.value as ImpactLevel | 'all')}
        >
          <option value="all">All Impact</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select
          style={styles.filterSelect}
          value={versionFilter}
          onChange={(e) => setVersionFilter(e.target.value)}
        >
          <option value="all">All Versions</option>
          {allVersions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <div style={styles.viewToggle}>
          <button
            style={styles.viewBtn(viewMode === 'timeline')}
            onClick={() => setViewMode('timeline')}
          >
            Timeline
          </button>
          <button
            style={styles.viewBtn(viewMode === 'compact')}
            onClick={() => setViewMode('compact')}
          >
            Compact
          </button>
        </div>
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <div style={styles.emptyState}>No changelog entries match your filters.</div>
      ) : viewMode === 'timeline' ? (
        <div style={styles.timeline}>
          <div style={styles.timelineLine} />
          {filtered.map((entry) => (
            <div
              key={entry.id}
              id={entry.id}
              style={styles.entryCard}
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  '0 4px 16px rgba(0,0,0,0.08)';
                (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  '0 1px 4px rgba(0,0,0,0.04)';
                (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
              }}
            >
              <div style={styles.timelineDot(entry.type)} />
              <div style={styles.entryMeta}>
                <span style={styles.typeBadge(entry.type)}>{entry.type}</span>
                <span style={styles.entryVersion}>{entry.version}</span>
                <span style={styles.entryDate}>{entry.date}</span>
                <span style={styles.impactBadge(entry.impact)}>{entry.impact} impact</span>
              </div>
              <h3 style={styles.entryTitle}>{entry.title}</h3>
              <p style={styles.entryDesc}>{entry.description}</p>
              <div>
                {entry.endpoints.map((ep) => (
                  <code key={ep} style={styles.endpointTag}>
                    {ep}
                  </code>
                ))}
              </div>
              {expandedId === entry.id && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    background: '#f8fafc',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    color: '#475569',
                  }}
                >
                  <strong>Tags:</strong>{' '}
                  {entry.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        display: 'inline-block',
                        background: '#e2e8f0',
                        borderRadius: 4,
                        padding: '0.1rem 0.45rem',
                        margin: '0 3px',
                        fontSize: '0.78rem',
                      }}
                    >
                      {t}
                    </span>
                  ))}
                  <br />
                  <strong>ID:</strong> {entry.id}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e8ecf0' }}>
          {filtered.map((entry) => (
            <div
              key={entry.id}
              style={styles.compactRow}
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#fff';
              }}
            >
              <span style={styles.typeBadge(entry.type)}>{entry.type}</span>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', flex: 1 }}>
                {entry.title}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#999' }}>{entry.version}</span>
              <span style={{ fontSize: '0.8rem', color: '#999' }}>{entry.date}</span>
            </div>
          ))}
        </div>
      )}

      {/* Subscribe & Export */}
      <div style={styles.subscribeBox}>
        <div style={{ flex: '1 1 300px' }}>
          <strong style={{ fontSize: '1rem', color: '#166534' }}>
            📬 Stay Updated
          </strong>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: '#4d7c0f' }}>
            Get email notifications when new changelog entries are published.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <input
              style={styles.subscribeInput}
              type="email"
              placeholder="you@company.com"
              value={subscribeEmail}
              onChange={(e) => setSubscribeEmail(e.target.value)}
              disabled={subscribed}
            />
            <button style={styles.subscribeBtn} onClick={handleSubscribe} disabled={subscribed}>
              {subscribed ? '✓ Subscribed!' : 'Subscribe'}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const }}>
          <button style={styles.rssLink} onClick={() => handleRSSExport('rss')}>
            📡 Export RSS
          </button>
          <button style={styles.rssLink} onClick={() => handleRSSExport('atom')}>
            📡 Export Atom
          </button>
        </div>
      </div>
    </div>
  );
}
