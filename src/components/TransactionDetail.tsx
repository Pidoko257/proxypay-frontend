import React, { useState, useCallback } from 'react';

export interface Transaction {
  id: string;
  status: 'completed' | 'pending' | 'failed' | 'processing';
  type: 'send' | 'receive' | 'exchange';
  amount: number;
  fee: number;
  currency: string;
  network: string;
  sender: string;
  recipient: string;
  stellarTxHash: string;
  mobilemoneyRef: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  metadata: Record<string, string>;
}

interface Section {
  id: string;
  label: string;
}

const SECTIONS: Section[] = [
  { id: 'info', label: 'Transaction Info' },
  { id: 'amount', label: 'Amount Details' },
  { id: 'status', label: 'Status' },
  { id: 'timestamps', label: 'Timestamps' },
  { id: 'metadata', label: 'Metadata' },
];

const LS_KEY = 'proxypay-txn-sections';

function loadSectionState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to default
  }
  // All sections expanded by default.
  return Object.fromEntries(SECTIONS.map((s) => [s.id, true]));
}

function saveSectionState(state: Record<string, boolean>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // ignore write errors
  }
}

function statusColor(status: Transaction['status']): string {
  switch (status) {
    case 'completed':
      return '#1ea74a';
    case 'pending':
    case 'processing':
      return '#d48e00';
    case 'failed':
      return '#e0302e';
    default:
      return 'inherit';
  }
}

interface CollapsibleSectionProps {
  id: string;
  label: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

function CollapsibleSection({ id, label, expanded, onToggle, children }: CollapsibleSectionProps): React.JSX.Element {
  return (
    <div className={`txn-section${expanded ? ' txn-section--expanded' : ''}`}>
      <button
        className="txn-section__header"
        aria-expanded={expanded}
        aria-controls={`section-body-${id}`}
        onClick={() => onToggle(id)}
      >
        <span className={`txn-section__arrow${expanded ? ' txn-section__arrow--open' : ''}`}>▶</span>
        <span className="txn-section__label">{label}</span>
      </button>
      <div
        id={`section-body-${id}`}
        className={`txn-section__body${expanded ? ' txn-section__body--visible' : ''}`}
      >
        <div className="txn-section__content">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', padding: '0.4rem 0', borderBottom: '1px solid var(--ifm-color-emphasis-200)' }}>
      <span style={{ fontWeight: 600, minWidth: 180, color: 'var(--ifm-color-emphasis-700)' }}>{label}</span>
      <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

interface TransactionDetailProps {
  transaction: Transaction;
}

export function TransactionDetail({ transaction }: TransactionDetailProps): React.JSX.Element {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(loadSectionState);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveSectionState(next);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const next = Object.fromEntries(SECTIONS.map((s) => [s.id, true]));
    setExpanded(next);
    saveSectionState(next);
  }, []);

  const collapseAll = useCallback(() => {
    const next = Object.fromEntries(SECTIONS.map((s) => [s.id, false]));
    setExpanded(next);
    saveSectionState(next);
  }, []);

  const allExpanded = SECTIONS.every((s) => expanded[s.id]);
  const allCollapsed = SECTIONS.every((s) => !expanded[s.id]);

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Transaction Detail</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="button button--secondary button--sm"
            onClick={expandAll}
            disabled={allExpanded}
          >
            Expand All
          </button>
          <button
            className="button button--secondary button--sm"
            onClick={collapseAll}
            disabled={allCollapsed}
          >
            Collapse All
          </button>
        </div>
      </div>

      <CollapsibleSection id="info" label={SECTIONS[0].label} expanded={!!expanded['info']} onToggle={toggle}>
        <Field label="Transaction ID" value={transaction.id} />
        <Field label="Type" value={transaction.type} />
        <Field label="Network" value={transaction.network} />
        <Field label="Sender" value={transaction.sender} />
        <Field label="Recipient" value={transaction.recipient} />
        <Field label="Stellar Tx Hash" value={transaction.stellarTxHash} />
        <Field label="Mobile Money Ref" value={transaction.mobilemoneyRef} />
      </CollapsibleSection>

      <CollapsibleSection id="amount" label={SECTIONS[1].label} expanded={!!expanded['amount']} onToggle={toggle}>
        <Field label="Amount" value={`${transaction.amount.toFixed(2)} ${transaction.currency}`} />
        <Field label="Fee" value={`${transaction.fee.toFixed(4)} ${transaction.currency}`} />
        <Field label="Net Amount" value={`${(transaction.amount - transaction.fee).toFixed(4)} ${transaction.currency}`} />
      </CollapsibleSection>

      <CollapsibleSection id="status" label={SECTIONS[2].label} expanded={!!expanded['status']} onToggle={toggle}>
        <Field
          label="Status"
          value={
            <span style={{ color: statusColor(transaction.status), fontWeight: 700 }}>
              {transaction.status.toUpperCase()}
            </span>
          }
        />
      </CollapsibleSection>

      <CollapsibleSection id="timestamps" label={SECTIONS[3].label} expanded={!!expanded['timestamps']} onToggle={toggle}>
        <Field label="Created At" value={transaction.createdAt} />
        <Field label="Updated At" value={transaction.updatedAt} />
        <Field label="Completed At" value={transaction.completedAt ?? '—'} />
      </CollapsibleSection>

      <CollapsibleSection id="metadata" label={SECTIONS[4].label} expanded={!!expanded['metadata']} onToggle={toggle}>
        {Object.entries(transaction.metadata).length === 0 ? (
          <p style={{ margin: 0, color: 'var(--ifm-color-emphasis-500)' }}>No metadata available.</p>
        ) : (
          Object.entries(transaction.metadata).map(([k, v]) => (
            <Field key={k} label={k} value={v} />
          ))
        )}
      </CollapsibleSection>
    </div>
  );
}

export default TransactionDetail;
