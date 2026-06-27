import React from 'react';
import { EnvironmentProvider } from '../hooks/useEnvironment';
import { RateLimitProvider } from '../hooks/useRateLimit';
import SandboxBanner from '../components/SandboxBanner';
import RateLimitPanel from '../components/RateLimitPanel';

export default function Root({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <EnvironmentProvider>
      <RateLimitProvider>
        <SandboxBanner />
        {children}
        <RateLimitPanel />
      </RateLimitProvider>
    </EnvironmentProvider>
  );
}
