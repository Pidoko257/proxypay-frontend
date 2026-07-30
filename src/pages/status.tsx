import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@theme/Layout';

interface Incident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'minor' | 'major' | 'critical';
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  affectedEndpoints: string[];
  description: string;
  eta: string;
}

interface EndpointStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  latency: number;
}

const mockIncidents: Incident[] = [
  {
    id: 'inc-004', title: 'Payment processing latency', status: 'monitoring',
    severity: 'minor', createdAt: '2026-07-25T14:30:00Z', updatedAt: '2026-07-25T16:00:00Z',
    resolvedAt: null, affectedEndpoints: ['POST /v1/payments', 'GET /v1/payments/:id'],
    description: 'We are observing elevated latency on payment creation and retrieval endpoints. A fix has been deployed and we are monitoring recovery.',
    eta: '~30 minutes',
  },
  {
    id: 'inc-003', title: 'Webhook delivery failures', status: 'resolved',
    severity: 'major', createdAt: '2026-07-23T09:00:00Z', updatedAt: '2026-07-23T11:45:00Z',
    resolvedAt: '2026-07-23T11:45:00Z', affectedEndpoints: ['Webhook deliveries'],
    description: 'Webhook deliveries were failing due to a misconfigured certificate. The certificate has been renewed and all queued webhooks have been replayed.',
    eta: '2 hours 45 minutes',
  },
  {
    id: 'inc-002', title: 'Authentication service outage', status: 'resolved',
    severity: 'critical', createdAt: '2026-07-18T02:15:00Z', updatedAt: '2026-07-18T04:30:00Z',
    resolvedAt: '2026-07-18T04:30:00Z', affectedEndpoints: ['POST /v1/auth/token', 'ALL /v1/*'],
    description: 'The authentication service experienced a complete outage due to database connection pool exhaustion. Connections were recycled and pool limits increased.',
    eta: '2 hours 15 minutes',
  },
];

const endpoints: EndpointStatus[] = [
  { name: 'GET /health', status: 'operational', latency: 12 },
  { name: 'POST /v1/auth/token', status: 'operational', latency: 45 },
  { name: 'POST /v1/payments', status: 'degraded', latency: 320 },
  { name: 'GET /v1/payments/:id', status: 'degraded', latency: 280 },
  { name: 'GET /v1/payments', status: 'operational', latency: 38 },
  { name: 'POST /v1/refunds', status: 'operational', latency: 52 },
  { name: 'GET /v1/webhooks', status: 'operational', latency: 25 },
  { name: 'POST /v1/webhooks', status: 'operational', latency: 30 },
];

const statusColor = (s: string) => s === 'operational' ? 'var(--ifm-color-success)' : s === 'degraded' ? 'var(--ifm-color-warning)' : 'var(--ifm-color-danger)';
const incidentSeverity = (s: string) => s === 'critical' ? '#dc2626' : s === 'major' ? '#f97316' : '#eab308';

export default function Status(): React.JSX.Element {
  const [overallStatus, setOverallStatus] = useState<'operational' | 'degraded' | 'outage'>('operational');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribeMsg, setSubscribeMsg] = useState('');

  const pollStatus = useCallback(() => {
    // Simulate API health check — in production, hit a real status endpoint
    const hasOutage = endpoints.some((e) => e.status === 'outage');
    const hasDegraded = endpoints.some((e) => e.status === 'degraded');
    setOverallStatus(hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational');
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    pollStatus();
    const interval = setInterval(pollStatus, 30000);
    return () => clearInterval(interval);
  }, [pollStatus]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribeMsg(`✓ Subscribed ${email} to status updates.`);
    setSubscribed(true);
    setEmail('');
  };

  return (
    <Layout title="API Status" description="Live API health and incident status">
      <main className="status-page">
        <section className="status-hero">
          <h1>API Status</h1>
          <p>Real-time health monitoring for ProxyPay API services.</p>
        </section>

        <section className="status-overview">
          <div className={`status-indicator status-${overallStatus}`}>
            <div className="status-dot" style={{ background: statusColor(overallStatus) }} />
            <div>
              <span className="status-label">
                {overallStatus === 'operational' ? 'All Systems Operational' : overallStatus === 'degraded' ? 'Partial Degradation' : 'Service Outage'}
              </span>
              <span className="status-updated">Last checked: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          </div>
        </section>

        <section className="status-endpoints">
          <h2>Endpoint Status</h2>
          <div className="status-ep-grid">
            {endpoints.map((ep) => (
              <div key={ep.name} className="status-ep-card">
                <div className="status-ep-left">
                  <span className="status-ep-dot" style={{ background: statusColor(ep.status) }} />
                  <code className="status-ep-name">{ep.name}</code>
                </div>
                <span className="status-ep-latency" style={{ color: ep.latency > 200 ? 'var(--ifm-color-warning)' : 'var(--ifm-color-success)' }}>
                  {ep.latency}ms
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="status-incidents">
          <h2>Incident History</h2>
          {mockIncidents.map((inc) => (
            <div key={inc.id} className={`status-inc-card status-inc-${inc.status}`}>
              <div className="status-inc-header">
                <span className="status-inc-sev" style={{ background: incidentSeverity(inc.severity) }}>
                  {inc.severity.toUpperCase()}
                </span>
                <strong>{inc.title}</strong>
                <span className={`status-inc-badge status-inc-badge-${inc.status}`}>{inc.status}</span>
              </div>
              <p className="status-inc-desc">{inc.description}</p>
              <div className="status-inc-meta">
                <span>🕐 Created: {new Date(inc.createdAt).toLocaleString()}</span>
                {inc.resolvedAt && <span>✅ Resolved: {new Date(inc.resolvedAt).toLocaleString()}</span>}
                {!inc.resolvedAt && <span>⏳ ETA: {inc.eta}</span>}
              </div>
              <div className="status-inc-endpoints">
                <strong>Affected Endpoints:</strong>
                {inc.affectedEndpoints.map((ep) => (
                  <code key={ep} className="status-inc-ep">{ep}</code>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="status-subscribe">
          <h2>Subscribe to Updates</h2>
          <p>Get notified via email when incidents occur or are resolved.</p>
          <form onSubmit={handleSubscribe} className="status-sub-form">
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="status-sub-input"
              required
            />
            <button type="submit" className="status-sub-btn" disabled={subscribed}>
              {subscribed ? 'Subscribed ✓' : 'Subscribe'}
            </button>
          </form>
          {subscribeMsg && <p className="status-sub-msg">{subscribeMsg}</p>}
        </section>
      </main>
    </Layout>
  );
}
