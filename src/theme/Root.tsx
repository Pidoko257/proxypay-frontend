import React, { ReactNode } from 'react';
import styles from './Root.module.css';

interface BoundaryState {
  error: Error | null;
}

interface MonitoringWindow extends Window {
  Sentry?: {
    captureException: (error: Error, context?: { extra?: Record<string, unknown> }) => void;
  };
}

class ErrorBoundary extends React.Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const browserWindow = window as MonitoringWindow;
    if (browserWindow.Sentry?.captureException) {
      browserWindow.Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
    } else {
      console.error('Application rendering error', error, info.componentStack);
    }
    browserWindow.dispatchEvent(new CustomEvent('proxypay:error', {
      detail: { error, componentStack: info.componentStack },
    }));
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    const isDevelopment = process.env.NODE_ENV !== 'production';

    return (
      <main className={styles.fallback} role="alert">
        <p className={styles.eyebrow}>APPLICATION ERROR</p>
        <h1>Something went wrong</h1>
        <p>The page could not be displayed. Refresh to try again.</p>
        {isDevelopment && (
          <pre className={styles.details}>{this.state.error.stack || this.state.error.message}</pre>
        )}
        <button type="button" onClick={() => window.location.reload()}>Refresh page</button>
      </main>
    );
  }
}

export default function Root({ children }: { children: ReactNode }): React.JSX.Element {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
