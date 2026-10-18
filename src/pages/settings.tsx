/**
 * Settings page — /settings
 *
 * Hosts the feature-flag configuration UI. Wraps everything in a
 * FeatureFlagProvider so the settings component has context access.
 */

import React, { useState } from 'react';
import Layout from '@theme/Layout';
import { FeatureFlagProvider, useFeatureFlag } from '@site/src/featureFlags';
import { FeatureFlagSettings } from '@site/src/components/FeatureFlagSettings';
import { FeatureFlagDebugPanel } from '@site/src/components/FeatureFlagDebugPanel';

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
      title="Settings — Feature Flags"
      description="Configure feature flags for ProxyPay"
    >
      <FeatureFlagProvider userId={userId}>
        <FeatureFlagSettings />
        <DebugPanelGate />
      </FeatureFlagProvider>
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
