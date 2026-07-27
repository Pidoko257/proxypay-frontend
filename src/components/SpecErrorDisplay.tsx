import React from 'react';
import type { ValidationError } from '../utils/validateSpec';

interface SpecErrorDisplayProps {
  errors: ValidationError[];
  specUrl: string;
  onRetry?: () => void;
}

function ErrorItem({ error, index }: { error: ValidationError; index: number }) {
  return (
    <div style={styles.errorItem}>
      <div style={styles.errorHeader}>
        <span style={styles.errorBadge}>Error {index + 1}</span>
        {error.line !== undefined && (
          <span style={styles.lineBadge}>Line {error.line}</span>
        )}
      </div>
      <p style={styles.errorMessage}>{error.message}</p>
      <div style={styles.suggestion}>
        <strong style={styles.suggestionLabel}>How to fix:</strong> {error.suggestion}
      </div>
    </div>
  );
}

export default function SpecErrorDisplay({
  errors,
  specUrl,
  onRetry,
}: SpecErrorDisplayProps): React.JSX.Element {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.icon}>!</div>
        <h2 style={styles.title}>OpenAPI Spec Validation Failed</h2>
        <p style={styles.subtitle}>
          The spec at <code style={styles.code}>{specUrl}</code> contains{' '}
          {errors.length === 1 ? 'an error' : `${errors.length} errors`} that must be
          fixed before the API reference can be displayed.
        </p>
      </div>

      <div style={styles.errorList}>
        {errors.map((error, i) => (
          <ErrorItem key={i} error={error} index={i} />
        ))}
      </div>

      <div style={styles.actions}>
        {onRetry && (
          <button onClick={onRetry} style={styles.retryButton}>
            Retry
          </button>
        )}
        <a
          href="https://swagger.io/specification/"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.link}
        >
          OpenAPI 3.0 Specification Reference
        </a>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '2rem',
    maxWidth: 800,
    margin: '0 auto',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  icon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: '50%',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    fontSize: 24,
    fontWeight: 700,
    marginBottom: '1rem',
  },
  title: {
    margin: '0 0 0.5rem',
    fontSize: '1.5rem',
    color: '#111827',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.95rem',
    color: '#6b7280',
    lineHeight: 1.5,
  },
  code: {
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: '0.85rem',
    color: '#dc2626',
  },
  errorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  errorItem: {
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '1rem',
    backgroundColor: '#fef2f2',
  },
  errorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  errorBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    backgroundColor: '#dc2626',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  lineBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  errorMessage: {
    margin: '0 0 0.75rem',
    fontSize: '0.9rem',
    color: '#111827',
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    lineHeight: 1.5,
  },
  suggestion: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: '0.75rem',
    fontSize: '0.85rem',
    color: '#374151',
    lineHeight: 1.5,
  },
  suggestionLabel: {
    color: '#059669',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
  },
  retryButton: {
    padding: '0.5rem 1.25rem',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    backgroundColor: '#fff',
    color: '#374151',
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontWeight: 500,
  },
  link: {
    fontSize: '0.85rem',
    color: '#2563eb',
    textDecoration: 'none',
  },
};
