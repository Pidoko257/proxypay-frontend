import React, { useMemo, useState } from 'react';
import Layout from '@theme/Layout';
import { filterTransactions } from '../utils/transactionSearch';
import { transactions } from '../data/transactions';

export default function DashboardPage(): React.JSX.Element {
  const [query, setQuery] = useState('');
  const filteredTransactions = useMemo(() => filterTransactions(transactions, query), [query]);

  return (
    <Layout title="Transaction Dashboard" description="ProxyPay transaction dashboard">
      <main className="dashboard">
        <div className="dashboard__header">
          <div>
            <p className="dashboard__eyebrow">ProxyPay</p>
            <h1>Transaction dashboard</h1>
            <p>Search and monitor your recent transactions.</p>
          </div>
          <a className="button button--secondary" href="/api">API reference</a>
        </div>
        <section className="dashboard__panel" aria-labelledby="transaction-search-title">
          <h2 id="transaction-search-title">Transactions</h2>
          <label htmlFor="transaction-query">Search transactions</label>
          <input
            id="transaction-query"
            className="dashboard__search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try: Completed AND Amina, or NOT Failed"
          />
          <p className="dashboard__hint">Use AND, OR, NOT, and parentheses to combine terms.</p>
          <div className="dashboard__table-wrap">
            <table className="dashboard__table">
              <thead><tr><th>ID</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.id}</td><td>{transaction.customer}</td>
                    <td>${transaction.amount.toLocaleString()}</td>
                    <td><span className={`dashboard__status dashboard__status--${transaction.status.toLowerCase()}`}>{transaction.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTransactions.length === 0 && <p className="dashboard__empty">No transactions match this query.</p>}
          </div>
        </section>
      </main>
    </Layout>
  );
}
