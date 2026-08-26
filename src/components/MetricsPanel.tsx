import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface EndpointMetric {
  id: string;
  path: string;
  method: string;
  name: string;
  callsPerDay: number;
  trend: number; // percentage change
  badge: 'trending' | 'popular' | 'niche';
  commonlyUsedWith: string[];
  category: string;
  addedDate: string;
}

interface FavoriteData {
  endpointId: string;
  timestamp: number;
}

const METRICS_KEY = 'proxypay-metrics-data';
const FAVORITES_KEY = 'proxypay-favorites';

// Simulated initial metrics data
function getDefaultMetrics(): EndpointMetric[] {
  return [
    {
      id: 'auth-login',
      path: '/api/v1/auth/login',
      method: 'POST',
      name: 'User Login',
      callsPerDay: 15420,
      trend: 12.5,
      badge: 'popular',
      commonlyUsedWith: ['/api/v1/auth/refresh', '/api/v1/users/me'],
      category: 'Authentication',
      addedDate: '2026-03-15',
    },
    {
      id: 'auth-refresh',
      path: '/api/v1/auth/refresh',
      method: 'POST',
      name: 'Refresh Token',
      callsPerDay: 8920,
      trend: 5.3,
      badge: 'popular',
      commonlyUsedWith: ['/api/v1/auth/login'],
      category: 'Authentication',
      addedDate: '2026-03-15',
    },
    {
      id: 'users-me',
      path: '/api/v1/users/me',
      method: 'GET',
      name: 'Get Current User',
      callsPerDay: 22100,
      trend: 18.2,
      badge: 'popular',
      commonlyUsedWith: ['/api/v1/auth/login', '/api/v1/users/me/profile'],
      category: 'Users',
      addedDate: '2026-02-01',
    },
    {
      id: 'users-list',
      path: '/api/v1/users',
      method: 'GET',
      name: 'List Users',
      callsPerDay: 8900,
      trend: -2.1,
      badge: 'popular',
      commonlyUsedWith: ['/api/v1/users/:id'],
      category: 'Users',
      addedDate: '2026-01-20',
    },
    {
      id: 'payments-create',
      path: '/api/v1/payments',
      method: 'POST',
      name: 'Create Payment',
      callsPerDay: 18500,
      trend: 24.8,
      badge: 'trending',
      commonlyUsedWith: ['/api/v1/payments/status', '/api/v1/wallets/balance'],
      category: 'Payments',
      addedDate: '2026-06-01',
    },
    {
      id: 'payments-status',
      path: '/api/v1/payments/status',
      method: 'GET',
      name: 'Payment Status',
      callsPerDay: 16200,
      trend: 20.1,
      badge: 'trending',
      commonlyUsedWith: ['/api/v1/payments'],
      category: 'Payments',
      addedDate: '2026-06-01',
    },
    {
      id: 'wallets-balance',
      path: '/api/v1/wallets/balance',
      method: 'GET',
      name: 'Wallet Balance',
      callsPerDay: 11300,
      trend: 8.4,
      badge: 'popular',
      commonlyUsedWith: ['/api/v1/payments', '/api/v1/wallets/transactions'],
      category: 'Wallets',
      addedDate: '2026-04-10',
    },
    {
      id: 'wallets-tx',
      path: '/api/v1/wallets/transactions',
      method: 'GET',
      name: 'Transaction History',
      callsPerDay: 7600,
      trend: 4.2,
      badge: 'popular',
      commonlyUsedWith: ['/api/v1/wallets/balance'],
      category: 'Wallets',
      addedDate: '2026-04-10',
    },
    {
      id: 'stellar-bridge',
      path: '/api/v1/stellar/bridge',
      method: 'POST',
      name: 'Stellar Bridge',
      callsPerDay: 3200,
      trend: 45.6,
      badge: 'trending',
      commonlyUsedWith: ['/api/v1/wallets/balance', '/api/v1/payments'],
      category: 'Stellar',
      addedDate: '2026-07-01',
    },
    {
      id: 'webhooks-config',
      path: '/api/v1/webhooks',
      method: 'POST',
      name: 'Configure Webhook',
      callsPerDay: 1800,
      trend: 3.1,
      badge: 'niche',
      commonlyUsedWith: ['/api/v1/webhooks/logs'],
      category: 'Webhooks',
      addedDate: '2026-05-15',
    },
    {
      id: 'webhooks-logs',
      path: '/api/v1/webhooks/logs',
      method: 'GET',
      name: 'Webhook Logs',
      callsPerDay: 1500,
      trend: 1.2,
      badge: 'niche',
      commonlyUsedWith: ['/api/v1/webhooks'],
      category: 'Webhooks',
      addedDate: '2026-05-15',
    },
    {
      id: 'reports-daily',
      path: '/api/v1/reports/daily',
      method: 'GET',
      name: 'Daily Report',
      callsPerDay: 4200,
      trend: 15.7,
      badge: 'popular',
      commonlyUsedWith: ['/api/v1/reports/summary', '/api/v1/payments'],
      category: 'Reports',
      addedDate: '2026-03-01',
    },
  ];
}

function loadMetrics(): EndpointMetric[] {
  try {
    const raw = localStorage.getItem(METRICS_KEY);
    return raw ? JSON.parse(raw) : getDefaultMetrics();
  } catch {
    return getDefaultMetrics();
  }
}

function saveMetrics(metrics: EndpointMetric[]): void {
  localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
}

function loadFavorites(): FavoriteData[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites: FavoriteData[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function formatCallsPerDay(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function getBadgeConfig(badge: string) {
  switch (badge) {
    case 'trending':
      return { icon: '🚀', label: 'Trending', className: 'metrics-badge-trending', color: '#e6a700' };
    case 'popular':
      return { icon: '⭐', label: 'Popular', className: 'metrics-badge-popular', color: '#2e8555' };
    case 'niche':
      return { icon: '🌿', label: 'Niche', className: 'metrics-badge-niche', color: '#6b7280' };
    default:
      return { icon: '📌', label: badge, className: '', color: '#6b7280' };
  }
}

interface CompareRange {
  start: string;
  end: string;
}

function daysBetween(start: string, end: string): number {
  const d1 = new Date(start);
  const d2 = new Date(end);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

function seededValue(seed: string, base: number, variance: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const normalized = (hash % 1000) / 1000;
  return Math.round(base + (normalized * 2 - 1) * variance);
}

function generateMetricsForRange(base: EndpointMetric[], range: CompareRange): EndpointMetric[] {
  const span = daysBetween(range.start, range.end);
  const seedA = range.start + range.end;
  return base.map((m) => {
    const offset = seededValue(m.id + seedA, 0, 500);
    const callsBase = m.callsPerDay * span;
    const calls = callsBase + offset;
    const callsPerDay = Math.max(0, Math.round(calls / span));
    return {
      ...m,
      callsPerDay,
       trend: parseFloat((m.trend + seededValue(m.id + seedA, 0, 3)).toFixed(1)),
     };
   });
}

function computeComparisonDiff(a: EndpointMetric, b: EndpointMetric) {
  const callsDiff = a.callsPerDay - b.callsPerDay;
  const callsPct = b.callsPerDay !== 0 ? (callsDiff / b.callsPerDay) * 100 : 0;
  const trendDiff = a.trend - b.trend;
  return { callsDiff, callsPct, trendDiff };
}

export default function MetricsPanel(): React.JSX.Element {
  const [metrics, setMetrics] = useState<EndpointMetric[]>([]);
  const [favorites, setFavorites] = useState<FavoriteData[]>([]);
  const [sortBy, setSortBy] = useState<'calls' | 'name' | 'trend' | 'recent'>('calls');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterBadge, setFilterBadge] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareRangeA, setCompareRangeA] = useState({ start: '2026-08-01', end: '2026-08-15' });
  const [compareRangeB, setCompareRangeB] = useState({ start: '2026-08-16', end: '2026-08-26' });

  useEffect(() => {
    const saved = loadMetrics();
    // Ensure defaults are seeded if no saved data
    if (saved.length === 0) {
      const defaults = getDefaultMetrics();
      setMetrics(defaults);
      saveMetrics(defaults);
    } else {
      setMetrics(saved);
    }
    setFavorites(loadFavorites());
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(metrics.map((m) => m.category));
    return ['all', ...Array.from(cats)];
  }, [metrics]);

  const toggleFavorite = useCallback(
    (endpointId: string) => {
      const exists = favorites.find((f) => f.endpointId === endpointId);
      let updated: FavoriteData[];
      if (exists) {
        updated = favorites.filter((f) => f.endpointId !== endpointId);
        setToast('Removed from favorites');
      } else {
        updated = [...favorites, { endpointId, timestamp: Date.now() }];
        setToast('Added to favorites! ⭐');
      }
      setFavorites(updated);
      saveFavorites(updated);
      setTimeout(() => setToast(''), 1500);
    },
    [favorites]
  );

  const refreshData = useCallback(() => {
    // Simulate refreshing metrics data
    setMetrics((prev) => {
      const updated = prev.map((m) => ({
        ...m,
        callsPerDay: m.callsPerDay + Math.floor(Math.random() * 200 - 100),
        trend: parseFloat((m.trend + (Math.random() * 2 - 1)).toFixed(1)),
      }));
      saveMetrics(updated);
      return updated;
    });
    setToast('Metrics refreshed! 🔄');
    setTimeout(() => setToast(''), 1500);
  }, []);

  const filteredAndSorted = useMemo(() => {
    let filtered = [...metrics];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.path.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
      );
    }
    if (filterCategory !== 'all') {
      filtered = filtered.filter((m) => m.category === filterCategory);
    }
    if (filterBadge !== 'all') {
      filtered = filtered.filter((m) => m.badge === filterBadge);
    }

    switch (sortBy) {
      case 'calls':
        filtered.sort((a, b) => b.callsPerDay - a.callsPerDay);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'trend':
        filtered.sort((a, b) => b.trend - a.trend);
        break;
      case 'recent':
        filtered.sort((a, b) => b.addedDate.localeCompare(a.addedDate));
        break;
    }

    return filtered;
  }, [metrics, searchQuery, filterCategory, filterBadge, sortBy]);

  const compareMetricsA = useMemo(
    () => generateMetricsForRange(getDefaultMetrics(), compareRangeA),
    [compareRangeA]
  );
  const compareMetricsB = useMemo(
    () => generateMetricsForRange(getDefaultMetrics(), compareRangeB),
    [compareRangeB]
  );

  const totalCalls = metrics.reduce((sum, m) => sum + m.callsPerDay, 0);
  const trendingCount = metrics.filter((m) => m.badge === 'trending').length;
  const popularCount = metrics.filter((m) => m.badge === 'popular').length;
  const topEndpoint = metrics.reduce((a, b) => (a.callsPerDay > b.callsPerDay ? a : b), metrics[0]);

  const favoriteEndpointIds = new Set(favorites.map((f) => f.endpointId));

  return (
    <div className="metrics-panel">
      <div className="metrics-header">
        <h2>📊 API Usage Metrics</h2>
        <p className="metrics-subtitle">
          Discover popular endpoints and see how the community uses the API. Data is simulated for demo purposes.
        </p>
      </div>

      {toast && <div className="mock-toast">{toast}</div>}

      {/* Summary Cards */}
      <div className="metrics-summary">
        <div className="metrics-summary-card">
          <span className="metrics-summary-value">{formatCallsPerDay(totalCalls)}</span>
          <span className="metrics-summary-label">Total Calls/Day</span>
        </div>
        <div className="metrics-summary-card metrics-summary-trending">
          <span className="metrics-summary-value">🚀 {trendingCount}</span>
          <span className="metrics-summary-label">Trending</span>
        </div>
        <div className="metrics-summary-card metrics-summary-popular">
          <span className="metrics-summary-value">⭐ {popularCount}</span>
          <span className="metrics-summary-label">Popular</span>
        </div>
        <div className="metrics-summary-card">
          <span className="metrics-summary-value">{formatCallsPerDay(topEndpoint?.callsPerDay || 0)}</span>
          <span className="metrics-summary-label">Top: {topEndpoint?.name || '—'}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="metrics-controls">
        <div className="metrics-filters">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search endpoints..."
            className="mock-input metrics-search"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="mock-select metrics-filter-select"
          >
            <option value="all">All categories</option>
            {categories.filter((c) => c !== 'all').map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filterBadge}
            onChange={(e) => setFilterBadge(e.target.value)}
            className="mock-select metrics-filter-select"
          >
            <option value="all">All badges</option>
            <option value="trending">🚀 Trending</option>
            <option value="popular">⭐ Popular</option>
            <option value="niche">🌿 Niche</option>
          </select>
        </div>
        <div className="metrics-sort">
          <span className="metrics-sort-label">Sort by:</span>
          {([
            { key: 'calls', label: 'Calls/Day' },
            { key: 'trend', label: 'Trend' },
            { key: 'name', label: 'Name' },
            { key: 'recent', label: 'Recently Added' },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              className={`metrics-sort-btn ${sortBy === opt.key ? 'active' : ''}`}
              onClick={() => setSortBy(opt.key)}
            >
              {opt.label}
            </button>
          ))}
           <button className="mock-btn mock-btn-ghost mock-btn-sm" onClick={refreshData} title="Refresh data">
             🔄
           </button>
           <button
             onClick={() => { setCompareMode((v) => !v); setToast(compareMode ? 'Comparison view disabled' : 'Comparison view enabled! 📊'); setTimeout(() => setToast(''), 1500); }}
             className={`mock-btn mock-btn-sm ${compareMode ? 'mock-btn-primary' : 'mock-btn-ghost'}`}
             title="Toggle comparison view"
          >
            {compareMode ? '🔍 Hide Comparison' : '🔍 Compare'}
          </button>
        </div>
      </div>

      {/* Comparison View */}
      {compareMode && (
        <div className="metrics-comparison-view">
          <div className="metrics-comparison-header">
            <h3>📊 Compare Metrics Across Date Ranges</h3>
            <div className="metrics-comparison-ranges">
              <div className="metrics-comparison-range">
                <label>Period A</label>
                <div className="metrics-comparison-dates">
                  <input
                    type="date"
                    value={compareRangeA.start}
                    onChange={(e) => setCompareRangeA((r) => ({ ...r, start: e.target.value }))}
                    className="mock-input mock-input-sm"
                  />
                  <span>–</span>
                  <input
                    type="date"
                    value={compareRangeA.end}
                    onChange={(e) => setCompareRangeA((r) => ({ ...r, end: e.target.value }))}
                    className="mock-input mock-input-sm"
                  />
                </div>
              </div>
              <div className="metrics-comparison-range">
                <label>Period B</label>
                <div className="metrics-comparison-dates">
                  <input
                    type="date"
                    value={compareRangeB.start}
                    onChange={(e) => setCompareRangeB((r) => ({ ...r, start: e.target.value }))}
                    className="mock-input mock-input-sm"
                  />
                  <span>–</span>
                  <input
                    type="date"
                    value={compareRangeB.end}
                    onChange={(e) => setCompareRangeB((r) => ({ ...r, end: e.target.value }))}
                    className="mock-input mock-input-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="metrics-comparison-table-wrapper">
            <table className="metrics-comparison-table">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Period A<br />calls/day</th>
                  <th>Period B<br />calls/day</th>
                  <th>Difference</th>
                  <th>Period A<br />trend</th>
                  <th>Period B<br />trend</th>
                  <th>Trend Δ</th>
                </tr>
              </thead>
              <tbody>
                {(searchQuery
                  ? compareMetricsA.filter((m) =>
                    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    m.path.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  : compareMetricsA
                ).map((mA) => {
                  const mB = compareMetricsB.find((m) => m.id === mA.id) || mA;
                  const diff = computeComparisonDiff(mA, mB);
                  const callsPositive = diff.callsDiff >= 0;
                  const trendPositive = diff.trendDiff >= 0;
                  return (
                    <tr key={mA.id}>
                      <td>
                        <code>{mA.path}</code>
                        <div className="metrics-comparison-name">{mA.name}</div>
                      </td>
                      <td>{formatCallsPerDay(mA.callsPerDay)}</td>
                      <td>{formatCallsPerDay(mB.callsPerDay)}</td>
                      <td className={callsPositive ? 'metrics-diff-positive' : 'metrics-diff-negative'}>
                        {callsPositive ? '▲' : '▼'} {Math.abs(diff.callsDiff)} ({diff.callsPct.toFixed(1)}%)
                      </td>
                      <td>{mA.trend >= 0 ? '📈' : '📉'} {mA.trend}%</td>
                      <td>{mB.trend >= 0 ? '📈' : '📉'} {mB.trend}%</td>
                      <td className={trendPositive ? 'metrics-diff-positive' : 'metrics-diff-negative'}>
                        {trendPositive ? '▲' : '▼'} {Math.abs(diff.trendDiff).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="metrics-comparison-summary">
            <div className="metrics-summary-card">
              <span className="metrics-summary-value">{formatCallsPerDay(compareMetricsA.reduce((s, m) => s + m.callsPerDay, 0))}</span>
              <span className="metrics-summary-label">Period A Total</span>
            </div>
            <div className="metrics-summary-card">
              <span className="metrics-summary-value">{formatCallsPerDay(compareMetricsB.reduce((s, m) => s + m.callsPerDay, 0))}</span>
              <span className="metrics-summary-label">Period B Total</span>
            </div>
            <div className="metrics-summary-card metrics-summary-trending">
              <span className="metrics-summary-value">
                {compareMetricsA.reduce((s, m) => s + m.callsPerDay, 0) - compareMetricsB.reduce((s, m) => s + m.callsPerDay, 0) > 0 ? '📈' : '📉'}
                {Math.abs(compareMetricsA.reduce((s, m) => s + m.callsPerDay, 0) - compareMetricsB.reduce((s, m) => s + m.callsPerDay, 0))}
              </span>
              <span className="metrics-summary-label">Net Difference</span>
            </div>
          </div>
        </div>
      )}

      <div className="metrics-grid">
        {filteredAndSorted.length === 0 ? (
          <div className="mock-empty" style={{ gridColumn: '1 / -1' }}>
            <p>No endpoints match your filters.</p>
          </div>
        ) : (
          filteredAndSorted.map((m) => {
            const badgeConfig = getBadgeConfig(m.badge);
            const isFav = favoriteEndpointIds.has(m.id);
            const trendIcon = m.trend >= 0 ? '📈' : '📉';
            const trendColor = m.trend >= 0 ? 'var(--ifm-color-primary)' : '#dc2626';

            return (
              <div key={m.id} className={`metrics-card ${isFav ? 'metrics-card-favorited' : ''}`}>
                <div className="metrics-card-header">
                  <div className="metrics-card-badges">
                    <span className={`mock-method-badge method-${m.method.toLowerCase()}`}>
                      {m.method}
                    </span>
                    <span
                      className={`metrics-badge ${badgeConfig.className}`}
                      style={{ backgroundColor: badgeConfig.color + '20', color: badgeConfig.color, borderColor: badgeConfig.color }}
                    >
                      {badgeConfig.icon} {badgeConfig.label}
                    </span>
                    {m.trend >= 10 && m.badge !== 'trending' && (
                      <span className="metrics-badge metrics-badge-trending">
                        🔥 Hot
                      </span>
                    )}
                  </div>
                  <button
                    className={`metrics-fav-btn ${isFav ? 'metrics-fav-active' : ''}`}
                    onClick={() => toggleFavorite(m.id)}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFav ? '⭐' : '☆'}
                  </button>
                </div>
                <h3 className="metrics-card-name">{m.name}</h3>
                <code className="metrics-card-path">{m.path}</code>

                <div className="metrics-card-stats">
                  <div className="metrics-stat">
                    <span className="metrics-stat-value">{formatCallsPerDay(m.callsPerDay)}</span>
                    <span className="metrics-stat-label">calls/day</span>
                  </div>
                  <div className="metrics-stat" style={{ color: trendColor }}>
                    <span className="metrics-stat-value">
                      {trendIcon} {Math.abs(m.trend)}%
                    </span>
                    <span className="metrics-stat-label">trend</span>
                  </div>
                  <div className="metrics-stat">
                    <span className="metrics-stat-value">{m.category}</span>
                    <span className="metrics-stat-label">category</span>
                  </div>
                </div>

                {m.commonlyUsedWith.length > 0 && (
                  <div className="metrics-card-paired">
                    <span className="metrics-paired-label">🔗 Commonly used with:</span>
                    <div className="metrics-paired-list">
                      {m.commonlyUsedWith.map((paired) => (
                        <code key={paired} className="metrics-paired-item">{paired}</code>
                      ))}
                    </div>
                  </div>
                )}

                <div className="metrics-card-footer">
                  <span className="metrics-added-date">Added: {m.addedDate}</span>
                  {m.trend >= 20 && (
                    <span className="metrics-trending-tag">🚀 Rising fast!</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <div className="metrics-favorites">
          <h3>⭐ Your Favorites</h3>
          <div className="metrics-favorites-list">
            {favorites.map((fav) => {
              const m = metrics.find((x) => x.id === fav.endpointId);
              if (!m) return null;
              return (
                <div key={fav.endpointId} className="metrics-fav-chip">
                  <span className={`mock-method-badge method-${m.method.toLowerCase()}`}>{m.method}</span>
                  <code>{m.path}</code>
                  <button className="metrics-fav-remove" onClick={() => toggleFavorite(m.id)}>×</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
