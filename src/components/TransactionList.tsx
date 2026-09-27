import React, { useCallback } from 'react';
import useApiWithRetry from './useApiWithRetry';

interface Transaction {
  id: string;
  date: string;
  sender: string;
  recipient: string;
  amount: number;
  currency: string;
  status: string;
}

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'txn_001', date: '2026-09-24', sender: 'Alice Nguyen', recipient: 'Bob Martin', amount: 250.0, currency: 'USD', status: 'completed' },
  { id: 'txn_002', date: '2026-09-23', sender: 'Charlie Davis', recipient: 'Diana Prince', amount: 1000.0, currency: 'USD', status: 'pending' },
  { id: 'txn_003', date: '2026-09-22', sender: 'Eve Williams', recipient: 'Frank Castle', amount: 75.5, currency: 'USD', status: 'failed' },
  { id: 'txn_004', date: '2026-09-21', sender: 'Grace Kelly', recipient: 'Hank Pym', amount: 3200.0, currency: 'USD', status: 'completed' },
  { id: 'txn_005', date: '2026-09-20', sender: 'Ivan Drago', recipient: 'Jane Doe', amount: 540.75, currency: 'USD', status: 'completed' },
];

function fetchTransactions(): Promise<Transaction[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_TRANSACTIONS), 500);
  });
}

const STATUS_COLOR: Record<string, string> = {
  completed: '#2e8555',
  pending: '#d69e2e',
  failed: '#e53e3e',
};

export default function TransactionList(): React.JSX.Element {
  // Stable fetch function reference so deps array stays empty
  const stableFetch = useCallback(() => fetchTransactions(), []);
  const { data, loading, error, retry } = useApiWithRetry<Transaction[]>(stableFetch, []);

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          padding: '3rem',
          textAlign: 'center',
          fontSize: '1rem',
          color: 'var(--pp-text-muted, #718096)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <span aria-label="Loading transactions">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        style={{
          padding: '2rem 1.5rem',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: 'var(--pp-text, #1a202c)',
        }}
      >
        <p style={{ marginBottom: '0.5rem', fontWeight: 600, fontSize: '1rem' }}>
          Failed to load transactions
        </p>
        <p
          style={{
            marginBottom: '1.25rem',
            fontSize: '0.9375rem',
            color: 'var(--pp-text-muted, #718096)',
          }}
        >
          {error.message}
        </p>
        <button
          type="button"
          onClick={retry}
          aria-label="Retry loading transactions"
          style={{
            padding: '0.5rem 1.25rem',
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

  if (!data || data.length === 0) {
    return (
      <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--pp-text-muted, #718096)' }}>
        No transactions found.
      </p>
    );
  }

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: 'var(--pp-text, #1a202c)',
      }}
    >
      <div
        style={{
          borderRadius: 8,
          border: '1px solid var(--pp-border, #e2e8f0)',
          backgroundColor: 'var(--pp-surface, #fff)',
          overflow: 'hidden',
        }}
      >
        <table
          style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9375rem' }}
          aria-label="Transaction list"
        >
          <thead>
            <tr style={{ backgroundColor: 'var(--pp-bg, #f7fafc)' }}>
              {['ID', 'Date', 'Sender', 'Recipient', 'Amount', 'Status'].map((col) => (
                <th
                  key={col}
                  scope="col"
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--pp-text-muted, #718096)',
                    borderBottom: '1px solid var(--pp-border, #e2e8f0)',
                    fontWeight: 600,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((tx, idx) => (
              <tr
                key={tx.id}
                style={{
                  borderBottom:
                    idx < data.length - 1 ? '1px solid var(--pp-border, #e2e8f0)' : 'none',
                }}
              >
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                  {tx.id}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>{tx.date}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{tx.sender}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{tx.recipient}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>
                  {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tx.currency}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.15rem 0.6rem',
                      borderRadius: 9999,
                      backgroundColor: STATUS_COLOR[tx.status] ?? '#718096',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  >
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
