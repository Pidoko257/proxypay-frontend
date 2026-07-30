import React, { useState, useCallback, useRef } from 'react';
import Layout from '@theme/Layout';

interface LogEntry {
  id: number;
  time: number;
  type: 'request' | 'success' | 'limited' | 'retry' | 'backoff';
  message: string;
}

interface Library {
  name: string;
  language: string;
  description: string;
  link: string;
}

const libraries: Library[] = [
  { name: 'bottleneck', language: 'JavaScript', description: 'Rate limiter for Node.js with clustering support', link: 'https://github.com/SGrondin/bottleneck' },
  { name: 'p-limit', language: 'JavaScript', description: 'Run multiple promise-returning functions with limited concurrency', link: 'https://github.com/sindresorhus/p-limit' },
  { name: 'limiter', language: 'Python', description: 'Generic rate limiter with Redis and in-memory backends', link: 'https://github.com/alisaifee/limiter' },
  { name: 'ratelimiter', language: 'Go', description: 'GCRA-based rate limiter by uber-go', link: 'https://github.com/uber-go/ratelimit' },
  { name: 'tokio-rate-limit', language: 'Rust', description: 'Rate limiting for async Rust with Tokio runtime', link: 'https://crates.io/crates/tokio-rate-limit' },
  { name: 'rack-attack', language: 'Ruby', description: 'Rack middleware for blocking & throttling abusive requests', link: 'https://github.com/rack/rack-attack' },
];

export default function RateLimits(): React.JSX.Element {
  const [requestRate, setRequestRate] = useState(10);
  const [concurrency, setConcurrency] = useState(3);
  const [quota, setQuota] = useState(30);
  const [costPerRequest, setCostPerRequest] = useState(0.001);
  const [backoffStrategy, setBackoffStrategy] = useState<'exponential' | 'exponential-jitter'>('exponential-jitter');
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({ sent: 0, succeeded: 0, limited: 0, totalCost: 0, retries: 0 });
  const logIdRef = useRef(0);

  const startSimulation = useCallback(() => {
    setRunning(true);
    setLogs([]);
    setStats({ sent: 0, succeeded: 0, limited: 0, totalCost: 0, retries: 0 });
    logIdRef.current = 0;

    let sent = 0;
    let succeeded = 0;
    let limited = 0;
    let retries = 0;
    let totalCost = 0;
    let current = 0;
    let active = 0;
    const timerIds: ReturnType<typeof setTimeout>[] = [];

    const addLog = (type: LogEntry['type'], message: string) => {
      logIdRef.current++;
      const entry: LogEntry = { id: logIdRef.current, time: Date.now(), type, message };
      setLogs((prev) => [...prev, entry]);
    };

    const backoff = (attempt: number): number => {
      const base = Math.min(60000, Math.pow(2, attempt) * 1000);
      if (backoffStrategy === 'exponential-jitter') {
        return base + Math.random() * base;
      }
      return base;
    };

    const checkDone = () => {
      if (current >= quota * 2 && active === 0) {
        addLog('backoff', 'Simulation complete — all requests processed');
        setStats({ sent, succeeded, limited, totalCost, retries });
        setRunning(false);
      }
    };

    const processRequest = (reqNum: number) => {
      addLog('request', `Request #${reqNum} dispatched`);

      const timer = setTimeout(() => {
        if (reqNum <= quota) {
          succeeded++;
          totalCost += costPerRequest;
          addLog('success', `Request #${reqNum} succeeded (within quota)`);
        } else if (reqNum <= quota + 10) {
          limited++;
          const delay = backoff(1);
          addLog('limited', `Request #${reqNum} rate limited — retrying in ${Math.round(delay / 1000)}s with ${backoffStrategy}`);

          const retryTimer = setTimeout(() => {
            retries++;
            succeeded++;
            totalCost += costPerRequest;
            addLog('retry', `Request #${reqNum} retried and succeeded after backoff`);
            const backoffTime = backoff(2);
            addLog('backoff', `Backoff increased — next retry window: ${Math.round(backoffTime / 1000)}s`);
            active--;
            checkDone();
          }, Math.min(delay, 3000));
          timerIds.push(retryTimer);
        } else {
          limited++;
          const delay = backoff(2);
          addLog('limited', `Request #${reqNum} hard rate limited — retry in ${Math.round(delay / 1000)}s (quota exhausted)`);
          active--;
          checkDone();
          return;
        }
        timerIds.forEach((_, i) => clearTimeout(timerIds[i]));
      }, 400 + Math.random() * 200);
      timerIds.push(timer);
    };

    const interval = setInterval(() => {
      while (active < concurrency && current < quota * 2) {
        current++;
        active++;
        sent++;
        processRequest(current);
      }
      if (current >= quota * 2) {
        clearInterval(interval);
      }
    }, Math.max(100, 1000 / requestRate));

    return () => {
      clearInterval(interval);
      timerIds.forEach((id) => clearTimeout(id));
    };
  }, [requestRate, concurrency, quota, costPerRequest, backoffStrategy]);

  const handleRun = useCallback(() => {
    const cleanup = startSimulation();
    return cleanup;
  }, [startSimulation]);

  const logColors: Record<LogEntry['type'], string> = {
    request: '#3b82f6',
    success: '#22c55e',
    limited: '#f59e0b',
    retry: '#2e8555',
    backoff: '#7c3aed',
  };

  return (
    <Layout title="Rate Limiting Simulator" description="Interactive rate limiting simulator with backoff strategies">
      <main className="rl-page">
        <section className="rl-hero">
          <h1>Rate Limiting Simulator</h1>
          <p>Explore how rate limits, backoff strategies, and retry logic behave under load.</p>
        </section>

        <section className="rl-controls">
          <div className="rl-control-grid">
            <div className="rl-control-card">
              <label htmlFor="requestRate">Request Rate <span className="rl-val">{requestRate} req/s</span></label>
              <input id="requestRate" type="range" min={1} max={50} value={requestRate} onChange={(e) => setRequestRate(+e.target.value)} />
            </div>
            <div className="rl-control-card">
              <label htmlFor="concurrency">Concurrency <span className="rl-val">{concurrency}</span></label>
              <input id="concurrency" type="range" min={1} max={20} value={concurrency} onChange={(e) => setConcurrency(+e.target.value)} />
            </div>
            <div className="rl-control-card">
              <label htmlFor="quota">Quota <span className="rl-val">{quota} requests</span></label>
              <input id="quota" type="range" min={5} max={100} value={quota} onChange={(e) => setQuota(+e.target.value)} />
            </div>
            <div className="rl-control-card">
              <label htmlFor="cost">Per-Request Cost <span className="rl-val">${costPerRequest.toFixed(4)}</span></label>
              <input id="cost" type="range" min={0.0001} max={0.05} step={0.0001} value={costPerRequest} onChange={(e) => setCostPerRequest(+e.target.value)} />
            </div>
          </div>

          <div className="rl-strategy">
            <label>Backoff Strategy:</label>
            <div className="rl-strategy-btns">
              <button className={`rl-btn ${backoffStrategy === 'exponential' ? 'rl-btn-active' : ''}`} onClick={() => setBackoffStrategy('exponential')}>
                Exponential
              </button>
              <button className={`rl-btn ${backoffStrategy === 'exponential-jitter' ? 'rl-btn-active' : ''}`} onClick={() => setBackoffStrategy('exponential-jitter')}>
                Exponential + Jitter
              </button>
            </div>
          </div>

          <button className="rl-run-btn" onClick={handleRun} disabled={running}>
            {running ? 'Simulating...' : '▶ Run Simulation'}
          </button>
        </section>

        {stats.sent > 0 && (
          <section className="rl-stats">
            <div className="rl-stat-card">
              <span className="rl-stat-num">{stats.sent}</span>
              <span className="rl-stat-label">Sent</span>
            </div>
            <div className="rl-stat-card rl-stat-success">
              <span className="rl-stat-num">{stats.succeeded}</span>
              <span className="rl-stat-label">Succeeded</span>
            </div>
            <div className="rl-stat-card rl-stat-warn">
              <span className="rl-stat-num">{stats.limited}</span>
              <span className="rl-stat-label">Limited</span>
            </div>
            <div className="rl-stat-card rl-stat-retry">
              <span className="rl-stat-num">{stats.retries}</span>
              <span className="rl-stat-label">Retries</span>
            </div>
            <div className="rl-stat-card rl-stat-cost">
              <span className="rl-stat-num">${stats.totalCost.toFixed(4)}</span>
              <span className="rl-stat-label">Total Cost</span>
            </div>
          </section>
        )}

        <section className="rl-log">
          <h2>Simulation Log</h2>
          <div className="rl-log-box">
            {logs.map((entry) => (
              <div key={entry.id} className="rl-log-entry" style={{ color: logColors[entry.type] }}>
                <span className="rl-log-dot" style={{ background: logColors[entry.type] }} />
                <span className="rl-log-type">[{entry.type.toUpperCase()}]</span>
                <span className="rl-log-msg">{entry.message}</span>
              </div>
            ))}
            {logs.length === 0 && <p className="rl-log-empty">Run the simulation to see real-time request processing.</p>}
          </div>
        </section>

        <section className="rl-libraries">
          <h2>Recommended Libraries</h2>
          <div className="rl-lib-grid">
            {libraries.map((lib) => (
              <a key={lib.name} href={lib.link} target="_blank" rel="noopener noreferrer" className="rl-lib-card">
                <div className="rl-lib-header">
                  <strong>{lib.name}</strong>
                  <span className="rl-lib-lang">{lib.language}</span>
                </div>
                <p>{lib.description}</p>
              </a>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
