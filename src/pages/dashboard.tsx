import React, { useState } from 'react';
import Layout from '@theme/Layout';
import StatsCards from '../components/StatsCards';
import TransactionTable from '../components/TransactionTable';
import ExchangeRateWidget from '../components/ExchangeRateWidget';

export default function Dashboard(): React.JSX.Element {
  const [filter, setFilter] = useState('');

  return (
    <Layout title="Dashboard" description="ProxyPay Dashboard">
      <main style={{ padding: '2rem 1.5rem', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#111827' }}>
            Dashboard
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            Monitor your transactions, exchange rates, and platform statistics
          </p>
        </div>

        <StatsCards />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
          <div>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Transactions</h2>
              <input
                type="text"
                placeholder="Search transactions..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  width: '250px',
                }}
              />
            </div>
            <TransactionTable filter={filter} />
          </div>

          <div>
            <ExchangeRateWidget />
          </div>
        </div>
      </main>
    </Layout>
  );
}
