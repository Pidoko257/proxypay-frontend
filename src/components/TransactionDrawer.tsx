import React, { useEffect, useRef, useCallback } from 'react';

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | string;
  date: string;
  description: string;
  sender: string;
  recipient: string;
}

export interface TransactionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export default function TransactionDrawer({
  isOpen,
  onClose,
  transaction,
}: TransactionDrawerProps): React.JSX.Element | null {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = 'transaction-drawer-title';

  // Store previously focused element and focus the drawer on open
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the first focusable element inside the drawer
      const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
      firstFocusable?.focus();
    } else {
      // Restore focus when drawer closes
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Escape key closes the drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap: keep Tab / Shift+Tab cycling within the drawer
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Tab') return;
      const focusableElements = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS) ?? []
      );
      if (focusableElements.length === 0) return;

      const firstEl = focusableElements[0];
      const lastEl = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab — wrap to last when focus is on first
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        // Tab — wrap to first when focus is on last
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    },
    []
  );

  if (!isOpen || !transaction) return null;

  const statusColor: Record<string, string> = {
    completed: '#2e8555',
    failed: '#e53e3e',
    pending: '#d69e2e',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
        }}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100%',
          width: '100%',
          maxWidth: 480,
          backgroundColor: 'var(--pp-surface, #fff)',
          color: 'var(--pp-text, #1a202c)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
        }}
        tabIndex={-1}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--pp-border, #e2e8f0)',
          }}
        >
          <h2
            id={titleId}
            style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}
          >
            Transaction Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transaction drawer"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.5rem',
              lineHeight: 1,
              padding: '0.25rem 0.5rem',
              borderRadius: 4,
              color: 'var(--pp-text-muted, #718096)',
            }}
          >
            ×
          </button>
        </div>

        {/* Body — scrollable */}
        <div
          style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}
          role="region"
          aria-label="Transaction information"
        >
          {/* Status badge */}
          <section aria-labelledby="section-status">
            <h3
              id="section-status"
              style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--pp-text-muted, #718096)', marginBottom: '0.5rem' }}
            >
              Status
            </h3>
            <span
              style={{
                display: 'inline-block',
                padding: '0.25rem 0.75rem',
                borderRadius: 9999,
                backgroundColor: statusColor[transaction.status] ?? '#718096',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
              aria-label={`Status: ${transaction.status}`}
            >
              {transaction.status}
            </span>
          </section>

          <hr style={{ margin: '1.25rem 0', borderColor: 'var(--pp-border, #e2e8f0)' }} />

          {/* Amount */}
          <section aria-labelledby="section-amount">
            <h3
              id="section-amount"
              style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--pp-text-muted, #718096)', marginBottom: '0.25rem' }}
            >
              Amount
            </h3>
            <p
              style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}
              aria-label={`Amount: ${transaction.amount} ${transaction.currency}`}
            >
              {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
              <span style={{ fontSize: '1rem', fontWeight: 400 }}>{transaction.currency}</span>
            </p>
          </section>

          <hr style={{ margin: '1.25rem 0', borderColor: 'var(--pp-border, #e2e8f0)' }} />

          {/* Details grid */}
          <section aria-labelledby="section-details">
            <h3
              id="section-details"
              style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--pp-text-muted, #718096)', marginBottom: '0.75rem' }}
            >
              Details
            </h3>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1rem' }}>
              <div>
                <dt style={{ fontSize: '0.75rem', color: 'var(--pp-text-muted, #718096)' }}>Transaction ID</dt>
                <dd style={{ margin: 0, fontSize: '0.875rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {transaction.id}
                </dd>
              </div>
              <div>
                <dt style={{ fontSize: '0.75rem', color: 'var(--pp-text-muted, #718096)' }}>Date</dt>
                <dd style={{ margin: 0, fontSize: '0.875rem' }}>{transaction.date}</dd>
              </div>
              <div>
                <dt style={{ fontSize: '0.75rem', color: 'var(--pp-text-muted, #718096)' }}>Sender</dt>
                <dd style={{ margin: 0, fontSize: '0.875rem' }}>{transaction.sender}</dd>
              </div>
              <div>
                <dt style={{ fontSize: '0.75rem', color: 'var(--pp-text-muted, #718096)' }}>Recipient</dt>
                <dd style={{ margin: 0, fontSize: '0.875rem' }}>{transaction.recipient}</dd>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <dt style={{ fontSize: '0.75rem', color: 'var(--pp-text-muted, #718096)' }}>Description</dt>
                <dd style={{ margin: 0, fontSize: '0.875rem' }}>{transaction.description}</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--pp-border, #e2e8f0)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transaction drawer"
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 6,
              border: '1px solid var(--pp-border, #e2e8f0)',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              color: 'var(--pp-text, #1a202c)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
