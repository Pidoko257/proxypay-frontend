import React, { useEffect, useState, useCallback } from 'react';
import { RedocStandalone } from 'redoc';
import { validateSpec, type SpecValidationResult } from '../utils/validateSpec';
import SpecErrorDisplay from './SpecErrorDisplay';

const SPEC_URL = '/openapi.yaml';

function LoadingState(): React.JSX.Element {
  return (
    <div style={loadingStyles.container}>
      <div style={loadingStyles.spinner} />
      <p style={loadingStyles.text}>Loading and validating API specification...</p>
    </div>
  );
}

const loadingStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    gap: '1rem',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #e5e7eb',
    borderTopColor: '#2563eb',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  text: {
    margin: 0,
    fontSize: '0.95rem',
    color: '#6b7280',
  },
};

function FetchErrorDisplay({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <div style={fetchErrorStyles.container}>
      <div style={fetchErrorStyles.icon}>!</div>
      <h2 style={fetchErrorStyles.title}>Failed to Load API Specification</h2>
      <p style={fetchErrorStyles.message}>{error}</p>
      <div style={fetchErrorStyles.actions}>
        <button onClick={onRetry} style={fetchErrorStyles.retryButton}>
          Retry
        </button>
        <p style={fetchErrorStyles.hint}>
          Ensure the OpenAPI spec exists at <code>{SPEC_URL}</code>. Copy your
          backend's <code>openapi.yaml</code> into the <code>static/</code> directory.
        </p>
      </div>
    </div>
  );
}

const fetchErrorStyles: Record<string, React.CSSProperties> = {
  container: {
    padding: '3rem 2rem',
    textAlign: 'center',
    maxWidth: 600,
    margin: '0 auto',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  icon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: '50%',
    backgroundColor: '#fef3c7',
    color: '#d97706',
    fontSize: 24,
    fontWeight: 700,
    marginBottom: '1rem',
  },
  title: {
    margin: '0 0 0.5rem',
    fontSize: '1.25rem',
    color: '#111827',
  },
  message: {
    margin: '0 0 1.5rem',
    fontSize: '0.9rem',
    color: '#6b7280',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  retryButton: {
    padding: '0.5rem 1.5rem',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    backgroundColor: '#fff',
    color: '#374151',
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontWeight: 500,
  },
  hint: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#9ca3af',
    lineHeight: 1.5,
  },
};

export default function ApiReference(): React.JSX.Element {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; error: string }
    | { status: 'invalid'; result: SpecValidationResult }
    | { status: 'ready'; spec: Record<string, unknown> }
  >({ status: 'loading' });

  const loadSpec = useCallback(async () => {
    setState({ status: 'loading' });

    try {
      const response = await fetch(SPEC_URL);
      if (!response.ok) {
        setState({
          status: 'error',
          error: `HTTP ${response.status}: ${response.statusText}. The spec file was not found at ${SPEC_URL}.`,
        });
        return;
      }

      const rawSpec = await response.text();
      const result = await validateSpec(rawSpec);

      if (result.valid && result.spec) {
        setState({ status: 'ready', spec: result.spec });
      } else {
        setState({ status: 'invalid', result });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState({ status: 'error', error: message });
    }
  }, []);

  useEffect(() => {
    loadSpec();
  }, [loadSpec]);

  if (state.status === 'loading') {
    return <LoadingState />;
  }

  if (state.status === 'error') {
    return <FetchErrorDisplay error={state.error} onRetry={loadSpec} />;
  }

  if (state.status === 'invalid') {
    return (
      <SpecErrorDisplay
        errors={state.result.errors}
        specUrl={SPEC_URL}
        onRetry={loadSpec}
      />
    );
  }

  return (
    <RedocStandalone
      spec={state.spec as any}
      options={{
        hideHostname: false,
        disableSearch: false,
        expandResponses: '200,201',
        requiredPropsFirst: true,
        sortPropsAlphabetically: true,
      }}
    />
  );
}
