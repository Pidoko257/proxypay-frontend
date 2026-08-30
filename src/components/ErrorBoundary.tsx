/**
 * ErrorBoundary — global React error boundary component.
 *
 * Catches unhandled errors thrown anywhere in the wrapped component tree and
 * renders a user-friendly fallback UI instead of a blank/broken page.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 */

import React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  /** Component tree to protect. */
  children: React.ReactNode;
  /** Optional custom fallback to render instead of the default UI. */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.handleReset = this.handleReset.bind(this);
    this.handleGoHome = this.handleGoHome.bind(this);
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });

    // Log to console in development only — avoid leaking stack traces in prod.
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught an unhandled error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  /** Reset error state so the component tree is re-rendered from scratch. */
  handleReset(): void {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  /** Navigate to home page as an alternative recovery path. */
  handleGoHome(): void {
    window.location.href = '/';
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // If caller provided a custom fallback, use it.
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const isDev = process.env.NODE_ENV === 'development';

    return (
      <div
        role="alert"
        aria-live="assertive"
        style={styles.wrapper}
      >
        <div style={styles.card}>
          {/* Icon */}
          <div style={styles.iconWrapper} aria-hidden="true">
            <span style={styles.icon}>⚠️</span>
          </div>

          {/* Heading */}
          <h1 style={styles.heading}>Something went wrong</h1>

          {/* Message */}
          <p style={styles.message}>
            An unexpected error occurred. The page could not be displayed.
            <br />
            You can try again or return to the home page.
          </p>

          {/* Action buttons */}
          <div style={styles.actions}>
            <button
              type="button"
              onClick={this.handleReset}
              style={styles.primaryButton}
              aria-label="Try again — reload the current view"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              style={styles.secondaryButton}
              aria-label="Go to the home page"
            >
              Go Home
            </button>
          </div>

          {/* Development error details (collapsed by default) */}
          {isDev && this.state.error && (
            <details style={styles.details}>
              <summary style={styles.detailsSummary}>
                Error details (development only)
              </summary>
              <pre style={styles.stack}>
                <strong>{this.state.error.toString()}</strong>
                {this.state.errorInfo?.componentStack
                  ? `\n\nComponent stack:${this.state.errorInfo.componentStack}`
                  : ''}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

// ─── Inline styles ────────────────────────────────────────────────────────────
// Inline styles are intentional here: the ErrorBoundary must render correctly
// even when CSS modules or global stylesheets fail to load.

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '2rem',
    backgroundColor: '#f9fafb',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  } as React.CSSProperties,

  card: {
    maxWidth: 560,
    width: '100%',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '2.5rem',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  iconWrapper: {
    marginBottom: '1rem',
  } as React.CSSProperties,

  icon: {
    fontSize: '3rem',
    lineHeight: 1,
  } as React.CSSProperties,

  heading: {
    margin: '0 0 0.75rem',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#111827',
  } as React.CSSProperties,

  message: {
    margin: '0 0 1.75rem',
    fontSize: '1rem',
    lineHeight: 1.6,
    color: '#6b7280',
  } as React.CSSProperties,

  actions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
    marginBottom: '1.5rem',
  } as React.CSSProperties,

  primaryButton: {
    padding: '0.6rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: 6,
    border: 'none',
    backgroundColor: '#2e8555',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,

  secondaryButton: {
    padding: '0.6rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: 6,
    border: '2px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    transition: 'background-color 0.2s, border-color 0.2s',
  } as React.CSSProperties,

  details: {
    textAlign: 'left' as const,
    marginTop: '1.5rem',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '1rem',
  } as React.CSSProperties,

  detailsSummary: {
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#9ca3af',
    marginBottom: '0.5rem',
  } as React.CSSProperties,

  stack: {
    fontSize: '0.75rem',
    lineHeight: 1.5,
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 6,
    padding: '0.75rem',
    overflowX: 'auto' as const,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  } as React.CSSProperties,
} as const;
