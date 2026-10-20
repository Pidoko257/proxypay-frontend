import React, { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'proxypay_alert_thresholds';
const brand = '#2e8555';

interface ThresholdConfig {
  warning: number;
  critical: number;
}

interface MetricConfig {
  [key: string]: ThresholdConfig;
}

interface ViolationEntry {
  timestamp: string;
  metric: string;
  value: number;
  severity: 'warning' | 'critical';
}

type MetricKey = 'transactionVolume' | 'failureRate' | 'avgResponseTime' | 'successRate';

const METRIC_LABELS: Record<MetricKey, string> = {
  transactionVolume: 'Transaction Volume',
  failureRate: 'Failure Rate (%)',
  avgResponseTime: 'Avg Response Time (ms)',
  successRate: 'Success Rate (%)',
};

const DEFAULT_THRESHOLDS: MetricConfig = {
  transactionVolume: { warning: 500, critical: 1000 },
  failureRate: { warning: 5, critical: 15 },
  avgResponseTime: { warning: 800, critical: 2000 },
  successRate: { warning: 90, critical: 70 },
};

// For successRate, lower is worse; for others, higher is worse
const INVERTED_METRICS = new Set<MetricKey>(['successRate']);

function loadConfig(): MetricConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_THRESHOLDS };
    return { ...DEFAULT_THRESHOLDS, ...(JSON.parse(raw) as MetricConfig) };
  } catch {
    return { ...DEFAULT_THRESHOLDS };
  }
}

function simulateValue(key: MetricKey): number {
  switch (key) {
    case 'transactionVolume':
      return Math.floor(Math.random() * 1200);
    case 'failureRate':
      return Math.round(Math.random() * 20 * 10) / 10;
    case 'avgResponseTime':
      return Math.floor(Math.random() * 2500);
    case 'successRate':
      return Math.round((80 + Math.random() * 20) * 10) / 10;
  }
}

function getSeverity(
  key: MetricKey,
  value: number,
  config: MetricConfig
): 'ok' | 'warning' | 'critical' {
  const cfg = config[key];
  if (!cfg) return 'ok';
  const inverted = INVERTED_METRICS.has(key);
  if (inverted) {
    if (value <= cfg.critical) return 'critical';
    if (value <= cfg.warning) return 'warning';
    return 'ok';
  }
  if (value >= cfg.critical) return 'critical';
  if (value >= cfg.warning) return 'warning';
  return 'ok';
}

const SEVERITY_COLORS: Record<'ok' | 'warning' | 'critical', string> = {
  ok: '#27ae60',
  warning: '#f39c12',
  critical: '#e74c3c',
};

const SEVERITY_BG: Record<'ok' | 'warning' | 'critical', string> = {
  ok: '#eafaf1',
  warning: '#fef9e7',
  critical: '#fdedec',
};

const ALL_METRIC_KEYS = Object.keys(METRIC_LABELS) as MetricKey[];

export default function AlertThresholds(): JSX.Element {
  const [config, setConfig] = useState<MetricConfig>(DEFAULT_THRESHOLDS);
  const [currentValues, setCurrentValues] = useState<Record<MetricKey, number>>({
    transactionVolume: 0,
    failureRate: 0,
    avgResponseTime: 0,
    successRate: 100,
  });
  const [violations, setViolations] = useState<ViolationEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stored = loadConfig();
    setConfig(stored);
    // Initial simulated values
    const initial = {} as Record<MetricKey, number>;
    ALL_METRIC_KEYS.forEach((k) => {
      initial[k] = simulateValue(k);
    });
    setCurrentValues(initial);
  }, []);

  // Poll simulated values every 5 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const next = {} as Record<MetricKey, number>;
      const newViolations: ViolationEntry[] = [];
      ALL_METRIC_KEYS.forEach((k) => {
        const val = simulateValue(k);
        next[k] = val;
        const sev = getSeverity(k, val, config);
        if (sev === 'warning' || sev === 'critical') {
          newViolations.push({
            timestamp: new Date().toLocaleTimeString(),
            metric: METRIC_LABELS[k],
            value: val,
            severity: sev,
          });
        }
      });
      setCurrentValues(next);
      if (newViolations.length > 0) {
        setViolations((prev) => [...newViolations, ...prev].slice(0, 100));
      }
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [config]);

  function handleThresholdChange(
    metric: MetricKey,
    level: 'warning' | 'critical',
    value: string
  ): void {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    setConfig((prev) => ({
      ...prev,
      [metric]: { ...prev[metric], [level]: num },
    }));
  }

  function handleSave(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleReset(): void {
    setConfig({ ...DEFAULT_THRESHOLDS });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_THRESHOLDS));
  }

  function handleClearLog(): void {
    setViolations([]);
  }

  return (
    <>
      <style>{`
        .at-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          max-width: 900px;
          margin: 0 auto;
          padding: 24px 16px;
          color: #1c1e21;
        }
        .at-container h2 { color: ${brand}; margin-bottom: 4px; }
        .at-container p.subtitle { color: #555; margin-top: 0; margin-bottom: 24px; }
        .at-card {
          border: 1px solid #dde1e7;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
          background: #fff;
        }
        .at-card h3 {
          margin-top: 0;
          color: ${brand};
          font-size: 1rem;
          border-bottom: 1px solid #eee;
          padding-bottom: 8px;
          margin-bottom: 16px;
        }
        .at-metric-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 12px;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #f4f6fa;
        }
        .at-metric-row:last-child { border-bottom: none; }
        .at-metric-label { font-weight: 600; font-size: 0.9rem; }
        .at-input-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .at-input-group label {
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #777;
        }
        .at-input-group input {
          padding: 6px 8px;
          border: 1px solid #cdd1d9;
          border-radius: 4px;
          font-size: 0.88rem;
          width: 100%;
          background: #fafbfc;
        }
        .at-input-group input:focus {
          outline: none;
          border-color: ${brand};
        }
        .at-header-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #999;
          margin-bottom: 6px;
          padding: 0 0 6px 0;
          border-bottom: 1px solid #eee;
        }
        .at-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          align-items: center;
          flex-wrap: wrap;
        }
        .at-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: opacity 0.15s;
        }
        .at-btn:hover { opacity: 0.85; }
        .at-btn-primary { background: ${brand}; color: #fff; }
        .at-btn-secondary { background: #f0f4f8; color: #444; border: 1px solid #cdd1d9; }
        .at-btn-danger { background: #fff0f0; color: #c0392b; border: 1px solid #e8a0a0; }
        .at-msg { font-size: 0.85rem; color: ${brand}; font-weight: 500; }

        .at-status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }
        .at-status-card {
          border-radius: 8px;
          padding: 14px 16px;
          border: 1px solid transparent;
        }
        .at-status-card-title {
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 4px;
          opacity: 0.75;
        }
        .at-status-value {
          font-size: 1.6rem;
          font-weight: 800;
          line-height: 1.1;
        }
        .at-status-badge {
          display: inline-block;
          margin-top: 6px;
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #fff;
        }
        .at-pulse {
          font-size: 0.72rem;
          opacity: 0.6;
          margin-top: 4px;
        }

        .at-log-container { overflow-x: auto; }
        .at-log-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }
        .at-log-table th {
          text-align: left;
          padding: 8px 10px;
          background: #f7f9fc;
          color: #555;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 2px solid #eee;
        }
        .at-log-table td {
          padding: 8px 10px;
          border-bottom: 1px solid #f2f4f8;
          vertical-align: middle;
        }
        .at-log-scroll { max-height: 300px; overflow-y: auto; }
        .at-sev-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #fff;
          text-transform: uppercase;
        }
        .at-empty { text-align: center; color: #999; padding: 24px 0; font-size: 0.9rem; }

        @media (max-width: 600px) {
          .at-metric-row { grid-template-columns: 1fr 1fr; }
          .at-metric-row .at-metric-label { grid-column: 1 / -1; }
          .at-header-row { display: none; }
        }
      `}</style>

      <div className="at-container">
        <h2>Alert Thresholds</h2>
        <p className="subtitle">
          Configure warning and critical thresholds for key transaction metrics. Values are
          simulated and refresh every 5 seconds.
        </p>

        {/* Threshold Configuration */}
        <div className="at-card">
          <h3>Threshold Configuration</h3>
          <div className="at-header-row">
            <span>Metric</span>
            <span>⚠ Warning</span>
            <span>🔴 Critical</span>
          </div>
          {ALL_METRIC_KEYS.map((key) => (
            <div key={key} className="at-metric-row">
              <div className="at-metric-label">{METRIC_LABELS[key]}</div>
              <div className="at-input-group">
                <label>Warning</label>
                <input
                  type="number"
                  value={config[key]?.warning ?? ''}
                  onChange={(e) => handleThresholdChange(key, 'warning', e.target.value)}
                />
              </div>
              <div className="at-input-group">
                <label>Critical</label>
                <input
                  type="number"
                  value={config[key]?.critical ?? ''}
                  onChange={(e) => handleThresholdChange(key, 'critical', e.target.value)}
                />
              </div>
            </div>
          ))}
          <div className="at-actions">
            <button className="at-btn at-btn-primary" onClick={handleSave}>
              💾 Save Thresholds
            </button>
            <button className="at-btn at-btn-secondary" onClick={handleReset}>
              ↺ Reset Defaults
            </button>
            {saved && <span className="at-msg">Thresholds saved!</span>}
          </div>
        </div>

        {/* Live Status Panel */}
        <div className="at-card">
          <h3>Live Alert Status (refreshes every 5s)</h3>
          <div className="at-status-grid">
            {ALL_METRIC_KEYS.map((key) => {
              const value = currentValues[key];
              const sev = getSeverity(key, value, config);
              return (
                <div
                  key={key}
                  className="at-status-card"
                  style={{
                    background: SEVERITY_BG[sev],
                    borderColor: SEVERITY_COLORS[sev] + '44',
                  }}
                >
                  <div className="at-status-card-title" style={{ color: SEVERITY_COLORS[sev] }}>
                    {METRIC_LABELS[key]}
                  </div>
                  <div className="at-status-value" style={{ color: SEVERITY_COLORS[sev] }}>
                    {value}
                  </div>
                  <div>
                    <span
                      className="at-status-badge"
                      style={{ background: SEVERITY_COLORS[sev] }}
                    >
                      {sev === 'ok' ? '✓ OK' : sev === 'warning' ? '⚠ Warning' : '✕ Critical'}
                    </span>
                  </div>
                  <div className="at-pulse">
                    {sev !== 'ok'
                      ? `Threshold: ${sev === 'warning' ? config[key]?.warning : config[key]?.critical}`
                      : 'Within normal range'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Violations Log */}
        <div className="at-card">
          <h3>Violations Log ({violations.length})</h3>
          {violations.length === 0 ? (
            <div className="at-empty">No violations recorded yet. Violations appear when simulated values exceed thresholds.</div>
          ) : (
            <>
              <div className="at-log-scroll">
                <div className="at-log-container">
                  <table className="at-log-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Metric</th>
                        <th>Value</th>
                        <th>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {violations.map((v, i) => (
                        <tr key={i}>
                          <td>{v.timestamp}</td>
                          <td>{v.metric}</td>
                          <td style={{ fontWeight: 700 }}>{v.value}</td>
                          <td>
                            <span
                              className="at-sev-badge"
                              style={{
                                background: v.severity === 'critical' ? '#e74c3c' : '#f39c12',
                              }}
                            >
                              {v.severity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="at-actions">
                <button className="at-btn at-btn-danger" onClick={handleClearLog}>
                  🗑 Clear Log
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
