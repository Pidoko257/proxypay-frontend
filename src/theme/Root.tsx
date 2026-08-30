/**
 * Docusaurus Root component wrapper.
 *
 * Docusaurus automatically uses `src/theme/Root.tsx` as the application-level
 * component wrapper (analogous to `_app.tsx` in Next.js).  Wrapping with
 * ErrorBoundary here means ALL pages in the portal are protected by the global
 * error boundary.
 *
 * See: https://docusaurus.io/docs/swizzling#wrapper-your-site-with-root
 */

import React from 'react';
import ErrorBoundary from '@site/src/components/ErrorBoundary';

interface RootProps {
  children: React.ReactNode;
}

export default function Root({ children }: RootProps): React.JSX.Element {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
