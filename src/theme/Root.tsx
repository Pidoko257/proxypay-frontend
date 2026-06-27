import React from 'react';
import { ToastProvider } from '@site/src/contexts/ToastContext';

/**
 * Docusaurus `Root` wraps the entire app (layout + every page) and persists
 * across client-side navigation — the correct place to mount a global provider.
 * This makes {@link useToast} available everywhere without per-page setup.
 */
export default function Root({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <ToastProvider>{children}</ToastProvider>;
}
