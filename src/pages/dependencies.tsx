import React, { Suspense, useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

const DependencyGraph = React.lazy(() => import('../components/DependencyGraph'));

function LoadingFallback(): React.JSX.Element {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setTimedOut(true), 30000);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <p role="status" style={{ padding: '2rem' }}>
      {timedOut
        ? 'The dependency graph is taking longer than expected. Please reload the page.'
        : 'Loading dependency graph...'}
    </p>
  );
}

export default function DependenciesPage(): React.JSX.Element {
  return (
    <Layout title="Endpoint Dependencies" description="Interactive graph of ProxyPay API endpoint dependencies">
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading dependency graph...</p>}>
        {() => (
          <Suspense fallback={<LoadingFallback />}>
            <DependencyGraph />
          </Suspense>
        )}
      </BrowserOnly>
    </Layout>
  );
}
