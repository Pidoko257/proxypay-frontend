import React, { useState } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Breadcrumb from '../components/Breadcrumb';

export type AnalyticsStatus = 'ready' | 'no-events' | 'no-permission' | 'request-failure';

interface EmptyStateProps {
  status: AnalyticsStatus;
  onRetry?: () => void;
  onResetFilters?: () => void;
}

/**
 * Explanatory state banner that preserves the chart frame to prevent layout shifts.
 */
export function AnalyticsExplanatoryFrame({ status, onRetry, onResetFilters }: EmptyStateProps): React.JSX.Element {
  return (
    <div
      role="region"
      aria-label="Analytics Status"
      style={{
        border: '1px dashed var(--ifm-color-emphasis-300)',
        borderRadius: 8,
        minHeight: 360,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        background: 'var(--ifm-color-emphasis-50, rgba(0,0,0,0.01))',
      }}
    >
      {status === 'no-events' && (
        <>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>No Analytics Data Found</h3>
          <p style={{ maxWidth: 460, color: 'var(--ifm-color-emphasis-700)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            No transaction or gateway events occurred within the selected time window. Try expanding your date range or generating test traffic in the Sandbox.
          </p>
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 6,
                border: '1px solid var(--ifm-color-primary)',
                background: 'var(--ifm-color-primary)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset Date Filter to 30 Days
            </button>
          )}
        </>
      )}

      {status === 'no-permission' && (
        <>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: 'var(--ifm-color-warning-dark)' }}>
            Analytics Access Restricted
          </h3>
          <p style={{ maxWidth: 460, color: 'var(--ifm-color-emphasis-700)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Your account role does not have authorization to view aggregate organizational metrics. Contact your organization administrator to request analytics viewer permissions.
          </p>
          <a
            href="mailto:support@proxypay.com?subject=Analytics%20Access%20Request"
            style={{
              padding: '0.45rem 1rem',
              borderRadius: 6,
              border: '1px solid var(--ifm-color-emphasis-400)',
              background: 'var(--ifm-background-color)',
              color: 'var(--ifm-font-color-base)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Contact Administrator
          </a>
        </>
      )}

      {status === 'request-failure' && (
        <>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: 'var(--ifm-color-danger)' }}>
            Analytics Gateway Unavailable
          </h3>
          <p style={{ maxWidth: 460, color: 'var(--ifm-color-emphasis-700)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Unable to fetch metrics from the reporting backend. The service may be undergoing maintenance or the network connection was interrupted.
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 6,
                border: 'none',
                background: 'var(--ifm-color-danger)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Retry Request
            </button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * MetricsPage
 *
 * Renders the API metrics panel with resilient empty, permission, and failure states
 * that prevent cumulative layout shifts (Issue #765).
 */
export default function MetricsPage(): React.JSX.Element {
  const [viewState] = useState<AnalyticsStatus>('ready');

  return (
    <Layout title="API Metrics" description="Explore API usage metrics and performance diagnostics">
      <Breadcrumb />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <h1>API Usage & Metrics</h1>
          <p style={{ color: 'var(--ifm-color-emphasis-700)' }}>
            Real-time throughput, latency distributions, and status code trends across endpoints.
          </p>
        </header>

        {viewState === 'ready' ? (
          <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading metrics...</p>}>
            {() => {
              const MetricsPanel = require('../components/MetricsPanel').default;
              return <MetricsPanel />;
            }}
          </BrowserOnly>
        ) : (
          <AnalyticsExplanatoryFrame status={viewState} />
        )}
      </main>
    </Layout>
  );
}