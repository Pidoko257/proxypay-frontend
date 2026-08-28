import React, { useState, useMemo } from 'react';

// ── Types ──────────────────────────────────────────────────────────

type QGStatus = 'passed' | 'failed' | 'warning';
type IssueSeverity = 'blocker' | 'critical' | 'major' | 'minor' | 'info';
type IssueType = 'bug' | 'vulnerability' | 'code_smell' | 'duplication';
type DebtUnit = 'd' | 'h' | 'min';

interface QualityGate {
  metric: string;
  condition: string;
  actual: string;
  status: QGStatus;
  description: string;
}

interface ComponentMetric {
  component: string;
  language: string;
  lines: number;
  coverage: number;     // %
  duplications: number; // %
  bugs: number;
  vulnerabilities: number;
  codeSmells: number;
  debtHours: number;
  rating: 'A' | 'B' | 'C' | 'D' | 'E';
}

interface QualityIssue {
  id: string;
  component: string;
  line: number;
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  effort: string;
  debt: string;
  assignee: string;
  status: 'open' | 'confirmed' | 'resolved' | 'wontfix';
  createdAt: string;
}

interface TrendPoint {
  date: string;
  coverage: number;
  bugs: number;
  codeSmells: number;
  debt: number; // hours
  duplications: number;
}

interface DebtCategory {
  category: string;
  debtHours: number;
  issueCount: number;
  priority: 'high' | 'medium' | 'low';
}

// ── Mock Data ──────────────────────────────────────────────────────

const QUALITY_GATES: QualityGate[] = [
  { metric: 'Coverage',               condition: '≥ 80%',   actual: '76.4%',  status: 'failed',  description: 'Unit + integration test coverage on new code' },
  { metric: 'Duplicated Lines',       condition: '< 3%',    actual: '2.1%',   status: 'passed',  description: 'Duplicated blocks across the codebase' },
  { metric: 'Maintainability Rating', condition: 'A',       actual: 'A',      status: 'passed',  description: 'Technical debt ratio < 5%' },
  { metric: 'Reliability Rating',     condition: 'A',       actual: 'B',      status: 'failed',  description: 'Bug density; B = at least 1 major bug' },
  { metric: 'Security Rating',        condition: 'A',       actual: 'A',      status: 'passed',  description: 'No blocker/critical vulnerabilities' },
  { metric: 'Security Hotspots',      condition: '100%',    actual: '83%',    status: 'warning', description: 'Reviewed hotspot coverage' },
  { metric: 'Lines to Cover',         condition: '≥ 500',   actual: '642',    status: 'passed',  description: 'New lines covered by tests in this analysis' },
];

const COMPONENTS: ComponentMetric[] = [
  { component: 'payment-service',     language: 'TypeScript', lines: 8420,  coverage: 82,  duplications: 1.2, bugs: 1,  vulnerabilities: 0, codeSmells: 14,  debtHours: 6,  rating: 'B' },
  { component: 'auth-service',        language: 'TypeScript', lines: 3210,  coverage: 91,  duplications: 0.8, bugs: 0,  vulnerabilities: 0, codeSmells: 5,   debtHours: 2,  rating: 'A' },
  { component: 'stellar-bridge',      language: 'TypeScript', lines: 5640,  coverage: 71,  duplications: 2.4, bugs: 2,  vulnerabilities: 1, codeSmells: 22,  debtHours: 18, rating: 'C' },
  { component: 'momo-proxy',          language: 'TypeScript', lines: 4890,  coverage: 68,  duplications: 3.1, bugs: 3,  vulnerabilities: 0, codeSmells: 31,  debtHours: 24, rating: 'C' },
  { component: 'reconciliation',      language: 'TypeScript', lines: 3120,  coverage: 79,  duplications: 1.9, bugs: 0,  vulnerabilities: 0, codeSmells: 9,   debtHours: 4,  rating: 'A' },
  { component: 'webhook-dispatcher',  language: 'TypeScript', lines: 2100,  coverage: 88,  duplications: 0.5, bugs: 0,  vulnerabilities: 0, codeSmells: 4,   debtHours: 1,  rating: 'A' },
  { component: 'api-gateway',         language: 'TypeScript', lines: 1840,  coverage: 74,  duplications: 2.0, bugs: 1,  vulnerabilities: 0, codeSmells: 8,   debtHours: 5,  rating: 'B' },
  { component: 'frontend-portal',     language: 'TypeScript', lines: 15200, coverage: 55,  duplications: 4.2, bugs: 2,  vulnerabilities: 0, codeSmells: 48,  debtHours: 32, rating: 'D' },
];

const ISSUES: QualityIssue[] = [
  { id: 'SQ-001', component: 'stellar-bridge',  line: 247, type: 'vulnerability',  severity: 'critical', message: 'Avoid using eval() with user-controlled input', effort: '30 min', debt: '30min', assignee: 'alice',  status: 'confirmed', createdAt: '2026-07-15' },
  { id: 'SQ-002', component: 'momo-proxy',       line: 89,  type: 'bug',            severity: 'major',    message: 'Unhandled promise rejection in disburse handler', effort: '2h', debt: '2h', assignee: 'bob',    status: 'open',      createdAt: '2026-07-20' },
  { id: 'SQ-003', component: 'momo-proxy',       line: 312, type: 'bug',            severity: 'major',    message: 'Null dereference: provider.config may be undefined', effort: '1h', debt: '1h', assignee: 'bob',    status: 'open',      createdAt: '2026-07-22' },
  { id: 'SQ-004', component: 'frontend-portal',  line: 502, type: 'code_smell',     severity: 'minor',    message: 'Cognitive complexity of 24 exceeds threshold of 15', effort: '45 min', debt: '45min', assignee: 'carol',  status: 'open',      createdAt: '2026-07-18' },
  { id: 'SQ-005', component: 'payment-service',  line: 178, type: 'bug',            severity: 'major',    message: 'Race condition in concurrent balance update', effort: '3h', debt: '3h', assignee: 'alice',  status: 'open',      createdAt: '2026-07-28' },
  { id: 'SQ-006', component: 'stellar-bridge',   line: 91,  type: 'bug',            severity: 'critical', message: 'Insufficient retry backoff may cause thundering herd', effort: '2h', debt: '2h', assignee: 'dave',   status: 'open',      createdAt: '2026-07-30' },
  { id: 'SQ-007', component: 'api-gateway',      line: 55,  type: 'code_smell',     severity: 'minor',    message: 'Function has 12 parameters; refactor to options object', effort: '1h', debt: '1h', assignee: 'carol',  status: 'open',      createdAt: '2026-07-10' },
  { id: 'SQ-008', component: 'frontend-portal',  line: 980, type: 'duplication',    severity: 'info',     message: 'Block of 45 duplicated lines (3 occurrences)', effort: '30 min', debt: '30min', assignee: 'unassigned', status: 'open', createdAt: '2026-07-05' },
];

function generateTrend(): TrendPoint[] {
  const pts: TrendPoint[] = [];
  let cov = 70, bugs = 12, smells = 80, debt = 110, dup = 5;
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    cov    = Math.min(100, cov + (Math.random() * 1 - 0.3));
    bugs   = Math.max(0, bugs + (Math.random() * 1.5 - 0.9));
    smells = Math.max(0, smells - (Math.random() * 2 - 0.5));
    debt   = Math.max(0, debt - (Math.random() * 3 - 0.5));
    dup    = Math.max(0, dup - (Math.random() * 0.2 - 0.05));
    pts.push({ date: d.toISOString().slice(0, 10), coverage: parseFloat(cov.toFixed(1)), bugs: Math.round(bugs), codeSmells: Math.round(smells), debt: Math.round(debt), duplications: parseFloat(dup.toFixed(1)) });
  }
  return pts;
}

const TREND_DATA = generateTrend();

const DEBT_CATEGORIES: DebtCategory[] = [
  { category: 'Duplicated code',       debtHours: 28, issueCount: 18, priority: 'high' },
  { category: 'Unhandled edge cases',  debtHours: 22, issueCount: 11, priority: 'high' },
  { category: 'Complex functions',     debtHours: 18, issueCount: 24, priority: 'medium' },
  { category: 'Missing tests',         debtHours: 15, issueCount: 9,  priority: 'high' },
  { category: 'Deprecated API usage',  debtHours: 8,  issueCount: 6,  priority: 'medium' },
  { category: 'Long parameter lists',  debtHours: 4,  issueCount: 7,  priority: 'low' },
  { category: 'Magic numbers/strings', debtHours: 3,  issueCount: 12, priority: 'low' },
];

// ── Styles ─────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem 4rem', fontFamily: 'system-ui, -apple-system, sans-serif' },
  h1: { fontSize: '2rem', fontWeight: 700, color: 'var(--ifm-color-primary-darkest, #1a5c32)', margin: '0 0 0.25rem' },
  subtitle: { color: '#64748b', fontSize: '1rem', marginBottom: '2rem' },
  tabs: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem', borderBottom: '2px solid #e8ecf0', paddingBottom: '0.5rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  cardTitle: { fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' },
  cardValue: { fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #e8ecf0', marginBottom: '1.5rem' },
  th: { textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #e8ecf0', background: '#f8fafc' },
  td: { padding: '0.7rem 1rem', fontSize: '0.87rem', color: '#334155', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  sectionTitle: { fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', margin: '2rem 0 1rem' },
  infoBox: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#166534' },
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
const progressFill = (pct: number, color: string): React.CSSProperties => ({ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 6 });
const ratingBubble = (r: string): React.CSSProperties => {
  const m: Record<string, [string, string]> = { A: ['#166534','#dcfce7'], B: ['#1e40af','#dbeafe'], C: ['#92400e','#fef3c7'], D: ['#dc2626','#fee2e2'], E: ['#9d174d','#fce7f3'] };
  const [fg, bg] = m[r] || ['#475569','#f1f5f9'];
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', fontWeight: 800, fontSize: '0.85rem', color: fg, background: bg };
};

// ── Helper badges ──────────────────────────────────────────────────

function QGBadge({ status }: { status: QGStatus }) {
  const m: Record<QGStatus, [string, string, string]> = {
    passed:  ['#166534', '#dcfce7', '✓ Passed'],
    failed:  ['#991b1b', '#fee2e2', '✕ Failed'],
    warning: ['#92400e', '#fef3c7', '⚠ Warning'],
  };
  const [fg, bg, label] = m[status];
  return <span style={s.badge(fg, bg)}>{label}</span>;
}

function SevBadge({ severity }: { severity: IssueSeverity }) {
  const m: Record<IssueSeverity, [string, string]> = {
    blocker:  ['#9d174d', '#fce7f3'],
    critical: ['#991b1b', '#fee2e2'],
    major:    ['#92400e', '#fef3c7'],
    minor:    ['#1e40af', '#dbeafe'],
    info:     ['#475569', '#f1f5f9'],
  };
  const [fg, bg] = m[severity];
  return <span style={s.badge(fg, bg)}>{severity}</span>;
}

function TypeBadge({ type }: { type: IssueType }) {
  const m: Record<IssueType, [string, string, string]> = {
    bug:           ['#991b1b', '#fee2e2', '🐛 Bug'],
    vulnerability: ['#9d174d', '#fce7f3', '🔒 Vuln'],
    code_smell:    ['#92400e', '#fef3c7', '🧹 Smell'],
    duplication:   ['#1e40af', '#dbeafe', '📋 Dup'],
  };
  const [fg, bg, label] = m[type];
  return <span style={s.badge(fg, bg)}>{label}</span>;
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={s.progressTrack}><div style={s.progressFill(pct, color)} /></div>
      <span style={{ fontSize: '0.78rem', fontWeight: 600, minWidth: 38 }}>{pct}%</span>
    </div>
  );
}

// ── Trend Chart ────────────────────────────────────────────────────

function TrendChart({ data }: { data: TrendPoint[] }) {
  if (!data.length) return null;
  const W = 1000, H = 200;
  const pad = { top: 20, right: 20, bottom: 28, left: 44 };
  const pW = W - pad.left - pad.right;
  const pH = H - pad.top - pad.bottom;

  const covMax = 100;
  const smellMax = Math.max(...data.map(d => d.codeSmells), 10);

  const scX = (i: number) => pad.left + (i / (data.length - 1)) * pW;
  const scYCov = (v: number) => pad.top + pH - (v / covMax) * pH;
  const scYSmell = (v: number) => pad.top + pH - (v / smellMax) * pH;

  const linePath = (vals: number[], scY: (v: number) => number) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${scX(i)},${scY(v)}`).join('');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {[0, 25, 50, 75, 100].map(v => {
        const y = scYCov(v);
        return (
          <g key={v}>
            <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="#f1f5f9" strokeWidth={1} />
            <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{v}%</text>
          </g>
        );
      })}
      <path d={linePath(data.map(d => d.coverage), scYCov)} fill="none" stroke="#22c55e" strokeWidth={2} />
      <path d={linePath(data.map(d => (d.codeSmells / smellMax) * 100), scYCov)} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4,2" />
      {data.map((d, i) => (
        <text key={i} x={scX(i)} y={H - 6} textAnchor="middle" fontSize={8} fill="#94a3b8" opacity={i % 7 === 0 ? 1 : 0}>{d.date.slice(5)}</text>
      ))}
      {/* Legend dots */}
      <circle cx={pad.left} cy={pad.top - 8} r={4} fill="#22c55e" />
      <text x={pad.left + 8} y={pad.top - 4} fontSize={10} fill="#22c55e" fontWeight={600}>Coverage</text>
      <circle cx={pad.left + 90} cy={pad.top - 8} r={4} fill="#f59e0b" />
      <text x={pad.left + 98} y={pad.top - 4} fontSize={10} fill="#f59e0b" fontWeight={600}>Code Smells (scaled)</text>
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────

type Tab = 'overview' | 'gates' | 'components' | 'issues' | 'debt' | 'trends';

export default function CodeQualityMetrics(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('overview');
  const [issueType, setIssueType] = useState<string>('all');
  const [issueSev, setIssueSev] = useState<string>('all');

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview',    label: '📊 Overview' },
    { id: 'gates',       label: '🚦 Quality Gates' },
    { id: 'components',  label: '📦 Components' },
    { id: 'issues',      label: '🐛 Issues' },
    { id: 'debt',        label: '💳 Tech Debt' },
    { id: 'trends',      label: '📈 Trends' },
  ];

  const totalBugs = COMPONENTS.reduce((a, b) => a + b.bugs, 0);
  const totalVulns = COMPONENTS.reduce((a, b) => a + b.vulnerabilities, 0);
  const totalDebt = COMPONENTS.reduce((a, b) => a + b.debtHours, 0);
  const avgCoverage = Math.round(
    COMPONENTS.reduce((a, b) => a + b.coverage, 0) / COMPONENTS.length
  );
  const gatesPassed = QUALITY_GATES.filter(g => g.status === 'passed').length;
  const overallStatus: QGStatus = QUALITY_GATES.some(g => g.status === 'failed')
    ? 'failed' : QUALITY_GATES.some(g => g.status === 'warning') ? 'warning' : 'passed';

  const filteredIssues = useMemo(() => ISSUES.filter(i => {
    const matchType = issueType === 'all' || i.type === issueType;
    const matchSev  = issueSev  === 'all' || i.severity === issueSev;
    return matchType && matchSev;
  }), [issueType, issueSev]);

  return (
    <div style={s.container}>
      <h1 style={s.h1}>🔬 Code Quality Metrics</h1>
      <p style={s.subtitle}>#284 — SonarQube-style quality gates, issue tracking, tech debt and trend reports</p>

      {/* Summary cards */}
      <div style={s.grid}>
        {[
          { label: 'Quality Gate',   value: overallStatus === 'passed' ? '✓ Passed' : overallStatus === 'failed' ? '✕ Failed' : '⚠ Warning', color: overallStatus === 'passed' ? '#16a34a' : overallStatus === 'failed' ? '#dc2626' : '#ca8a04' },
          { label: 'Avg Coverage',   value: `${avgCoverage}%`,    color: avgCoverage >= 80 ? '#16a34a' : avgCoverage >= 70 ? '#ca8a04' : '#dc2626' },
          { label: 'Total Bugs',     value: String(totalBugs),    color: totalBugs === 0 ? '#16a34a' : '#dc2626' },
          { label: 'Vulnerabilities',value: String(totalVulns),   color: totalVulns === 0 ? '#16a34a' : '#9d174d' },
          { label: 'Tech Debt',      value: `${totalDebt}h`,      color: '#f59e0b' },
          { label: 'Gates Passed',   value: `${gatesPassed}/${QUALITY_GATES.length}`, color: gatesPassed === QUALITY_GATES.length ? '#16a34a' : '#dc2626' },
        ].map(c => (
          <div key={c.label} style={s.card}>
            <div style={s.cardTitle}>{c.label}</div>
            <div style={{ ...s.cardValue, color: c.color, fontSize: '1.5rem' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map(t => (
          <button key={t.id} style={s.tab(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div>
          <div style={s.infoBox}>
            Metrics are collected by SonarQube (self-hosted) on every pull request and main-branch push. Quality Gate failures block merging via a GitHub status check.
          </div>
          {[
            {
              title: 'SonarQube Integration (CI)',
              desc: 'The sonar-scanner runs as a GitHub Actions step after tests pass. Results are posted back to the PR as a status check.',
              code: `# .github/workflows/quality.yml
sonar:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with: { fetch-depth: 0 }
    - name: SonarQube Scan
      uses: SonarSource/sonarqube-scan-action@v2
      env:
        SONAR_TOKEN: \${{ secrets.SONAR_TOKEN }}
        SONAR_HOST_URL: \${{ secrets.SONAR_HOST_URL }}`,
            },
            {
              title: 'sonar-project.properties',
              desc: 'Project configuration defines sources, test paths, coverage report location, and quality gate binding.',
              code: `sonar.projectKey=proxypay
sonar.projectName=ProxyPay
sonar.sources=src
sonar.tests=src/__tests__
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.qualitygate.wait=true
sonar.coverage.exclusions=**/*.config.ts,**/mock*`,
            },
          ].map(item => (
            <div key={item.title} style={{ marginBottom: '1.25rem', borderLeft: '3px solid var(--ifm-color-primary, #2e8555)', paddingLeft: '1rem' }}>
              <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{item.title}</strong>
              <p style={{ margin: '0.25rem 0 0.5rem', fontSize: '0.85rem', color: '#475569' }}>{item.desc}</p>
              <pre style={{ background: '#1e293b', color: '#e2e8f0', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.78rem', overflowX: 'auto', margin: 0 }}>{item.code}</pre>
            </div>
          ))}
          <p style={s.sectionTitle}>Quality Improvement Targets</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {[
              { metric: 'Coverage',        current: `${avgCoverage}%`, target: '80%',  by: 'Q3 2026', ok: avgCoverage >= 80 },
              { metric: 'Bugs',            current: String(totalBugs),  target: '0',    by: 'Q3 2026', ok: totalBugs === 0 },
              { metric: 'Vulnerabilities', current: String(totalVulns), target: '0',    by: 'Q3 2026', ok: totalVulns === 0 },
              { metric: 'Tech Debt',       current: `${totalDebt}h`,    target: '< 40h', by: 'Q4 2026', ok: totalDebt < 40 },
            ].map(t => (
              <div key={t.metric} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={s.cardTitle}>{t.metric}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: t.ok ? '#16a34a' : '#dc2626' }}>{t.current}</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Target: {t.target} by {t.by}</div>
                </div>
                <span style={{ fontSize: '1.5rem' }}>{t.ok ? '✅' : '❌'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quality Gates ── */}
      {tab === 'gates' && (
        <div>
          <div style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', borderRadius: 12, border: `2px solid ${overallStatus === 'passed' ? '#86efac' : overallStatus === 'failed' ? '#fca5a5' : '#fcd34d'}`, background: overallStatus === 'passed' ? '#f0fdf4' : overallStatus === 'failed' ? '#fff1f2' : '#fffbeb', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>{overallStatus === 'passed' ? '✅' : overallStatus === 'failed' ? '❌' : '⚠️'}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: overallStatus === 'passed' ? '#166534' : overallStatus === 'failed' ? '#991b1b' : '#92400e' }}>
                Quality Gate: {overallStatus.toUpperCase()}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                {gatesPassed} of {QUALITY_GATES.length} conditions passed
              </div>
            </div>
          </div>
          <table style={s.table}>
            <thead>
              <tr>{['Metric', 'Condition', 'Actual', 'Status', 'Description'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {QUALITY_GATES.map(g => (
                <tr key={g.metric}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{g.metric}</td>
                  <td style={s.td}><code style={{ fontSize: '0.82rem' }}>{g.condition}</code></td>
                  <td style={{ ...s.td, fontWeight: 700, color: g.status === 'passed' ? '#16a34a' : g.status === 'failed' ? '#dc2626' : '#ca8a04' }}>{g.actual}</td>
                  <td style={s.td}><QGBadge status={g.status} /></td>
                  <td style={{ ...s.td, color: '#64748b', fontSize: '0.83rem' }}>{g.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Components ── */}
      {tab === 'components' && (
        <table style={s.table}>
          <thead>
            <tr>{['Component', 'Lang', 'Lines', 'Coverage', 'Duplications', 'Bugs', 'Vulns', 'Smells', 'Debt', 'Rating'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {COMPONENTS.map(c => (
              <tr key={c.component}>
                <td style={{ ...s.td, fontWeight: 600 }}><code style={{ fontSize: '0.82rem' }}>{c.component}</code></td>
                <td style={s.td}><span style={s.badge('#1e40af', '#dbeafe')}>{c.language}</span></td>
                <td style={s.td}>{c.lines.toLocaleString()}</td>
                <td style={{ ...s.td, minWidth: 120 }}><MiniBar pct={c.coverage} color={c.coverage >= 80 ? '#22c55e' : c.coverage >= 70 ? '#f59e0b' : '#ef4444'} /></td>
                <td style={{ ...s.td, minWidth: 120 }}><MiniBar pct={c.duplications} color={c.duplications < 3 ? '#22c55e' : '#f59e0b'} /></td>
                <td style={{ ...s.td, fontWeight: 700, color: c.bugs > 0 ? '#dc2626' : '#16a34a' }}>{c.bugs}</td>
                <td style={{ ...s.td, fontWeight: 700, color: c.vulnerabilities > 0 ? '#9d174d' : '#16a34a' }}>{c.vulnerabilities}</td>
                <td style={{ ...s.td, color: c.codeSmells > 20 ? '#ca8a04' : '#334155' }}>{c.codeSmells}</td>
                <td style={s.td}>{c.debtHours}h</td>
                <td style={s.td}><span style={s.ratingBubble(c.rating)}>{c.rating}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Issues ── */}
      {tab === 'issues' && (
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' as const, marginBottom: '1.25rem' }}>
            <select style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.9rem', background: '#fff' }}
              value={issueType} onChange={e => setIssueType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="bug">🐛 Bug</option>
              <option value="vulnerability">🔒 Vulnerability</option>
              <option value="code_smell">🧹 Code Smell</option>
              <option value="duplication">📋 Duplication</option>
            </select>
            <select style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.9rem', background: '#fff' }}
              value={issueSev} onChange={e => setIssueSev(e.target.value)}>
              <option value="all">All Severities</option>
              <option value="blocker">Blocker</option>
              <option value="critical">Critical</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
              <option value="info">Info</option>
            </select>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#64748b' }}>
              {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''}
            </span>
          </div>
          <table style={s.table}>
            <thead>
              <tr>{['ID', 'Component', 'Type', 'Severity', 'Message', 'Effort', 'Assignee', 'Status', 'Created'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filteredIssues.map(issue => (
                <tr key={issue.id}>
                  <td style={s.td}><code style={{ fontSize: '0.78rem' }}>{issue.id}</code></td>
                  <td style={s.td}><code style={{ fontSize: '0.78rem' }}>{issue.component}:{issue.line}</code></td>
                  <td style={s.td}><TypeBadge type={issue.type} /></td>
                  <td style={s.td}><SevBadge severity={issue.severity} /></td>
                  <td style={{ ...s.td, maxWidth: 240, fontSize: '0.83rem' }}>{issue.message}</td>
                  <td style={s.td}>{issue.effort}</td>
                  <td style={s.td}><code style={{ fontSize: '0.78rem' }}>{issue.assignee}</code></td>
                  <td style={s.td}>
                    {issue.status === 'open'      && <span style={s.badge('#dc2626', '#fee2e2')}>Open</span>}
                    {issue.status === 'confirmed' && <span style={s.badge('#92400e', '#fef3c7')}>Confirmed</span>}
                    {issue.status === 'resolved'  && <span style={s.badge('#166534', '#dcfce7')}>Resolved</span>}
                    {issue.status === 'wontfix'   && <span style={s.badge('#475569', '#f1f5f9')}>Won\'t Fix</span>}
                  </td>
                  <td style={{ ...s.td, fontSize: '0.8rem', color: '#94a3b8' }}>{issue.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tech Debt ── */}
      {tab === 'debt' && (
        <div>
          <div style={s.infoBox}>
            Total technical debt: <strong>{totalDebt} hours</strong> ({Math.round(totalDebt / 8)} days). Principal contributors: frontend-portal (32 h), momo-proxy (24 h), stellar-bridge (18 h).
          </div>
          <table style={s.table}>
            <thead>
              <tr>{['Category', 'Debt', 'Issues', 'Priority', 'Debt Bar'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {DEBT_CATEGORIES.map(d => {
                const pct = Math.round((d.debtHours / totalDebt) * 100);
                const priorityColor = d.priority === 'high' ? '#ef4444' : d.priority === 'medium' ? '#f59e0b' : '#94a3b8';
                return (
                  <tr key={d.category}>
                    <td style={{ ...s.td, fontWeight: 600 }}>{d.category}</td>
                    <td style={s.td}><strong>{d.debtHours}h</strong></td>
                    <td style={s.td}>{d.issueCount}</td>
                    <td style={s.td}><span style={s.badge(priorityColor, priorityColor + '20')}>{d.priority}</span></td>
                    <td style={{ ...s.td, minWidth: 160 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={s.progressTrack}><div style={s.progressFill(pct, priorityColor)} /></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: 32 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', padding: '1.25rem', marginTop: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem', color: '#1e293b' }}>Debt Reduction Plan</div>
            {[
              { sprint: 'Sprint 1 (Aug)', action: 'Fix all critical/blocker issues in stellar-bridge and momo-proxy', target: '−22h', color: '#ef4444' },
              { sprint: 'Sprint 2 (Sep)', action: 'Increase frontend-portal coverage to 70%; extract duplicated blocks', target: '−18h', color: '#f59e0b' },
              { sprint: 'Sprint 3 (Oct)', action: 'Refactor complex functions, add missing tests, enforce lint rules in CI', target: '−12h', color: '#22c55e' },
            ].map(row => (
              <div key={row.sprint} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ background: row.color + '20', color: row.color, fontWeight: 700, fontSize: '0.78rem', padding: '0.2rem 0.5rem', borderRadius: 6, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>{row.sprint}</span>
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>{row.action}</span>
                <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '0.85rem', whiteSpace: 'nowrap' as const, marginLeft: 'auto', flexShrink: 0 }}>{row.target}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Trends ── */}
      {tab === 'trends' && (
        <div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b', marginBottom: '1rem' }}>30-Day Quality Trend</div>
            <TrendChart data={TREND_DATA} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Coverage (latest)',   value: `${TREND_DATA[TREND_DATA.length - 1].coverage}%`, delta: `+${(TREND_DATA[TREND_DATA.length - 1].coverage - TREND_DATA[0].coverage).toFixed(1)}%`, positive: true },
              { label: 'Bugs (latest)',        value: String(TREND_DATA[TREND_DATA.length - 1].bugs), delta: `${TREND_DATA[TREND_DATA.length - 1].bugs - TREND_DATA[0].bugs > 0 ? '+' : ''}${TREND_DATA[TREND_DATA.length - 1].bugs - TREND_DATA[0].bugs}`, positive: TREND_DATA[TREND_DATA.length - 1].bugs <= TREND_DATA[0].bugs },
              { label: 'Code Smells (latest)', value: String(TREND_DATA[TREND_DATA.length - 1].codeSmells), delta: `${TREND_DATA[TREND_DATA.length - 1].codeSmells - TREND_DATA[0].codeSmells}`, positive: TREND_DATA[TREND_DATA.length - 1].codeSmells < TREND_DATA[0].codeSmells },
              { label: 'Debt (latest)',        value: `${TREND_DATA[TREND_DATA.length - 1].debt}h`, delta: `${TREND_DATA[TREND_DATA.length - 1].debt - TREND_DATA[0].debt}h`, positive: TREND_DATA[TREND_DATA.length - 1].debt < TREND_DATA[0].debt },
            ].map(c => (
              <div key={c.label} style={s.card}>
                <div style={s.cardTitle}>{c.label}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b' }}>{c.value}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: c.positive ? '#16a34a' : '#dc2626', marginTop: 4 }}>
                  {c.positive ? '▲' : '▼'} {c.delta} vs 30d ago
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
