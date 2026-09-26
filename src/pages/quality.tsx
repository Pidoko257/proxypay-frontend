import React, { Suspense, useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

const CodeQualityMetrics = React.lazy(() => import('../components/CodeQualityMetrics'));

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
        : 'Loading quality dashboard…'}
    </p>
  );
}

export default function QualityPage(): React.JSX.Element {
  return (
    <Layout
      title="Code Quality Metrics"
      description="ProxyPay code quality — SonarQube gates, issue tracking, technical debt and trend reports"
    >
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading quality dashboard…</p>}>
        {() => (
          <Suspense fallback={<LoadingFallback />}>
            <CodeQualityMetrics />
          </Suspense>
        )}
      </BrowserOnly>
    </Layout>
  );
}
