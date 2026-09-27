import React from 'react';
import DarkModeToggle from './DarkModeToggle';

interface StatCardProps {
  label: string;
  value: string;
  description?: string;
}

function StatCard({ label, value, description }: StatCardProps): React.JSX.Element {
  return (
    <div
      style={{
        flex: '1 1 200px',
        padding: '1.25rem 1.5rem',
        borderRadius: 8,
        border: '1px solid var(--pp-border, #e2e8f0)',
        backgroundColor: 'var(--pp-surface, #fff)',
      }}
    >
      <p style={{ margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--pp-text-muted, #718096)' }}>
        {label}
      </p>
      <p style={{ margin: '0.25rem 0 0', fontSize: '1.75rem', fontWeight: 700, color: 'var(--pp-text, #1a202c)' }}>
        {value}
      </p>
      {description && (
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--pp-text-muted, #718096)' }}>
          {description}
        </p>
      )}
    </div>
  );
}

const MOCK_TRANSACTIONS = [
  { id: 'txn_001', date: '2026-09-24', sender: 'Alice', recipient: 'Bob', amount: 250.0, currency: 'USD', status: 'completed' },
  { id: 'txn_002', date: '2026-09-23', sender: 'Charlie', recipient: 'Diana', amount: 1_000.0, currency: 'USD', status: 'pending' },
  { id: 'txn_003', date: '2026-09-22', sender: 'Eve', recipient: 'Frank', amount: 75.5, currency: 'USD', status: 'failed' },
];

const STATUS_COLOR: Record<string, string> = {
  completed: '#2e8555',
  pending: '#d69e2e',
  failed: '#e53e3e',
};

export default function Dashboard(): React.JSX.Element {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--pp-bg, #f7fafc)',
        color: 'var(--pp-text, #1a202c)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--pp-border, #e2e8f0)',
          backgroundColor: 'var(--pp-surface, #fff)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--pp-primary, #2e8555)' }}>
          ProxyPay Dashboard
        </h1>
        <DarkModeToggle />
      </header>

      {/* Main content */}
      <main style={{ padding: '2rem 1.5rem', maxWidth: 1100, margin: '0 auto' }}>

        {/* Stats summary */}
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Overview
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard label="Total Transactions" value="1,284" description="All time" />
            <StatCard label="Volume (USD)" value="$482,300" description="Last 30 days" />
            <StatCard label="Success Rate" value="97.4%" description="Last 30 days" />
            <StatCard label="Pending" value="12" description="Awaiting settlement" />
          </div>
        </section>

        {/* Transactions table placeholder */}
        <section aria-labelledby="transactions-heading">
          <h2 id="transactions-heading" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Recent Transactions
          </h2>
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
              aria-label="Recent transactions"
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
                {MOCK_TRANSACTIONS.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    style={{
                      borderBottom: idx < MOCK_TRANSACTIONS.length - 1
                        ? '1px solid var(--pp-border, #e2e8f0)'
                        : 'none',
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{tx.id}</td>
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
        </section>
      </main>
    </div>
  );
}
