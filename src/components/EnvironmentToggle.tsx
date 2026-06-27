import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

function Toggle() {
  const { useEnvironment } = require('../../hooks/useEnvironment');
  const { env, setEnv } = useEnvironment();
  const isSandbox = env === 'sandbox';

  return (
    <button
      className={`env-toggle env-toggle--${env}`}
      onClick={() => setEnv(isSandbox ? 'production' : 'sandbox')}
      title={`Switch to ${isSandbox ? 'production' : 'sandbox'}`}
      aria-label={`Environment: ${env}. Click to switch.`}
    >
      <span className="env-toggle__dot" />
      <span className="env-toggle__label">{isSandbox ? 'Sandbox' : 'Production'}</span>
    </button>
  );
}

export default function EnvironmentToggle(): React.JSX.Element {
  return (
    <BrowserOnly fallback={null}>
      {() => <Toggle />}
    </BrowserOnly>
  );
}
