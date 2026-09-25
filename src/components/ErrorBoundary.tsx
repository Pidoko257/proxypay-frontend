/**
 * ErrorBoundary — Issue #451
 *
 * React class component that catches render/lifecycle errors in its subtree
 * and shows a graceful fallback UI instead of crashing the whole page.
 *
 * Features:
 *  - Catches render errors and shows a fallback with error details
 *  - Logs errors to console (and optional onError callback)
 *  - Retry button resets the boundary so the child can re-mount
 *  - HOC `withErrorBoundary` for easy wrapping of any component
 *  - Compact variant for use inside tight layouts
 */

import React, { Component, ErrorInfo } from 'react';
import styles from './ErrorBoundary.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ErrorBoundaryProps {
  /** The subtree to protect. */
  children: React.ReactNode;
  /**
   * Custom fallback UI. Receives the caught error and a retry callback.
   * When provided the default fallback UI is not rendered.
   */
  fallback?: (error: Error, retry: () => void) => React.ReactNode;
  /** Called after the error is caught — use for external logging. */
  onError?: (error: Error, info: ErrorInfo) => void;
  /** Human-readable section name shown in the fallback heading. */
  section?: string;
  /**
   * Show a compact inline fallback instead of the full centred card.
   * @default false
   */
  compact?: boolean;
  /** Whether to show the collapsible stack-trace section. @default true */
  showDetails?: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ---------------------------------------------------------------------------
// ErrorBoundary class component
// ---------------------------------------------------------------------------

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static readonly displayName = 'ErrorBoundary';

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.handleRetry = this.handleRetry.bind(this);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Always log to console so developers see it in DevTools
    console.error(
      `[ErrorBoundary]${this.props.section ? ` <${this.props.section}>` : ''} caught an error:`,
      error,
      info.componentStack,
    );

    this.setState({ errorInfo: info });

    // Delegate to external handler (e.g. telemetry service)
    this.props.onError?.(error, info);
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  handleRetry(): void {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  render(): React.ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const {
      children,
      fallback,
      section,
      compact = false,
      showDetails = true,
    } = this.props;

    if (!hasError || !error) return children;

    // Custom fallback takes full control
    if (fallback) {
      return fallback(error, this.handleRetry);
    }

    const sectionLabel = section ?? 'this section';
    const fallbackClass = compact
      ? `${styles.fallback} ${styles.fallbackCompact}`
      : styles.fallback;

    return (
      <div
        className={fallbackClass}
        role="alert"
        aria-live="assertive"
        data-testid="error-boundary-fallback"
      >
        <span className={styles.icon} aria-hidden="true">⚠️</span>

        <h4 className={styles.heading}>
          Something went wrong in {sectionLabel}
        </h4>

        <p className={styles.message}>
          {error.message ||
            'An unexpected error occurred. You can try reloading this section.'}
        </p>

        {showDetails && errorInfo && (
          <details className={styles.details}>
            <summary className={styles.detailsSummary}>
              Technical details
            </summary>
            <pre className={styles.detailsContent}>
              {error.stack ?? error.toString()}
              {'\n\nComponent stack:'}
              {errorInfo.componentStack}
            </pre>
          </details>
        )}

        <div className={styles.actions}>
          <button
            className={styles.retryBtn}
            onClick={this.handleRetry}
            aria-label={`Retry loading ${sectionLabel}`}
          >
            ↺ Retry
          </button>
        </div>
      </div>
    );
  }
}

// ---------------------------------------------------------------------------
// Higher-Order Component
// ---------------------------------------------------------------------------

/**
 * Wraps a component in an ErrorBoundary.
 *
 * @example
 *   const SafeChart = withErrorBoundary(ChartComponent, { section: 'Chart' });
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  boundaryProps: Omit<ErrorBoundaryProps, 'children'> = {},
): React.FC<P> {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WithBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...boundaryProps} section={boundaryProps.section ?? displayName}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithBoundary.displayName = `withErrorBoundary(${displayName})`;
  return WithBoundary;
}

export default ErrorBoundary;
