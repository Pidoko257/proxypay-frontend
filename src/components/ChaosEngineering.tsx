import React, { useState, useMemo } from 'react';

// ── Types ──────────────────────────────────────────────────────────

type ExperimentStatus = 'scheduled' | 'running' | 'completed' | 'aborted';
type Severity = 'low' | 'medium' | 'high' | 'critical';
type FailureCategory = 'network' | 'resource' | 'process' | 'dependency' | 'data';

interface ChaosExperiment {
  id: string;
  name: string;
  category: FailureCategory;
  severity: Severity;
  target: string;
  description: string;
  hypothesis: string;
  duration: string;
  status: ExperimentStatus;
  lastRun: string;
  successRate: number;  // % of runs that met hypothesis
  mttr: number;         // mean-time-to-recovery in seconds
  automated: boolean;
}

interface ResilienceMetric {
  service: string;
  availability: number;  // %
  mttr: number;          // s
  mtbf: number;          // hours
  errorBudget: number;   // % remaining
  chaosScore: number;    // 0-100
}

interface NetworkScenario {
  name: string;
  tool: string;
  params: string;
  impact: string;
  mitigated: boolean;
}

interface ResourceScenario {
  name: string;
  tool: string;
  params: string;
  effect: string;
  autoRecovery: boolean;
}

// ── Mock Data ──────────────────────────────────────────────────────

const EXPERIMENTS: ChaosExperiment[] = [
  {
    id: 'che-001', name: 'DB Primary Failure', category: 'process', severity: 'critical',
    target: 'postgres-primary', description: 'Kill the Postgres primary process and verify automatic failover to replica within RTO.',
    hypothesis: 'API error rate stays below 1% during failover; full recovery in < 5 s', duration: '5 min',
    status: 'completed', lastRun: '2026-07-30', successRate: 92, mttr: 4200, automated: true,
  },
  {
    id: 'che-002', name: 'Network Partition (EU ↔ US)', category: 'network', severity: 'high',
    target: 'eu-west-1 ↔ us-east-1', description: 'Introduce a 100% packet drop between EU and US availability zones for 3 minutes.',
    hypothesis: 'Requests are routed to regional replicas; no data loss; queue backlog clears within 60 s post-recovery.',
    duration: '3 min', status: 'completed', lastRun: '2026-07-25', successRate: 85, mttr: 68, automated: true,
  },
  {
    id: 'che-003', name: 'API Pod OOM Kill', category: 'resource', severity: 'high',
    target: 'api-server pods (3/6)', description: 'Inject memory pressure to trigger OOM kill on 50% of API pods simultaneously.',
    hypothesis: 'Kubernetes reschedules pods within 30 s; p99 latency spike < 3×; zero 5xx to external clients.',
    duration: '2 min', status: 'running', lastRun: '2026-08-01', successRate: 78, mttr: 28, automated: true,
  },
  {
    id: 'che-004', name: 'Stellar Horizon Latency', category: 'dependency', severity: 'medium',
    target: 'stellar-horizon-client', description: 'Add 2 000 ms artificial latency to all outbound calls to Stellar Horizon.',
    hypothesis: 'Payments queue gracefully; user-facing timeout message shown after 5 s; bridge auto-retries succeed.',
    duration: '10 min', status: 'scheduled', lastRun: '2026-07-20', successRate: 95, mttr: 0, automated: false,
  },
  {
    id: 'che-005', name: 'CPU Saturation (90%)', category: 'resource', severity: 'medium',
    target: 'payment-worker pods', description: 'Stress CPU on payment-worker nodes to 90% for 5 minutes.',
    hypothesis: 'HPA scales out within 60 s; transaction throughput stays above 80% of baseline.',
    duration: '5 min', status: 'completed', lastRun: '2026-07-18', successRate: 88, mttr: 55, automated: true,
  },
  {
    id: 'che-006', name: 'Redis Cache Eviction Storm', category: 'data', severity: 'medium',
    target: 'redis-cluster', description: 'Flush all Redis keys to simulate a cold-cache scenario.',
    hypothesis: 'Database handles cold-cache load; p95 latency < 500 ms; no cascading failures.',
    duration: '15 min', status: 'completed', lastRun: '2026-07-15', successRate: 70, mttr: 180, automated: false,
  },
  {
    id: 'che-007', name: 'DNS Resolution Failure', category: 'network', severity: 'high',
    target: 'internal service mesh', description: 'Corrupt DNS responses for internal service discovery for 2 minutes.',
    hypothesis: 'Services fall back to cached DNS entries; retry logic recovers within 30 s.',
    duration: '2 min', status: 'scheduled', lastRun: '—', successRate: 0, mttr: 0, automated: false,
  },
  {
    id: 'che-008', name: 'Disk I/O Throttle', category: 'resource', severity: 'low',
    target: 'postgres-replica-2', description: 'Throttle disk I/O to 10% capacity on a replica node.',
    hypothesis: 'Replica lag stays below 500 ms; zero reads routed to throttled node by load balancer.',
    duration: '10 min', status: 'aborted', lastRun: '2026-07-10', successRate: 60, mttr: 0, automated: false,
  },
];

const RESILIENCE_METRICS: ResilienceMetric[] = [
  { service: 'Payment API',         availability: 99.97, mttr: 42,   mtbf: 720, errorBudget: 72, chaosScore: 88 },
  { service: 'Stellar Bridge',      availability: 99.91, mttr: 68,   mtbf: 480, errorBudget: 41, chaosScore: 76 },
  { service: 'Mobile Money Proxy',  availability: 99.85, mttr: 120,  mtbf: 360, errorBudget: 25, chaosScore: 65 },
  { service: 'Auth Service',        availability: 99.99, mttr: 18,   mtbf: 1440, errorBudget: 95, chaosScore: 94 },
  { service: 'Reconciliation',      availability: 99.80, mttr: 240,  mtbf: 288, errorBudget: 14, chaosScore: 58 },
  { service: 'Webhook Dispatcher',  availability: 99.95, mttr: 35,   mtbf: 600, errorBudget: 83, chaosScore: 82 },
];

const NETWORK_SCENARIOS: NetworkScenario[] = [
  { name: 'Packet loss 30%',    tool: 'tc netem',    params: 'loss 30%',              impact: 'Retries + jitter', mitigated: true },
  { name: 'Latency 500 ms',     tool: 'tc netem',    params: 'delay 500ms 50ms',      impact: 'Timeout triggers', mitigated: true },
  { name: 'Bandwidth cap 1 Mbps', tool: 'tc tbf',   params: 'rate 1mbit',            impact: 'Large payload queuing', mitigated: true },
  { name: 'Full partition',     tool: 'iptables',    params: 'DROP all inter-AZ',     impact: 'Regional failover', mitigated: true },
  { name: 'DNS poisoning',      tool: 'dnschef',     params: 'fake A records',        impact: 'Service discovery fail', mitigated: false },
  { name: 'TLS cert expiry sim', tool: 'mitmproxy', params: 'expired cert injection', impact: 'HTTPS handshake fail', mitigated: false },
];

const RESOURCE_SCENARIOS: ResourceScenario[] = [
  { name: 'CPU spike 95%',     tool: 'stress-ng', params: '--cpu 8 --timeout 300',          effect: 'HPA scale-out',          autoRecovery: true },
  { name: 'Memory fill 90%',   tool: 'stress-ng', params: '--vm 4 --vm-bytes 90%',          effect: 'OOM kill + reschedule',  autoRecovery: true },
  { name: 'Disk I/O 10%',      tool: 'blkio cgroup', params: 'blkio.throttle.read_bps_device 10485760', effect: 'Replica lag spike', autoRecovery: false },
  { name: 'File descriptor exhaustion', tool: 'ulimit', params: '-n 100',                  effect: 'Connection refusal',     autoRecovery: false },
  { name: 'Time skew +5 min',  tool: 'faketime', params: '+300',                            effect: 'JWT / token expiry',     autoRecovery: false },
];

// ── Styles ─────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem 4rem', fontFamily: 'system-ui, -apple-system, sans-serif' },
  h1: { fontSize: '2rem', fontWeight: 700, color: 'var(--ifm-color-primary-darkest, #1a5c32)', margin: '0 0 0.25rem' },
  subtitle: { color: '#64748b', fontSize: '1rem', marginBottom: '2rem' },
  tabs: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem', borderBottom: '2px solid #e8ecf0', paddingBottom: '0.5rem' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  cardTitle: { fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' },
  cardValue: { fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #e8ecf0', marginBottom: '1.5rem' },
  th: { textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #e8ecf0', background: '#f8fafc' },
  td: { padding: '0.7rem 1rem', fontSize: '0.87rem', color: '#334155', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' },
  sectionTitle: { fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', margin: '2rem 0 1rem' },
  infoBox: { background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#92400e' },
  progressTrack: { background: '#e8ecf0', borderRadius: 6, height: 8, overflow: 'hidden', flex: 1 },
};

// ── Style factory functions ─────────────────────────────────────────
const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '0.5rem 1.1rem', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
  fontWeight: active ? 700 : 500, fontSize: '0.9rem', transition: 'all 0.15s',
  background: active ? 'var(--ifm-color-primary, #2e8555)' : '#f1f5f9',
  color: active ? '#fff' : '#475569',
});
const badge = (color: string, bg: string): React.CSSProperties => ({ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 10, fontSize: '0.73rem', fontWeight: 700, color, background: bg });
const progressFill = (pct: number, color: string): React.CSSProperties => ({ height: '100%', width: `${pct}%`, background: color, borderRadius: 6 });
const scoreCircle = (score: number): React.CSSProperties => ({
  width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontWeight: 800, fontSize: '0.9rem', flexShrink: 0,
  background: score >= 85 ? '#dcfce7' : score >= 65 ? '#fef3c7' : '#fee2e2',
  color: score >= 85 ? '#166534' : score >= 65 ? '#92400e' : '#991b1b',
  border: `2px solid ${score >= 85 ? '#86efac' : score >= 65 ? '#fcd34d' : '#fca5a5'}`,
});

// ── Helper Badges ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: ExperimentStatus }) {
  const m: Record<ExperimentStatus, { bg: string; fg: string; label: string }> = {
    scheduled:  { bg: '#f1f5f9', fg: '#475569', label: '⏳ Scheduled' },
    running:    { bg: '#dbeafe', fg: '#1e40af', label: '▶ Running' },
    completed:  { bg: '#dcfce7', fg: '#166534', label: '✓ Completed' },
    aborted:    { bg: '#fee2e2', fg: '#991b1b', label: '✕ Aborted' },
  };
  const c = m[status];
  return <span style={badge(c.fg, c.bg)}>{c.label}</span>;
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const m: Record<Severity, { bg: string; fg: string }> = {
    low:      { bg: '#f1f5f9', fg: '#475569' },
    medium:   { bg: '#fef3c7', fg: '#92400e' },
    high:     { bg: '#fee2e2', fg: '#dc2626' },
    critical: { bg: '#fce7f3', fg: '#9d174d' },
  };
  const c = m[severity];
  return <span style={badge(c.fg, c.bg)}>{severity.toUpperCase()}</span>;
}

function CategoryBadge({ cat }: { cat: FailureCategory }) {
  const m: Record<FailureCategory, { bg: string; fg: string; icon: string }> = {
    network:    { bg: '#dbeafe', fg: '#1e40af', icon: '🌐' },
    resource:   { bg: '#ede9fe', fg: '#5b21b6', icon: '💾' },
    process:    { bg: '#fef3c7', fg: '#92400e', icon: '⚙️' },
    dependency: { bg: '#dcfce7', fg: '#166534', icon: '🔗' },
    data:       { bg: '#fce7f3', fg: '#9d174d', icon: '🗄' },
  };
  const c = m[cat];
  return <span style={badge(c.fg, c.bg)}>{c.icon} {cat}</span>;
}

// ── Main Component ─────────────────────────────────────────────────

type Tab = 'overview' | 'experiments' | 'network' | 'resource' | 'resilience' | 'automation';

export default function ChaosEngineering(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('overview');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview',     label: '🔴 Overview' },
    { id: 'experiments',  label: '🧪 Experiments' },
    { id: 'network',      label: '🌐 Network Partitions' },
    { id: 'resource',     label: '💾 Resource Exhaustion' },
    { id: 'resilience',   label: '📊 Resilience Metrics' },
    { id: 'automation',   label: '🤖 Automation' },
  ];

  const completedExps = EXPERIMENTS.filter(e => e.status === 'completed').length;
  const runningExps = EXPERIMENTS.filter(e => e.status === 'running').length;
  const avgSuccessRate = Math.round(
    EXPERIMENTS.filter(e => e.successRate > 0).reduce((a, b) => a + b.successRate, 0) /
    EXPERIMENTS.filter(e => e.successRate > 0).length
  );
  const automatedCount = EXPERIMENTS.filter(e => e.automated).length;

  const filteredExps = useMemo(() => EXPERIMENTS.filter(e => {
    const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
    const matchSt = statusFilter === 'all' || e.status === statusFilter;
    return matchCat && matchSt;
  }), [categoryFilter, statusFilter]);

  return (
    <div style={s.container}>
      <h1 style={s.h1}>💥 Chaos Engineering Tests</h1>
      <p style={s.subtitle}>#283 — Resilience testing via controlled failure injection for the ProxyPay system</p>

      {/* Summary cards */}
      <div style={s.grid4}>
        {[
          { label: 'Total Experiments', value: String(EXPERIMENTS.length) },
          { label: 'Completed',         value: String(completedExps) },
          { label: 'Running',           value: String(runningExps), warn: runningExps > 0 },
          { label: 'Avg Success Rate',  value: `${avgSuccessRate}%` },
          { label: 'Automated',         value: `${automatedCount} / ${EXPERIMENTS.length}` },
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

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div>
          <div style={s.infoBox}>
            ⚠️ Chaos experiments target <strong>staging</strong> by default. Production experiments require a runbook approval and are gated behind the <code>CHAOS_PROD_ENABLED=true</code> env flag.
          </div>
          <p style={s.sectionTitle}>Chaos Mesh / Litmus Setup</p>
          {[
            { title: 'Chaos Mesh (Kubernetes)', desc: 'Installed in the chaos-testing namespace. Provides PodChaos, NetworkChaos, IOChaos, StressChaos CRDs.', code: 'helm install chaos-mesh chaos-mesh/chaos-mesh \\\n  --namespace chaos-testing --create-namespace \\\n  --set chaosDaemon.runtime=containerd' },
            { title: 'LitmusChaos (workflow engine)', desc: 'Orchestrates multi-step chaos workflows with pre/post-conditions and steady-state hypothesis validation.', code: 'kubectl apply -f https://litmuschaos.github.io/litmus/litmus-operator-v3.yaml' },
            { title: 'Observability stack', desc: 'Prometheus scrapes /metrics from each pod. Grafana dashboards show error rate, latency, and saturation during experiments.', code: 'kubectl port-forward svc/grafana 3000:3000 -n monitoring' },
          ].map(item => (
            <div key={item.title} style={{ marginBottom: '1.25rem', borderLeft: '3px solid #ef4444', paddingLeft: '1rem' }}>
              <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{item.title}</strong>
              <p style={{ margin: '0.25rem 0 0.5rem', fontSize: '0.85rem', color: '#475569' }}>{item.desc}</p>
              <pre style={{ background: '#1e293b', color: '#e2e8f0', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.8rem', overflowX: 'auto', margin: 0 }}>{item.code}</pre>
            </div>
          ))}
          <p style={s.sectionTitle}>Chaos Testing Principles</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {[
              { icon: '🎯', title: 'Define steady state', desc: 'Establish measurable baseline: < 0.1% error rate, p99 < 500 ms, throughput > 1000 req/s.' },
              { icon: '🔬', title: 'Form hypothesis', desc: 'Predict system behaviour under each failure mode before injecting chaos.' },
              { icon: '💉', title: 'Inject failure', desc: 'Apply smallest blast radius first. Escalate only after lower-severity scenarios pass.' },
              { icon: '📈', title: 'Observe & measure', desc: 'Capture metrics continuously. Compare against steady-state baseline in real time.' },
              { icon: '🔁', title: 'Automate & repeat', desc: 'Every experiment that passes gets promoted to nightly CI chaos suite.' },
            ].map(p => (
              <div key={p.title} style={{ ...s.card, display: 'flex', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{p.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{p.title}</div>
                  <div style={{ fontSize: '0.82rem', color: '#475569' }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Experiments ── */}
      {tab === 'experiments' && (
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' as const, marginBottom: '1.25rem' }}>
            <select style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.9rem', background: '#fff' }}
              value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {(['network','resource','process','dependency','data'] as FailureCategory[]).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.9rem', background: '#fff' }}
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              {(['scheduled','running','completed','aborted'] as ExperimentStatus[]).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <table style={s.table}>
            <thead>
              <tr>{['ID', 'Experiment', 'Category', 'Severity', 'Target', 'Success Rate', 'MTTR', 'Status', 'Automated'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filteredExps.map(exp => (
                <tr key={exp.id}>
                  <td style={s.td}><code style={{ fontSize: '0.8rem' }}>{exp.id}</code></td>
                  <td style={{ ...s.td, maxWidth: 200 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 2 }}>{exp.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{exp.hypothesis}</div>
                  </td>
                  <td style={s.td}><CategoryBadge cat={exp.category} /></td>
                  <td style={s.td}><SeverityBadge severity={exp.severity} /></td>
                  <td style={s.td}><code style={{ fontSize: '0.8rem' }}>{exp.target}</code></td>
                  <td style={{ ...s.td, minWidth: 120 }}>
                    {exp.successRate > 0 ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={s.progressTrack}><div style={progressFill(exp.successRate, exp.successRate >= 85 ? '#22c55e' : exp.successRate >= 70 ? '#f59e0b' : '#ef4444')} /></div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{exp.successRate}%</span>
                      </div>
                    ) : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>}
                  </td>
                  <td style={s.td}>{exp.mttr > 0 ? `${exp.mttr < 60 ? exp.mttr + 's' : Math.round(exp.mttr / 60) + 'm'}` : '—'}</td>
                  <td style={s.td}><StatusBadge status={exp.status} /></td>
                  <td style={s.td}>{exp.automated ? '✅ Yes' : '🔲 Manual'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Network Partitions ── */}
      {tab === 'network' && (
        <div>
          <div style={s.infoBox}>
            Network chaos is injected using Linux Traffic Control (<code>tc netem</code>) and <code>iptables</code> rules applied via Chaos Mesh <code>NetworkChaos</code> CRDs on target pods.
          </div>
          <table style={s.table}>
            <thead>
              <tr>{['Scenario', 'Tool', 'Parameters', 'Expected Impact', 'Mitigated'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {NETWORK_SCENARIOS.map(sc => (
                <tr key={sc.name}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{sc.name}</td>
                  <td style={s.td}><code style={{ fontSize: '0.8rem' }}>{sc.tool}</code></td>
                  <td style={s.td}><code style={{ fontSize: '0.78rem', background: '#f1f5f9', padding: '0.1rem 0.3rem', borderRadius: 4 }}>{sc.params}</code></td>
                  <td style={s.td}>{sc.impact}</td>
                  <td style={s.td}>{sc.mitigated ? <span style={badge('#166534', '#dcfce7')}>✓ Mitigated</span> : <span style={badge('#991b1b', '#fee2e2')}>⚠ Open</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Resource Exhaustion ── */}
      {tab === 'resource' && (
        <div>
          <div style={s.infoBox}>
            Resource stress tests use <code>stress-ng</code> and cgroup throttling via Chaos Mesh <code>StressChaos</code> and <code>IOChaos</code> CRDs.
          </div>
          <table style={s.table}>
            <thead>
              <tr>{['Scenario', 'Tool', 'Parameters', 'Expected Effect', 'Auto-Recovery'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {RESOURCE_SCENARIOS.map(sc => (
                <tr key={sc.name}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{sc.name}</td>
                  <td style={s.td}><code style={{ fontSize: '0.8rem' }}>{sc.tool}</code></td>
                  <td style={s.td}><code style={{ fontSize: '0.78rem', background: '#f1f5f9', padding: '0.1rem 0.3rem', borderRadius: 4 }}>{sc.params}</code></td>
                  <td style={s.td}>{sc.effect}</td>
                  <td style={s.td}>{sc.autoRecovery ? <span style={badge('#1e40af', '#dbeafe')}>✓ Auto</span> : <span style={badge('#92400e', '#fef3c7')}>Manual</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Resilience Metrics ── */}
      {tab === 'resilience' && (
        <div>
          <table style={s.table}>
            <thead>
              <tr>{['Service', 'Availability', 'MTTR', 'MTBF', 'Error Budget', 'Chaos Score'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {RESILIENCE_METRICS.map(m => (
                <tr key={m.service}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{m.service}</td>
                  <td style={s.td}><span style={{ fontWeight: 700, color: m.availability >= 99.9 ? '#16a34a' : m.availability >= 99.5 ? '#ca8a04' : '#dc2626' }}>{m.availability}%</span></td>
                  <td style={s.td}>{m.mttr < 60 ? `${m.mttr}s` : `${Math.round(m.mttr / 60)}m`}</td>
                  <td style={s.td}>{m.mtbf}h</td>
                  <td style={{ ...s.td, minWidth: 130 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={s.progressTrack}><div style={progressFill(m.errorBudget, m.errorBudget >= 50 ? '#22c55e' : m.errorBudget >= 25 ? '#f59e0b' : '#ef4444')} /></div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{m.errorBudget}%</span>
                    </div>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={scoreCircle(m.chaosScore)}>{m.chaosScore}</div>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{m.chaosScore >= 85 ? 'Resilient' : m.chaosScore >= 65 ? 'Acceptable' : 'Needs Work'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e8ecf0', padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#475569' }}>
            <strong>Chaos Score</strong> is computed from: steady-state validation pass rate × 0.4 + MTTR score × 0.3 + automated coverage × 0.3. Target: ≥ 80 for all services.
          </div>
        </div>
      )}

      {/* ── Automation ── */}
      {tab === 'automation' && (
        <div>
          <div style={{ ...s.infoBox, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
            Chaos experiments that consistently pass are promoted to the nightly CI pipeline via the <code>chaos-scheduler</code> CronJob. Failures block the staging promotion gate.
          </div>
          {[
            {
              title: 'CI/CD Integration (GitHub Actions)',
              desc: 'Chaos tests run in a dedicated job after smoke tests pass. Failures annotate the PR and block merging to main.',
              code: `# .github/workflows/chaos.yml
chaos-tests:
  runs-on: ubuntu-latest
  needs: [smoke-tests]
  steps:
    - uses: chaos-mesh/chaos-mesh-action@v1
      with:
        chaos_mesh_version: v2.5.1
        chaos_manifest: k8s/chaos/nightly-suite.yaml
    - name: Validate steady state
      run: ./scripts/validate-hypothesis.sh`,
            },
            {
              title: 'Nightly Chaos Schedule (CronJob)',
              desc: 'A Kubernetes CronJob triggers the full chaos suite at 02:00 UTC on staging, outside business-hour traffic windows.',
              code: `apiVersion: batch/v1
kind: CronJob
metadata:
  name: chaos-scheduler
  namespace: chaos-testing
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: chaos-runner
            image: proxypay/chaos-runner:latest
            args: ["--suite", "nightly", "--env", "staging"]`,
            },
            {
              title: 'Hypothesis Validation Script',
              desc: 'After each experiment the runner queries Prometheus to assert error rate and latency stayed within SLO bounds.',
              code: `#!/bin/bash
ERROR_RATE=$(promtool query instant \\
  'rate(http_requests_total{status=~"5.."}[1m])' | jq '.data.result[0].value[1]')

if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
  echo "HYPOTHESIS FAILED: error rate $ERROR_RATE > 1%"
  exit 1
fi
echo "Hypothesis validated ✓"`,
            },
          ].map(item => (
            <div key={item.title} style={{ marginBottom: '1.5rem', borderLeft: '3px solid #3b82f6', paddingLeft: '1rem' }}>
              <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{item.title}</strong>
              <p style={{ margin: '0.25rem 0 0.5rem', fontSize: '0.85rem', color: '#475569' }}>{item.desc}</p>
              <pre style={{ background: '#1e293b', color: '#e2e8f0', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.78rem', overflowX: 'auto', margin: 0 }}>{item.code}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
