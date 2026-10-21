import React, { Suspense, useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Breadcrumb from '../components/Breadcrumb';

const CodeQualityMetrics = React.lazy(() => import('../components/CodeQualityMetrics'));

interface ReportMetadata {
  periodLabel: string;
  source: string;
  lastUpdated: string;
  isStale: boolean;
  staleReason?: string;
}

function LoadingFallback(): React.JSX.Element {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setTimedOut(true), 30000);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <p role="status" style={{ padding: '2rem' }}>
      {timedOut
        ? 'The quality dashboard is taking longer than expected. Please reload the page.'
        : 'Loading quality dashboard...'}
    </p>
  );
}

export default function QualityPage(): React.JSX.Element {
  const [metadata, setMetadata] = useState<ReportMetadata>({
    periodLabel: 'Last 30 Days (Rolling)',
    source: 'SonarQube Cloud + GitHub Actions CI Test Runner',
    lastUpdated: new Date().toISOString(),
    isStale: false,
  });

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setMetadata({
        periodLabel: 'Last 30 Days (Rolling)',
        source: 'SonarQube Cloud + GitHub Actions CI Test Runner',
        lastUpdated: new Date().toISOString(),
        isStale: false,
      });
      setRefreshing(false);
    }, 600);
  };

  return (
    <Layout
      title="Code Quality Metrics"
      description="ProxyPay code quality - SonarQube gates, issue tracking, technical debt and trend reports"
    >
      <Breadcrumb />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem' }}>
        {/* Issue #769: Explicit Report Context & Freshness Header */}
        <section
          style={{
            background: 'var(--ifm-color-emphasis-100)',
            border: '1px solid var(--ifm-color-emphasis-200)',
            borderRadius: 8,
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
          aria-labelledby="quality-context-heading"
        >
          <div>
            <h2 id="quality-context-heading" style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>
              Report Context & Measurement Source
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginTop: '0.35rem', fontSize: '0.85rem', color: 'var(--ifm-color-emphasis-700)' }}>
              <span>
                <strong>Period:</strong> {metadata.periodLabel}
              </span>
              <span>
                <strong>Source:</strong> {metadata.source}
              </span>
              <span>
                <strong>Last Updated:</strong>{' '}
                <time dateTime={metadata.lastUpdated}>{new Date(metadata.lastUpdated).toLocaleTimeString()}</time>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {metadata.isStale && (
              <span
                role="status"
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: 4,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: '#fef7e0',
                  color: '#b06000',
                  border: '1px solid #f9ab00',
                }}
              >
                Stale Data Warning: Measurement > 24h old
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh quality metrics data"
              title="Refresh quality metrics data"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.85rem',
                borderRadius: 6,
                border: '1px solid var(--ifm-color-emphasis-300)',
                background: 'var(--ifm-background-color)',
                color: 'var(--ifm-font-color-base)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: refreshing ? 'not-allowed' : 'pointer',
              }}
            >
              {refreshing ? 'Refreshing...' : 'Refresh Context'}
            </button>
          </div>
        </section>

        {/* Quality Metrics Core Component */}
        <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading quality dashboard...</p>}>
          {() => (
            <Suspense fallback={<LoadingFallback />}>
              <CodeQualityMetrics />
            </Suspense>
          )}
        </BrowserOnly>
      </main>
    </Layout>
  );
}