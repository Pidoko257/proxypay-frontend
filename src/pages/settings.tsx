/**
 * Settings page — /settings
 *
 * Hosts the feature-flag configuration UI (#existing) plus the new API
 * environment configuration (#598) and the request/response debug panel (#597).
 * Wraps everything in a FeatureFlagProvider so the settings components have
 * context access.
 */

import React, { useState, lazy, Suspense } from 'react';
import Layout from '@theme/Layout';
import { FeatureFlagProvider, useFeatureFlag } from '@site/src/featureFlags';
import { FeatureFlagSettings } from '@site/src/components/FeatureFlagSettings';
import { FeatureFlagDebugPanel } from '@site/src/components/FeatureFlagDebugPanel';
import DataRetentionPolicy from '@site/src/components/DataRetentionPolicy';

export default function SettingsPage(): React.JSX.Element {
  // In a real app this would come from an auth context / session
  const [userId] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    try {
      return localStorage.getItem('proxypay-user-id') ?? undefined;
    } catch {
      return undefined;
    }
  });

  return (
    <Layout
      title="Settings"
      description="Configure ProxyPay feature flags, API environment, and debug tools"
    >
      <Breadcrumb />
      <FeatureFlagProvider userId={userId}>
        {/* Existing feature-flag settings */}
        <FeatureFlagSettings />
        <DebugPanelGate />

        {/* Issue #598 — API base URL / environment configuration */}
        <Suspense fallback={<p style={{ padding: '1rem' }}>Loading API settings…</p>}>
          <ApiEnvironmentSettings />
        </Suspense>

        {/* Issue #597 — Request/Response interceptor debug panel */}
        <Suspense fallback={<p style={{ padding: '1rem' }}>Loading debug panel…</p>}>
          <InterceptorDebugPanel />
        </Suspense>
      </FeatureFlagProvider>
      <DataRetentionPolicy />
    </Layout>
  );
}

/**
 * Only mounts the debug panel when the `debug-panel` flag is itself enabled,
 * preventing a chicken-and-egg bootstrap problem.
 */
function DebugPanelGate(): React.JSX.Element | null {
  const { isEnabled } = useFeatureFlag('debug-panel');
  if (!isEnabled) return null;
  return <FeatureFlagDebugPanel />;
}
