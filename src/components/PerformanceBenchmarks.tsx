import React, { useState, useMemo } from 'react';
import { SLADrilldown } from './SLADrilldown';

// ── Types ──────────────────────────────────────────────────────────
interface EndpointBenchmark {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  avgResponseTime: number; // ms
  p50: number;
  p95: number;
  p99: number;
  throughput: number; // req/sec
  uptime: number; // %
  slaTarget: number; // ms
  slaStatus: 'ok' | 'warn' | 'breach';
  category: string;
}

interface HistoricalPoint {
  date: string;
  p50: number;
  p95: number;
  p99: number;
  throughput: number;
}

// ── Mock Data ──────────────────────────────────────────────────────
const BENCHMARK_DATA: EndpointBenchmark[] = [
  {
    endpoint: 'POST /payments',
    method: 'POST',
    avgResponseTime: 187,
    p50: 152,
    p95: 420,
    p99: 890,
    throughput: 245,
    uptime: 99.97,
    slaTarget: 500,
    slaStatus: 'ok',
    category: 'Payments',
  },
  {
    endpoint: 'POST /payments/bulk',
    method: 'POST',
    avgResponseTime: 1240,
    p50: 980,
    p95: 2850,
    p99: 4200,
    throughput: 28,
    uptime: 99.95,
    slaTarget: 3000,
    slaStatus: 'ok',
    category: 'Payments',
  },
  {
    endpoint: 'GET /payments/{id}',
    method: 'GET',
    avgResponseTime: 89,
    p50: 72,
    p95: 195,
    p99: 340,
    throughput: 1200,
    uptime: 99.99,
    slaTarget: 200,
    slaStatus: 'ok',
    category: 'Payments',
  },
  {
    endpoint: 'GET /momo/lookup',
    method: 'GET',
    avgResponseTime: 520,
    p50: 410,
    p95: 1250,
    p99: 2100,
    throughput: 180,
    uptime: 99.82,
    slaTarget: 800,
    slaStatus: 'warn',
    category: 'Mobile Money',
  },
  {
    endpoint: 'POST /momo/disburse',
    method: 'POST',
    avgResponseTime: 310,
    p50: 245,
    p95: 720,
    p99: 1450,
    throughput: 95,
    uptime: 99.91,
    slaTarget: 750,
    slaStatus: 'ok',
    category: 'Mobile Money',
  },
  {
    endpoint: 'GET /wallets/{id}',
    method: 'GET',
    avgResponseTime: 45,
    p50: 38,
    p95: 95,
    p99: 180,
    throughput: 3200,
    uptime: 99.98,
    slaTarget: 100,
    slaStatus: 'ok',
    category: 'Wallets',
  },
  {
    endpoint: 'POST /wallets/{id}/convert',
    method: 'POST',
    avgResponseTime: 210,
    p50: 175,
    p95: 480,
    p99: 920,
    throughput: 430,
    uptime: 99.94,
    slaTarget: 500,
    slaStatus: 'ok',
    category: 'Wallets',
  },
  {
    endpoint: 'GET /reconciliation/daily',
    method: 'GET',
    avgResponseTime: 780,
    p50: 560,
    p95: 2100,
    p99: 3800,
    throughput: 45,
    uptime: 99.75,
    slaTarget: 1000,
    slaStatus: 'warn',
    category: 'Reconciliation',
  },
  {
    endpoint: 'POST /bridge/v2',
    method: 'POST',
    avgResponseTime: 340,
    p50: 280,
    p95: 850,
    p99: 1600,
    throughput: 110,
    uptime: 99.89,
    slaTarget: 800,
    slaStatus: 'ok',
    category: 'Bridge',
  },
  {
    endpoint: 'GET /payments/stream',
    method: 'GET',
    avgResponseTime: 15,
    p50: 12,
    p95: 35,
    p99: 80,
    throughput: 500,
    uptime: 99.96,
    slaTarget: 50,
    slaStatus: 'ok',
    category: 'Payments',
  },
];

function generateHistory(base: EndpointBenchmark): HistoricalPoint[] {
  const points: HistoricalPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const jitter = () => 0.85 + Math.random() * 0.3;
    points.push({
      date: d.toISOString().slice(0, 10),
      p50: Math.round(base.p50 * jitter()),
      p95: Math.round(base.p95 * jitter()),
      p99: Math.round(base.p99 * jitter()),
      throughput: Math.round(base.throughput * jitter()),
    });
  }
  return points;
}

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
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  summaryCard: {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e8ecf0',
    padding: '1.25rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    textAlign: 'center' as const,
    transition: 'box-shadow 0.2s, transform 0.15s',
  },
  summaryValue: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#1e293b',
    margin: '0.35rem 0',
  },
  summaryLabel: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  filters: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  filterSelect: {
    padding: '0.5rem 0.75rem',
    borderRadius: 8,
    border: '1px solid #d0d5dd',
    fontSize: '0.9rem',
    background: '#fff',
    cursor: 'pointer',
    outline: 'none',
    minWidth: 140,
  },
  searchInput: {
    flex: '1 1 220px',
    padding: '0.6rem 1rem',
    borderRadius: 8,
    border: '1px solid #d0d5dd',
    fontSize: '0.95rem',
    outline: 'none',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    background: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    border: '1px solid #e8ecf0',
  },
  th: {
    textAlign: 'left' as const,
    padding: '0.85rem 1rem',
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: '2px solid #e8ecf0',
    background: '#f8fafc',
  },
  td: {
    padding: '0.75rem 1rem',
    fontSize: '0.88rem',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
  },
  methodBadge: {
    display: 'inline-block',
    padding: '0.15rem 0.5rem',
    borderRadius: 5,
    fontSize: '0.72rem',
    fontWeight: 700,
    marginRight: 6,
  } as React.CSSProperties,
  slaBadge: {
    display: 'inline-block',
    padding: '0.2rem 0.6rem',
    borderRadius: 10,
    fontSize: '0.75rem',
    fontWeight: 700,
  } as React.CSSProperties,
  barCell: {
    position: 'relative' as const,
    height: 24,
  },
  bar: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.4s ease',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 8,
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#fff',
  } as React.CSSProperties,
  trendSection: {
    marginTop: '2rem',
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e8ecf0',
    padding: '1.5rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  trendHeader: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '1rem',
  },
  chartContainer: {
    position: 'relative' as const,
    height: 220,
    overflow: 'hidden',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '4rem 1rem',
    color: '#94a3b8',
    fontSize: '1rem',
  },
};

// ── Style Helpers ─────────────────────────────────────────────────
function getMethodBadgeStyle(method: string): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    GET: { bg: '#dcfce7', fg: '#166534' },
    POST: { bg: '#dbeafe', fg: '#1e40af' },
    PUT: { bg: '#fef3c7', fg: '#92400e' },
    DELETE: { bg: '#fee2e2', fg: '#991b1b' },
  };
  const c = colors[method] || { bg: '#f1f5f9', fg: '#475569' };
  return {
    ...styles.methodBadge,
    background: c.bg,
    color: c.fg,
  };
}

function getSLABadgeStyle(status: string): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    ok: { bg: '#dcfce7', fg: '#166534' },
    warn: { bg: '#fef3c7', fg: '#92400e' },
    breach: { bg: '#fee2e2', fg: '#991b1b' },
  };
  const c = colors[status] || colors.ok;
  return {
    ...styles.slaBadge,
    background: c.bg,
    color: c.fg,
  };
}

function getBarStyle(value: number, max: number, color: string): React.CSSProperties {
  return {
    ...styles.bar,
    width: `${(value / max) * 100}%`,
    background: color,
    minWidth: value > 0 ? 4 : 0,
  };
}

// ── Chart Sub-Component ────────────────────────────────────────────
function LatencyChart({ history }: { history: HistoricalPoint[] }) {
  if (!history.length) return null;
  const w = 1000;
  const h = 200;
  const pad = { top: 20, right: 20, bottom: 30, left: 50 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const allVals = history.flatMap((p) => [p.p50, p.p95, p.p99]);
  const maxVal = Math.max(...allVals, 10);

  const scaleX = (i: number) => pad.left + (i / (history.length - 1)) * plotW;
  const scaleY = (v: number) => pad.top + plotH - (v / maxVal) * plotH;

  const line = (key: keyof HistoricalPoint, color: string, dash?: string) => {
    const d = history
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(p[key] as number)}`)
      .join('');
    return (
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray={dash}
        key={key}
      />
    );
  };

  const yTicks = 5;
  const circles = history
    .filter((_, i) => i === history.length - 1)
    .flatMap((p) => [
      { key: 'p99', val: p.p99, color: '#ef4444', label: 'p99' },
      { key: 'p95', val: p.p95, color: '#f59e0b', label: 'p95' },
      { key: 'p50', val: p.p50, color: '#22c55e', label: 'p50' },
    ]);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const val = Math.round((maxVal / yTicks) * i);
        const y = scaleY(val);
        return (
          <g key={`y-${i}`}>
            <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#f1f5f9" strokeWidth={1} />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">
              {val}ms
            </text>
          </g>
        );
      })}
      {line('p99', '#ef4444', '4,2')}
      {line('p95', '#f59e0b', '4,2')}
      {line('p50', '#22c55e')}
      {circles.map((c) => (
        <g key={c.key}>
          <circle cx={scaleX(history.length - 1)} cy={scaleY(c.val)} r={4} fill={c.color} />
          <text
            x={scaleX(history.length - 1) + 8}
            y={scaleY(c.val) + 4}
            fontSize={10}
            fontWeight={600}
            fill={c.color}
          >
            {c.label} {c.val}ms
          </text>
        </g>
      ))}
      {history.map((p, i) => (
        <text
          key={`x-${i}`}
          x={scaleX(i)}
          y={h - 6}
          textAnchor="middle"
          fontSize={8}
          fill="#94a3b8"
          opacity={i % 7 === 0 ? 1 : 0}
        >
          {p.date.slice(5)}
        </text>
      ))}
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export default function PerformanceBenchmarks(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [slaFilter, setSlaFilter] = useState('all');
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointBenchmark | null>(null);
  const [drilldownEndpoint, setDrilldownEndpoint] = useState<EndpointBenchmark | null>(null);

  const categories = useMemo(
    () => [...new Set(BENCHMARK_DATA.map((b) => b.category))],
    []
  );

  const filtered = useMemo(() => {
    return BENCHMARK_DATA.filter((b) => {
      const q = search.toLowerCase();
      const matchSearch = !q || b.endpoint.toLowerCase().includes(q);
      const matchCat = categoryFilter === 'all' || b.category === categoryFilter;
      const matchSla = slaFilter === 'all' || b.slaStatus === slaFilter;
      return matchSearch && matchCat && matchSla;
    });
  }, [search, categoryFilter, slaFilter]);

  const history = useMemo(
    () => (selectedEndpoint ? generateHistory(selectedEndpoint) : []),
    [selectedEndpoint]
  );

  const summaries = useMemo(() => {
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    return {
      avgLatency: Math.round(avg(BENCHMARK_DATA.map((b) => b.p50))),
      avgThroughput: Math.round(avg(BENCHMARK_DATA.map((b) => b.throughput))),
      avgUptime: (avg(BENCHMARK_DATA.map((b) => b.uptime))).toFixed(2),
      slaOk: BENCHMARK_DATA.filter((b) => b.slaStatus === 'ok').length,
      slaWarn: BENCHMARK_DATA.filter((b) => b.slaStatus === 'warn').length,
    };
  }, []);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>⚡ Performance Benchmarks</h1>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryCards}>
        {[
          { label: 'Avg p50 Latency', value: `${summaries.avgLatency}ms`, color: '#22c55e' },
          { label: 'Avg Throughput', value: `${summaries.avgThroughput} req/s`, color: '#3b82f6' },
          { label: 'Avg Uptime', value: `${summaries.avgUptime}%`, color: '#8b5cf6' },
          { label: 'SLA OK', value: `${summaries.slaOk} / ${BENCHMARK_DATA.length}`, color: '#22c55e' },
        ].map((card) => (
          <div
            key={card.label}
            style={styles.summaryCard}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
              (e.currentTarget as HTMLElement).style.transform = '';
            }}
          >
            <div style={styles.summaryLabel}>{card.label}</div>
            <div style={{ ...styles.summaryValue, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <input
          style={styles.searchInput}
          type="text"
          placeholder="🔍 Search endpoints…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={styles.filterSelect}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          style={styles.filterSelect}
          value={slaFilter}
          onChange={(e) => setSlaFilter(e.target.value)}
        >
          <option value="all">All SLA Status</option>
          <option value="ok">✅ OK</option>
          <option value="warn">⚠️ Warning</option>
          <option value="breach">🔴 Breach</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={styles.emptyState}>No endpoints match your filters.</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Endpoint</th>
              <th style={styles.th}>p50</th>
              <th style={styles.th}>p95</th>
              <th style={styles.th}>p99</th>
              <th style={styles.th}>Throughput</th>
              <th style={styles.th}>Uptime</th>
              <th style={styles.th}>SLA</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr
                key={b.endpoint}
                style={{
                  cursor: 'pointer',
                  background: selectedEndpoint?.endpoint === b.endpoint ? '#f0fdf4' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onClick={() =>
                  setSelectedEndpoint(
                    selectedEndpoint?.endpoint === b.endpoint ? null : b
                  )
                }
                onMouseEnter={(e) => {
                  if (selectedEndpoint?.endpoint !== b.endpoint)
                    (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (selectedEndpoint?.endpoint !== b.endpoint)
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <td style={styles.td}>
                  <span style={getMethodBadgeStyle(b.method)}>{b.method}</span>
                  <code style={{ fontSize: '0.85rem', color: '#1e293b' }}>{b.endpoint}</code>
                </td>
                <td style={styles.td}>
                  <div style={styles.barCell}>
                    <div style={getBarStyle(b.p50, 500, '#22c55e')}>{b.p50}ms</div>
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={styles.barCell}>
                    <div style={getBarStyle(b.p95, 3000, '#f59e0b')}>{b.p95}ms</div>
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={styles.barCell}>
                    <div style={getBarStyle(b.p99, 5000, '#ef4444')}>{b.p99}ms</div>
                  </div>
                </td>
                <td style={styles.td}>
                  <strong>{b.throughput}</strong>{' '}
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>req/s</span>
                </td>
                <td style={styles.td}>
                  <span
                    style={{
                      fontWeight: 600,
                      color: b.uptime >= 99.9 ? '#16a34a' : b.uptime >= 99.5 ? '#ca8a04' : '#dc2626',
                    }}
                  >
                    {b.uptime}%
                  </span>
                </td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...getSLABadgeStyle(b.slaStatus),
                      cursor: b.slaStatus !== 'ok' ? 'pointer' : 'default',
                      opacity: b.slaStatus !== 'ok' ? 0.9 : 1,
                      transition: 'opacity 0.2s',
                    }}
                    onClick={() => {
                      if (b.slaStatus !== 'ok') setDrilldownEndpoint(b);
                    }}
                    onMouseEnter={(e) => {
                      if (b.slaStatus !== 'ok') {
                        (e.currentTarget as HTMLElement).style.opacity = '1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (b.slaStatus !== 'ok') {
                        (e.currentTarget as HTMLElement).style.opacity = '0.9';
                      }
                    }}
                    title={b.slaStatus !== 'ok' ? 'Click to drill down' : undefined}
                  >
                    {b.slaStatus === 'ok' ? '✅ OK' : b.slaStatus === 'warn' ? '⚠ Warn' : '🔴 Breach'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Historical Trend */}
      {selectedEndpoint && (
        <div style={styles.trendSection}>
          <div style={styles.trendHeader}>
            📈 Latency Trend —{' '}
            <code style={{ background: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
              {selectedEndpoint.endpoint}
            </code>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: 8 }}>
              (30-day history)
            </span>
          </div>
          <div style={styles.chartContainer}>
            <LatencyChart history={history} />
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.82rem' }}>
            <span><span style={{ color: '#22c55e', fontWeight: 700 }}>— p50</span> median</span>
            <span><span style={{ color: '#f59e0b', fontWeight: 700 }}>- - p95</span> 95th</span>
            <span><span style={{ color: '#ef4444', fontWeight: 700 }}>- - p99</span> 99th</span>
          </div>
        </div>
      )}

      {/* SLA Targets Reference */}
      <div
        style={{
          marginTop: '2rem',
          padding: '1.25rem',
          background: '#f8fafc',
          borderRadius: 12,
          border: '1px solid #e8ecf0',
          fontSize: '0.85rem',
          color: '#475569',
        }}
      >
        <strong>📊 Performance Targets</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '2rem', marginTop: '0.5rem' }}>
          <div>p50 &lt; 200ms for read endpoints</div>
          <div>p99 &lt; 1000ms for write endpoints</div>
          <div>Uptime SLA ≥ 99.9%</div>
          <div>Throughput ≥ 100 req/s per endpoint</div>
        </div>
      </div>

      {/* SLA Drill-down Modal */}
      {drilldownEndpoint && (
        <SLADrilldown
          endpoint={drilldownEndpoint}
          isOpen={!!drilldownEndpoint}
          onClose={() => setDrilldownEndpoint(null)}
        />
      )}
    </div>
  );
}
