import React from "react";
import styles from "./ErrorFallback.module.css";
import type { FallbackProps } from "./Errorboundary";



const ErrorFallback: React.FC<FallbackProps> = ({
  error,
  errorId,
  section,
  onReset,
}) => {
  const sectionLabel = section ? `"${section}"` : "this section";

  return (
    <div role="alert" aria-live="assertive" className={styles.container}>
      {/* Icon */}
      <div className={styles.iconWrapper} aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.icon}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      {/* Heading */}
      <h2 className={styles.heading}>
        Something went wrong in {sectionLabel}
      </h2>

      {/* Friendly message */}
      <p className={styles.message}>
        An unexpected error occurred and this section could not be displayed.
        Our team has been notified automatically. You can try reloading the
        section below.
      </p>

      {/* Error code */}
      <p className={styles.errorCode}>
        Error code: <span className={styles.errorCodeValue}>{errorId}</span>
      </p>

      {/* Developer details — only in non-production environments */}
      {process.env.NODE_ENV !== "production" && (
        <details className={styles.details}>
          <summary className={styles.detailsSummary}>Developer details</summary>
          <pre className={styles.stack}>
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ""}
          </pre>
        </details>
      )}

      {/* Reload button */}
      <button
        type="button"
        onClick={onReset}
        className={styles.reloadButton}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={styles.reloadIcon}
        >
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 .49-3.54" />
        </svg>
        Reload section
      </button>
    </div>
  );
};

export default ErrorFallback;