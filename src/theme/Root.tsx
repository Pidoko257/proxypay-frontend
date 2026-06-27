import React from 'react';
import { EnvironmentProvider } from '../hooks/useEnvironment';
import SandboxBanner from '../components/SandboxBanner';

export default function Root({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <EnvironmentProvider>
      <SandboxBanner />
      {children}
    </EnvironmentProvider>
  );
}
