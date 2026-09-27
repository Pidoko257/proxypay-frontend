import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ApiErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
  fallbackTitle?: string;
}

interface ApiErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ApiErrorBoundary extends Component<
  ApiErrorBoundaryProps,
  ApiErrorBoundaryState
> {
  constructor(props: ApiErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ApiErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // In production you'd send this to an error reporting service
    console.error('[ApiErrorBoundary] Caught error:', error, info.componentStack);
  }

  private handleRetry = (): void => {
    const { onRetry } = this.props;
    if (onRetry) {
      this.setState({ hasError: false, error: null });
      onRetry();
    } else {
      window.location.reload();
    }
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallbackTitle = 'Something went wrong' } = this.props;

    if (!hasError) return children;

    return (
      <div
        role="alert"
        aria-live="assertive"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 1.5rem',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: 'var(--pp-text, #1a202c)',
        }}
      >
        <div
          style={{
            fontSize: '3rem',
            marginBottom: '1rem',
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          ⚠️
        </div>

        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
          {fallbackTitle}
        </h2>

        {error && (
          <p
            style={{
              margin: '0 0 1.5rem',
              fontSize: '0.9375rem',
              color: 'var(--pp-text-muted, #718096)',
              maxWidth: 480,
              wordBreak: 'break-word',
            }}
          >
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
        )}

        <button
          type="button"
          onClick={this.handleRetry}
          aria-label="Retry the failed operation"
          style={{
            padding: '0.5rem 1.5rem',
            borderRadius: 6,
            border: 'none',
            backgroundColor: 'var(--pp-primary, #2e8555)',
            color: '#fff',
            fontSize: '0.9375rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }
}
