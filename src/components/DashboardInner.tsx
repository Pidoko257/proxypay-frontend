import React, { useState } from 'react';
import HelpTooltip from './HelpTooltip';
import QueryTemplateManager from './QueryTemplateManager';
import type { QueryFilters, QueryTemplate } from './QueryTemplateManager';
import { useAlertThresholds } from './AlertThreshold/useAlertThresholds';
import AlertStatusBadge from './AlertThreshold/AlertStatusBadge';
import AlertThresholdSettings from './AlertThreshold/AlertThresholdSettings';
import Link from '@docusaurus/Link';

// ── Mock metric values for demonstration ──────────────────────────────────────
const MOCK_METRICS = {
  errorRate: 7.2,
  avgLatencyMs: 1420,
  txnSuccessRate: 91.5,
  pendingTxns: 38,
};

// ── Filter state type ─────────────────────────────────────────────────────────
interface Filters {
  status: string;
  dateRange: string;
  minAmount: string;
  maxAmount: string;
  currency: string;
}

const DEFAULT_FILTERS: Filters = {
  status: 'all',
  dateRange: '7d',
  minAmount: '',
  maxAmount: '',
  currency: 'USDC',
};

export default function DashboardInner(): React.JSX.Element {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);

  const { level, violations } = useAlertThresholds(MOCK_METRICS);

  function setFilter<K extends keyof Filters>(key: K, value: string): void {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleTemplateLoad(template: QueryTemplate): void {
    const f = template.filters as Partial<Filters>;
    setFilters((prev) => ({ ...prev, ...f }));
  }

  const currentFilters: QueryFilters = {
    status: filters.status,
    dateRange: filters.dateRange,
    minAmount: filters.minAmount,
    maxAmount: filters.maxAmount,
    currency: filters.currency,
  };

  // ── Styles ──────────────────────────────────────────────────────────────────

  const pageStyle: React.CSSProperties = {
    maxWidth: 960,
    margin: '0 auto',
    padding: '2rem 1.5rem',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: '1.5rem',
  };

  const cardStyle: React.CSSProperties = {
    border: '1px solid var(--ifm-color-emphasis-300)',
    borderRadius: 8,
    padding: '1.25rem',
    background: 'var(--ifm-background-surface-color)',
    marginBottom: '1.5rem',
  };

  const metricGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  };

  const metricCardStyle: React.CSSProperties = {
    border: '1px solid var(--ifm-color-emphasis-200)',
    borderRadius: 8,
    padding: '1rem',
    background: 'var(--ifm-background-surface-color)',
    textAlign: 'center',
  };

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 4,
    border: '1px solid var(--ifm-color-emphasis-400)',
    fontSize: 13,
    background: 'var(--ifm-background-color)',
    color: 'var(--ifm-font-color-base)',
    width: '100%',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    marginBottom: 4,
    color: 'var(--ifm-font-color-base)',
  };

  const filterGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '0.75rem',
    marginBottom: '1rem',
  };

  return (
    <div style={pageStyle}>
      {/* ── Page header with alert badge ── */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Transaction Dashboard</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ifm-color-emphasis-600)' }}>
            Real-time metrics and query management for ProxyPay transactions
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* #630 — AlertStatusBadge in header */}
          <AlertStatusBadge level={level} violations={violations} />
          <button
            className="button button--secondary"
            style={{ fontSize: 12 }}
            onClick={() => setShowThresholdSettings((s) => !s)}
          >
            ⚙ Alert Settings
          </button>
          <Link className="button button--secondary" style={{ fontSize: 12 }} to="/compliance">
            📋 Compliance Report
          </Link>
        </div>
      </div>

      {/* #630 — Alert Threshold Settings (toggleable) */}
      {showThresholdSettings && <AlertThresholdSettings />}

      {/* ── Metrics overview ── */}
      <div style={metricGridStyle}>
        {/* #631 — HelpTooltip usage #1: Error Rate metric */}
        <div style={metricCardStyle}>
          <div style={{ fontSize: 12, color: 'var(--ifm-color-emphasis-600)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            Error Rate
            <HelpTooltip
              text="Percentage of transactions that resulted in an error over the selected time window."
              docLink="/api"
            />
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: MOCK_METRICS.errorRate >= 10 ? '#dc2626' : MOCK_METRICS.errorRate >= 5 ? '#d97706' : '#16a34a',
            }}
          >
            {MOCK_METRICS.errorRate}%
          </div>
        </div>

        {/* #631 — HelpTooltip usage #2: Avg Latency */}
        <div style={metricCardStyle}>
          <div style={{ fontSize: 12, color: 'var(--ifm-color-emphasis-600)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            Avg Latency
            <HelpTooltip
              text="Average end-to-end latency of all API calls in milliseconds. Exceeding 3,000 ms triggers a critical alert."
              docLink="/api"
            />
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: MOCK_METRICS.avgLatencyMs >= 3000 ? '#dc2626' : MOCK_METRICS.avgLatencyMs >= 1000 ? '#d97706' : '#16a34a',
            }}
          >
            {MOCK_METRICS.avgLatencyMs} ms
          </div>
        </div>

        {/* #631 — HelpTooltip usage #3: Success Rate */}
        <div style={metricCardStyle}>
          <div style={{ fontSize: 12, color: 'var(--ifm-color-emphasis-600)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            Success Rate
            <HelpTooltip
              text="Percentage of transactions completed successfully. Below 90% is critical; below 95% triggers a warning."
              docLink="/api"
            />
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: MOCK_METRICS.txnSuccessRate < 90 ? '#dc2626' : MOCK_METRICS.txnSuccessRate < 95 ? '#d97706' : '#16a34a',
            }}
          >
            {MOCK_METRICS.txnSuccessRate}%
          </div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ fontSize: 12, color: 'var(--ifm-color-emphasis-600)' }}>Pending Txns</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ifm-font-color-base)' }}>
            {MOCK_METRICS.pendingTxns}
          </div>
        </div>
      </div>

      {/* ── Filter controls ── */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: 15, display: 'flex', alignItems: 'center' }}>
          Transaction Filters
          {/* #631 — HelpTooltip usage #4: filters section */}
          <HelpTooltip
            text="Filter transactions by status, date range, amount, and currency. Save your filter combination as a template for quick reuse."
            docLink="/api"
          />
        </h3>
        <div style={filterGridStyle}>
          <div>
            <label style={labelStyle} htmlFor="filter-status">Status</label>
            <select
              id="filter-status"
              style={inputStyle}
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
            >
              <option value="all">All</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="filter-dateRange">Date Range</label>
            <select
              id="filter-dateRange"
              style={inputStyle}
              value={filters.dateRange}
              onChange={(e) => setFilter('dateRange', e.target.value)}
            >
              <option value="1h">Last 1 hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="filter-minAmount">Min Amount</label>
            <input
              id="filter-minAmount"
              style={inputStyle}
              type="number"
              placeholder="0"
              value={filters.minAmount}
              onChange={(e) => setFilter('minAmount', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="filter-maxAmount">Max Amount</label>
            <input
              id="filter-maxAmount"
              style={inputStyle}
              type="number"
              placeholder="∞"
              value={filters.maxAmount}
              onChange={(e) => setFilter('maxAmount', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="filter-currency">Currency</label>
            <select
              id="filter-currency"
              style={inputStyle}
              value={filters.currency}
              onChange={(e) => setFilter('currency', e.target.value)}
            >
              <option value="USDC">USDC</option>
              <option value="XLM">XLM</option>
              <option value="KES">KES</option>
              <option value="GHS">GHS</option>
              <option value="NGN">NGN</option>
            </select>
          </div>
        </div>
        <button
          className="button button--secondary"
          style={{ fontSize: 12 }}
          onClick={() => setFilters(DEFAULT_FILTERS)}
        >
          Reset Filters
        </button>
      </div>

      {/* #629 — QueryTemplateManager */}
      <QueryTemplateManager
        currentFilters={currentFilters}
        onLoad={handleTemplateLoad}
      />
    </div>
  );
}
