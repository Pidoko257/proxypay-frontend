import React, { useState, useCallback, useRef, useEffect } from 'react';
import clsx from 'clsx';
import BrowserOnly from '@docusaurus/BrowserOnly';

// ---------- Toast ----------

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

let toastListeners: Array<(t: ToastMessage) => void> = [];
let toastCounter = 0;

/** Programmatically show a toast from anywhere in the tree. */
export function showToast(message: string, type: ToastMessage['type'] = 'success') {
  const toast: ToastMessage = { id: ++toastCounter, message, type };
  toastListeners.forEach(fn => fn(toast));
}

/** Mount once near the app root (or per-page) to render toasts. */
export function ToastContainer(): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener = (t: ToastMessage) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id));
      }, 2500);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(fn => fn !== listener);
    };
  }, []);

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map(t => (
        <div key={t.id} className={clsx('toast', `toast--${t.type}`)} role="status">
          {t.type === 'success' ? '✓' : '✗'} {t.message}
        </div>
      ))}
    </div>
  );
}

// ---------- CopyButton ----------

export interface CopyButtonProps {
  /** The text value to copy to clipboard */
  value: string;
  /** Accessible label (defaults to "Copy to clipboard") */
  ariaLabel?: string;
  /** Extra CSS classes */
  className?: string;
  /** Optional success message override */
  successMessage?: string;
}

function CopyButtonInner({ value, ariaLabel = 'Copy to clipboard', className, successMessage }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      showToast(successMessage ?? 'Copied to clipboard!', 'success');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy — please copy manually.', 'error');
    }
  }, [value, successMessage]);

  // Keyboard shortcut: Ctrl+C / Cmd+C when the button is focused
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        doCopy();
      }
    },
    [doCopy],
  );

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return (
    <button
      type="button"
      className={clsx('copy-button', { 'copy-button--copied': copied }, className)}
      onClick={doCopy}
      onKeyDown={handleKeyDown}
      aria-label={copied ? 'Copied!' : ariaLabel}
      title={copied ? 'Copied!' : ariaLabel}
    >
      {copied ? (
        <span className="copy-button-icon copy-button-icon--success" aria-hidden="true">✓</span>
      ) : (
        <span className="copy-button-icon" aria-hidden="true">
          {/* Clipboard SVG icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <rect x="9" y="2" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </span>
      )}
    </button>
  );
}

export default function CopyButton(props: CopyButtonProps): React.JSX.Element {
  return (
    <BrowserOnly fallback={null}>
      {() => <CopyButtonInner {...props} />}
    </BrowserOnly>
  );
}

// ---------- TransactionIdField ----------

/**
 * Convenience component that renders a monospace ID value with a copy button
 * and (if provided) an optional Stellar hash on the next row.
 */
export interface TransactionIdFieldProps {
  /** The primary transaction ID */
  transactionId: string;
  /** Optional Stellar transaction hash */
  stellarHash?: string;
  /** Additional CSS class */
  className?: string;
}

export function TransactionIdField({ transactionId, stellarHash, className }: TransactionIdFieldProps): React.JSX.Element {
  return (
    <div className={clsx('txid-field', className)}>
      <div className="txid-row">
        <span className="txid-label">Transaction ID</span>
        <span className="txid-value-group">
          <code className="txid-value">{transactionId}</code>
          <CopyButton
            value={transactionId}
            ariaLabel="Copy transaction ID"
            successMessage="Transaction ID copied!"
          />
        </span>
      </div>
      {stellarHash && (
        <div className="txid-row">
          <span className="txid-label">Stellar Hash</span>
          <span className="txid-value-group">
            <code className="txid-value">{stellarHash}</code>
            <CopyButton
              value={stellarHash}
              ariaLabel="Copy Stellar hash"
              successMessage="Stellar hash copied!"
            />
          </span>
        </div>
      )}
    </div>
  );
}
