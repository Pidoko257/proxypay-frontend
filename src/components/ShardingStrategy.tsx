import React, { useState, useMemo } from 'react';

// ── Types ──────────────────────────────────────────────────────────

type ShardStatus = 'healthy' | 'degraded' | 'offline';
type MigrationStatus = 'pending' | 'running' | 'done' | 'failed';

interface Shard {
  id: string;
  region: string;
  node: string;
  keyRange: string;
  recordCount: number;
  storageGB: number;
  cpuPct: number;
  memPct: number;
  qps: number;
  status: ShardStatus;
  replicaLag: number; // ms
}

interface MigrationJob {
  id: string;
  sourceShard: string;
  targetShard: string;
  recordsMoved: number;
  totalRecords: number;
  status: MigrationStatus;
  startedAt: string;
  eta: string;
}

interface RebalanceEvent {
  timestamp: string;
  fromShard: string;
  toShard: string;
  recordsMoved: number;
  trigger: string;
}

interface FailoverEvent {
  timestamp: string;
  shard: string;
  reason: string;
  promotedReplica: string;
  rtoMs: number;
}

// ── Mock Data ──────────────────────────────────────────────────────

const SHARDS: Shard[] = [
  { id: 'shard-01', region: 'us-east-1', node: 'db-node-01', keyRange: '0x0000 – 0x1FFF', recordCount: 4_200_000, storageGB: 84, cpuPct: 42, memPct: 58, qps: 12400, status: 'healthy', replicaLag: 2 },
  { id: 'shard-02', region: 'us-east-1', node: 'db-node-02', keyRange: '0x2000 – 0x3FFF', recordCount: 3_950_000, storageGB: 79, cpuPct: 38, memPct: 54, qps: 11800, status: 'healthy', replicaLag: 3 },
  { id: 'shard-03', region: 'eu-west-1', node: 'db-node-03', keyRange: '0x4000 – 0x5FFF', recordCount: 4_600_000, storageGB: 92, cpuPct: 71, memPct: 76, qps: 14200, status: 'degraded', replicaLag: 120 },
  { id: 'shard-04', region: 'eu-west-1', node: 'db-node-04', keyRange: '0x6000 – 0x7FFF', recordCount: 4_100_000, storageGB: 82, cpuPct: 45, memPct: 61, qps: 12100, status: 'healthy', replicaLag: 4 },
  { id: 'shard-05', region: 'ap-southeast-1', node: 'db-node-05', keyRange: '0x8000 – 0x9FFF', recordCount: 3_800_000, storageGB: 76, cpuPct: 34, memPct: 49, qps: 9800, status: 'healthy', replicaLag: 5 },
  { id: 'shard-06', region: 'ap-southeast-1', node: 'db-node-06', keyRange: '0xA000 – 0xBFFF', recordCount: 0, storageGB: 0, cpuPct: 0, memPct: 0, qps: 0, status: 'offline', replicaLag: 0 },
  { id: 'shard-07', region: 'us-west-2', node: 'db-node-07', keyRange: '0xC000 – 0xDFFF', recordCount: 4_050_000, storageGB: 81, cpuPct: 40, memPct: 56, qps: 11500, status: 'healthy', replicaLag: 6 },
  { id: 'shard-08', region: 'us-west-2', node: 'db-node-08', keyRange: '0xE000 – 0xFFFF', recordCount: 3_700_000, storageGB: 74, cpuPct: 36, memPct: 52, qps: 10900, status: 'healthy', replicaLag: 3 },
];

const MIGRATIONS: MigrationJob[] = [
  { id: 'mig-001', sourceShard: 'shard-03', targetShard: 'shard-06', recordsMoved: 820_000, totalRecords: 1_200_000, status: 'running', startedAt: '2026-08-01T08:00:00Z', eta: '2026-08-01T14:00:00Z' },
  { id: 'mig-002', sourceShard: 'shard-01', targetShard: 'shard-08', recordsMoved: 500_000, totalRecords: 500_000, status: 'done', startedAt: '2026-07-30T06:00:00Z', eta: '2026-07-30T10:00:00Z' },
  { id: 'mig-003', sourceShard: 'shard-05', targetShard: 'shard-06', recordsMoved: 0, totalRecords: 800_000, status: 'pending', startedAt: '—', eta: '2026-08-02T09:00:00Z' },
  { id: 'mig-004', sourceShard: 'shard-04', targetShard: 'shard-02', recordsMoved: 100_000, totalRecords: 600_000, status: 'failed', startedAt: '2026-07-31T12:00:00Z', eta: '—' },
];

const REBALANCE_HISTORY: RebalanceEvent[] = [
  { timestamp: '2026-07-29 03:15', fromShard: 'shard-03', toShard: 'shard-06', recordsMoved: 400_000, trigger: 'CPU > 70%' },
  { timestamp: '2026-07-25 11:42', fromShard: 'shard-01', toShard: 'shard-08', recordsMoved: 500_000, trigger: 'Storage > 80GB' },
  { timestamp: '2026-07-20 00:00', fromShard: 'shard-05', toShard: 'shard-07', recordsMoved: 350_000, trigger: 'Scheduled weekly' },
];

const FAILOVER_HISTORY: FailoverEvent[] = [
  { timestamp: '2026-07-28 17:03', shard: 'shard-06', reason: 'Primary node OOM crash', promotedReplica: 'db-node-06-replica-a', rtoMs: 4200 },
  { timestamp: '2026-07-15 09:11', shard: 'shard-03', reason: 'Network partition (EU-WEST-1)', promotedReplica: 'db-node-03-replica-b', rtoMs: 6800 },
];

const SHARD_KEY_STRATEGIES = [
  {
    name: 'Hash-based (current)',
    description: 'SHA-256(user_id) mod N. Evenly distributes writes. No range query support on shard key.',
    pros: ['Even data distribution', 'Predictable routing', 'No hotspots'],
    cons: ['No range scans', 'Re-hash on resize', 'Cross-shard joins'],
    recommended: true,
  },
  {
    name: 'Range-based',
    description: 'Partition by transaction_date ranges. Ideal for time-series queries.',
    pros: ['Range queries efficient', 'Easy archival', 'Temporal locality'],
    cons: ['Write hotspots on latest shard', 'Manual range management', 'Uneven sizes'],
    recommended: false,
  },
  {
    name: 'Geographic',
    description: 'Partition by user country_code. Keeps data close to users; aids compliance.',
    pros: ['Data sovereignty', 'Low-latency reads', 'Compliance-friendly'],
    cons: ['Uneven distribution', 'Cross-region transactions', 'Complex routing'],
    recommended: false,
  },
];

// ── Styles ─────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem 4rem', fontFamily: 'system-ui, -apple-system, sans-serif' },
  h1: { fontSize: '2rem', fontWeight: 700, color: 'var(--ifm-color-primary-darkest, #1a5c32)', margin: '0 0 0.25rem' },
  subtitle: { color: '#64748b', fontSize: '1rem', marginBottom: '2rem' },
  tabs: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem', borderBottom: '2px solid #e8ecf0', paddingBottom: '0.5rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  cardTitle: { fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' },
  cardValue: { fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #e8ecf0' },
  th: { textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #e8ecf0', background: '#f8fafc' },
  td: { padding: '0.7rem 1rem', fontSize: '0.87rem', color: '#334155', borderBottom: '1px solid #f1f5f9' },
  sectionTitle: { fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', margin: '2rem 0 1rem' },
  infoBox: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#166534' },
  recBadge: { position: 'absolute', top: 12, right: 12, background: 'var(--ifm-color-primary, #2e8555)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 8 },
  progressTrack: { background: '#e8ecf0', borderRadius: 6, height: 10, overflow: 'hidden', flex: 1 },
};

// ── Style factory functions ─────────────────────────────────────────
const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '0.5rem 1.1rem', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
  fontWeight: active ? 700 : 500, fontSize: '0.9rem', transition: 'all 0.15s',
  background: active ? 'var(--ifm-color-primary, #2e8555)' : '#f1f5f9',
  color: active ? '#fff' : '#475569',
});
const badge = (color: string, bg: string): React.CSSProperties => ({ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 10, fontSize: '0.73rem', fontWeight: 700, color, background: bg });
const barFill = (pct: number, color: string): React.CSSProperties => ({ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 4, transition: 'width 0.4s' });
const progressFill = (pct: number, color: string): React.CSSProperties => ({ height: '100%', width: `${pct}%`, background: color, borderRadius: 6, transition: 'width 0.4s' });
const strategyCard = (rec: boolean): React.CSSProperties => ({ background: '#fff', borderRadius: 12, border: rec ? '2px solid var(--ifm-color-primary, #2e8555)' : '1px solid #e8ecf0', padding: '1.25rem', position: 'relative', boxShadow: rec ? '0 4px 16px rgba(46,133,85,0.1)' : '0 1px 4px rgba(0,0,0,0.04)' });
const listDot = (color: string): React.CSSProperties => ({ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 6 });

// ── Status Badge ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: ShardStatus }) {
  const cfg = {
    healthy:  { bg: '#dcfce7', fg: '#166534', label: '● Healthy' },
    degraded: { bg: '#fef3c7', fg: '#92400e', label: '▲ Degraded' },
    offline:  { bg: '#fee2e2', fg: '#991b1b', label: '✕ Offline' },
  }[status];
  return <span style={badge(cfg.fg, cfg.bg)}>{cfg.label}</span>;
}

function MigStatusBadge({ status }: { status: MigrationStatus }) {
  const cfg = {
    pending: { bg: '#f1f5f9', fg: '#475569', label: '⏳ Pending' },
    running: { bg: '#dbeafe', fg: '#1e40af', label: '▶ Running' },
    done:    { bg: '#dcfce7', fg: '#166534', label: '✓ Done' },
    failed:  { bg: '#fee2e2', fg: '#991b1b', label: '✕ Failed' },
  }[status];
  return <span style={badge(cfg.fg, cfg.bg)}>{cfg.label}</span>;
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  const barColor = pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : color;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ height: 8, borderRadius: 4, background: '#e8ecf0', overflow: 'hidden' }}>
        <div style={barFill(pct, barColor)} />
      </div>
      <span style={{ fontSize: '0.78rem', color: pct > 80 ? '#ef4444' : '#334155', fontWeight: 600, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

type Tab = 'overview' | 'shards' | 'routing' | 'migration' | 'rebalancing' | 'failover';

export default function ShardingStrategy(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('overview');

  const totalRecords = useMemo(() => SHARDS.reduce((a, b) => a + b.recordCount, 0), []);
  const healthyCnt = SHARDS.filter(s => s.status === 'healthy').length;
  const degradedCnt = SHARDS.filter(s => s.status === 'degraded').length;
  const avgCpu = Math.round(SHARDS.filter(s => s.status !== 'offline').reduce((a, b) => a + b.cpuPct, 0) / SHARDS.filter(s => s.status !== 'offline').length);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview',    label: '🗺 Overview' },
    { id: 'shards',      label: '🗄 Shard Map' },
    { id: 'routing',     label: '🔀 Routing Logic' },
    { id: 'migration',   label: '📦 Migration' },
    { id: 'rebalancing', label: '⚖ Rebalancing' },
    { id: 'failover',    label: '🔁 Failover' },
  ];

  return (
    <div style={s.container}>
      <h1 style={s.h1}>🗄 Database Sharding Strategy</h1>
      <p style={s.subtitle}>#282 — Horizontal scaling strategy for ProxyPay transaction volumes</p>

      {/* Summary cards */}
      <div style={s.grid}>
        {[
          { label: 'Total Shards', value: String(SHARDS.length) },
          { label: 'Healthy', value: `${healthyCnt} / ${SHARDS.length}` },
          { label: 'Total Records', value: (totalRecords / 1_000_000).toFixed(1) + 'M' },
          { label: 'Avg CPU', value: `${avgCpu}%` },
          { label: 'Degraded', value: String(degradedCnt), warn: degradedCnt > 0 },
        ].map(c => (
          <div key={c.label} style={s.card}>
            <div style={s.cardTitle}>{c.label}</div>
            <div style={{ ...s.cardValue, color: (c as any).warn ? '#f59e0b' : '#1e293b' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map(t => (
          <button key={t.id} style={tabStyle(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {tab === 'overview' && (
        <div>
          <div style={s.infoBox}>
            <strong>Strategy:</strong> Hash-based sharding on <code>user_id</code> using SHA-256 mod 8. Each shard owns a 0x2000-wide key range. Writes are load-balanced; reads include the shard key in all queries to avoid scatter-gather.
          </div>
          <p style={s.sectionTitle}>Shard Key Strategy Comparison</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {SHARD_KEY_STRATEGIES.map(strat => (
              <div key={strat.name} style={strategyCard(strat.recommended)}>
                {strat.recommended && <span style={s.recBadge}>✓ In Use</span>}
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.4rem', color: '#1e293b' }}>{strat.name}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>{strat.description}</div>
                <div style={{ fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 600, color: '#166534', marginBottom: '0.25rem' }}>Pros</div>
                  {strat.pros.map(p => <div key={p}><span style={listDot('#22c55e')} />{p}</div>)}
                  <div style={{ fontWeight: 600, color: '#991b1b', margin: '0.5rem 0 0.25rem' }}>Cons</div>
                  {strat.cons.map(c => <div key={c}><span style={listDot('#ef4444')} />{c}</div>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Shard Map tab ── */}
      {tab === 'shards' && (
        <table style={s.table}>
          <thead>
            <tr>
              {['Shard', 'Region', 'Key Range', 'Records', 'Storage', 'CPU', 'Mem', 'QPS', 'Replica Lag', 'Status'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SHARDS.map(shard => (
              <tr key={shard.id}>
                <td style={s.td}><code style={{ fontSize: '0.82rem' }}>{shard.id}</code></td>
                <td style={s.td}><span style={{ fontSize: '0.82rem', color: '#64748b' }}>{shard.region}</span></td>
                <td style={s.td}><code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.1rem 0.3rem', borderRadius: 4 }}>{shard.keyRange}</code></td>
                <td style={s.td}>{shard.recordCount > 0 ? (shard.recordCount / 1_000_000).toFixed(2) + 'M' : '—'}</td>
                <td style={s.td}>{shard.storageGB > 0 ? shard.storageGB + ' GB' : '—'}</td>
                <td style={{ ...s.td, minWidth: 100 }}>{shard.status !== 'offline' ? <MiniBar pct={shard.cpuPct} color="#3b82f6" /> : '—'}</td>
                <td style={{ ...s.td, minWidth: 100 }}>{shard.status !== 'offline' ? <MiniBar pct={shard.memPct} color="#8b5cf6" /> : '—'}</td>
                <td style={s.td}>{shard.qps > 0 ? shard.qps.toLocaleString() : '—'}</td>
                <td style={s.td}>{shard.replicaLag > 0 ? <span style={{ color: shard.replicaLag > 50 ? '#f59e0b' : '#334155' }}>{shard.replicaLag}ms</span> : '—'}</td>
                <td style={s.td}><StatusBadge status={shard.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Routing Logic tab ── */}
      {tab === 'routing' && (
        <div>
          <div style={s.infoBox}>
            The routing layer intercepts every query, extracts the <code>user_id</code>, hashes it, and maps the result to the target shard without a lookup table — O(1) routing.
          </div>
          {[
            { step: '1', title: 'Extract shard key', desc: 'Pull user_id from request context (JWT sub claim or request body).', code: 'const shardKey = req.user.id; // UUID v4' },
            { step: '2', title: 'Hash the key', desc: 'SHA-256 → take first 16 bits (big-endian) → integer 0–65535.', code: 'const hash = parseInt(sha256(shardKey).slice(0, 4), 16);' },
            { step: '3', title: 'Map to shard', desc: 'Divide the 64 k range into N equal buckets. Select matching shard.', code: 'const shardIndex = Math.floor(hash / (65536 / SHARD_COUNT));\nconst shard = SHARD_MAP[shardIndex];' },
            { step: '4', title: 'Execute query', desc: 'Open pooled connection from the shard\'s connection pool. Run query. Return result.', code: 'const pool = shardPools.get(shard.id);\nreturn pool.query(sql, params);' },
            { step: '5', title: 'Failover check', desc: 'If primary unreachable, router retries against the promoted replica. Circuit breaker trips after 5 failures in 10 s.', code: 'if (!primary.healthy) return replica.query(sql, params);' },
          ].map(item => (
            <div key={item.step} style={{ marginBottom: '1.25rem', borderLeft: '3px solid var(--ifm-color-primary, #2e8555)', paddingLeft: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ background: 'var(--ifm-color-primary, #2e8555)', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>{item.step}</span>
                <strong style={{ fontSize: '0.95rem' }}>{item.title}</strong>
              </div>
              <p style={{ margin: '0 0 0.5rem', color: '#475569', fontSize: '0.85rem' }}>{item.desc}</p>
              <pre style={{ background: '#1e293b', color: '#e2e8f0', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.8rem', overflowX: 'auto', margin: 0 }}>{item.code}</pre>
            </div>
          ))}
        </div>
      )}

      {/* ── Migration tab ── */}
      {tab === 'migration' && (
        <div>
          <div style={s.infoBox}>Online migration moves records between shards with zero downtime using a dual-write + backfill pattern.</div>
          <table style={s.table}>
            <thead>
              <tr>{['Job ID', 'Source', 'Target', 'Progress', 'Status', 'Started', 'ETA'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {MIGRATIONS.map(m => {
                const pct = m.totalRecords > 0 ? Math.round((m.recordsMoved / m.totalRecords) * 100) : 0;
                return (
                  <tr key={m.id}>
                    <td style={s.td}><code style={{ fontSize: '0.82rem' }}>{m.id}</code></td>
                    <td style={s.td}><code style={{ fontSize: '0.82rem' }}>{m.sourceShard}</code></td>
                    <td style={s.td}><code style={{ fontSize: '0.82rem' }}>{m.targetShard}</code></td>
                    <td style={{ ...s.td, minWidth: 160 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div style={s.progressTrack}><div style={progressFill(pct, '#3b82f6')} /></div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, minWidth: 36 }}>{pct}%</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{m.recordsMoved.toLocaleString()} / {m.totalRecords.toLocaleString()}</span>
                      </div>
                    </td>
                    <td style={s.td}><MigStatusBadge status={m.status} /></td>
                    <td style={s.td}><span style={{ fontSize: '0.8rem' }}>{m.startedAt}</span></td>
                    <td style={s.td}><span style={{ fontSize: '0.8rem' }}>{m.eta}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Rebalancing tab ── */}
      {tab === 'rebalancing' && (
        <div>
          <div style={s.infoBox}>
            Rebalancing is triggered automatically when any shard exceeds: CPU &gt; 70%, Storage &gt; 80 GB, or QPS &gt; 15 000. A weekly scheduled pass also evens out drift.
          </div>
          <p style={s.sectionTitle}>Rebalance History</p>
          <table style={s.table}>
            <thead>
              <tr>{['Timestamp', 'From', 'To', 'Records Moved', 'Trigger'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {REBALANCE_HISTORY.map((e, i) => (
                <tr key={i}>
                  <td style={s.td}>{e.timestamp}</td>
                  <td style={s.td}><code style={{ fontSize: '0.82rem' }}>{e.fromShard}</code></td>
                  <td style={s.td}><code style={{ fontSize: '0.82rem' }}>{e.toShard}</code></td>
                  <td style={s.td}>{e.recordsMoved.toLocaleString()}</td>
                  <td style={s.td}><span style={badge('#92400e', '#fef3c7')}>{e.trigger}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={s.sectionTitle}>Rebalance Thresholds</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { metric: 'CPU Usage', threshold: '70%', action: 'Migrate 30% of hot keys to least-loaded shard' },
              { metric: 'Storage', threshold: '80 GB / shard', action: 'Split shard and redistribute key range' },
              { metric: 'QPS', threshold: '15 000 / shard', action: 'Add read replica or migrate write keys' },
              { metric: 'Replica Lag', threshold: '> 100 ms', action: 'Alert + throttle writes to affected shard' },
            ].map(t => (
              <div key={t.metric} style={s.card}>
                <div style={s.cardTitle}>{t.metric}</div>
                <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1.2rem', marginBottom: '0.4rem' }}>{t.threshold}</div>
                <div style={{ fontSize: '0.82rem', color: '#475569' }}>{t.action}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Failover tab ── */}
      {tab === 'failover' && (
        <div>
          <div style={s.infoBox}>
            Each shard primary has 2 synchronous replicas in the same region. Failover is automatic via a Raft-based consensus protocol. RTO target: &lt; 5 000 ms. RPO: 0 (synchronous replication).
          </div>
          <p style={s.sectionTitle}>Recent Failover Events</p>
          <table style={s.table}>
            <thead>
              <tr>{['Timestamp', 'Shard', 'Reason', 'Promoted Replica', 'RTO'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {FAILOVER_HISTORY.map((e, i) => (
                <tr key={i}>
                  <td style={s.td}>{e.timestamp}</td>
                  <td style={s.td}><code style={{ fontSize: '0.82rem' }}>{e.shard}</code></td>
                  <td style={s.td}>{e.reason}</td>
                  <td style={s.td}><code style={{ fontSize: '0.82rem' }}>{e.promotedReplica}</code></td>
                  <td style={s.td}><span style={{ fontWeight: 700, color: e.rtoMs > 5000 ? '#ef4444' : '#16a34a' }}>{e.rtoMs.toLocaleString()} ms</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={s.sectionTitle}>Failover Runbook</p>
          {[
            { step: '1', title: 'Detection', desc: 'Health-check daemon pings primary every 500 ms. After 3 consecutive misses (1.5 s), primary is declared failed.' },
            { step: '2', title: 'Leader Election', desc: 'Raft quorum among replicas elects a new leader. Replica with lowest lag and most up-to-date WAL wins.' },
            { step: '3', title: 'Promotion', desc: 'Elected replica promoted to primary. DNS/routing entry updated. Remaining replica re-syncs from new primary.' },
            { step: '4', title: 'Client Reconnect', desc: 'Connection pools detect broken connections and reconnect to new primary within 1 retry cycle (max 500 ms).' },
            { step: '5', title: 'Alerting', desc: 'PagerDuty alert fired. On-call engineer investigates failed node. New replica provisioned within 30 min SLA.' },
          ].map(item => (
            <div key={item.step} style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{item.step}</span>
              <div>
                <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{item.title}</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#475569' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
