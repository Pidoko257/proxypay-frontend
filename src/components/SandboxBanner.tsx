import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

function Banner() {
  const { useEnvironment, ENV_URLS } = require('../hooks/useEnvironment');
  const { env, apiBaseUrl } = useEnvironment();
  if (env !== 'sandbox') return null;

  return (
    <div className="sandbox-banner" role="status">
      <strong>⚠ Sandbox Mode</strong>
      &nbsp;—&nbsp;API calls go to{' '}
      <code>{apiBaseUrl}</code>. No real transactions.
    </div>
  );
}

export default function SandboxBanner(): React.JSX.Element {
  return (
    <BrowserOnly fallback={null}>
      {() => <Banner />}
    </BrowserOnly>
  );
}
