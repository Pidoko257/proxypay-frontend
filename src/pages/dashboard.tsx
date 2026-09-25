import React, { useMemo, useState } from 'react';
import Layout from '@theme/Layout';
import { filterTransactions } from '../utils/transactionSearch';
import { transactions } from '../data/transactions';
import { dashboardMessages, type DashboardLocale } from '../i18n/dashboard';

export default function DashboardPage(): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [locale, setLocale] = useState<DashboardLocale>('en');
  const messages = dashboardMessages[locale];
  const filteredTransactions = useMemo(() => filterTransactions(transactions, query), [query]);

  return (
    <Layout title="Transaction Dashboard" description="ProxyPay transaction dashboard">
      <main className="dashboard">
        <div className="dashboard__header">
          <div>
            <p className="dashboard__eyebrow">{messages.eyebrow}</p>
            <h1>{messages.title}</h1>
            <p>{messages.description}</p>
          </div>
          <div className="dashboard__actions">
            <label htmlFor="dashboard-language">{messages.language}</label>
            <select id="dashboard-language" value={locale} onChange={(event) => setLocale(event.target.value as DashboardLocale)}>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
            <a className="button button--secondary" href="/api">{messages.apiReference}</a>
          </div>
        </div>
        <section className="dashboard__panel" aria-labelledby="transaction-search-title">
          <h2 id="transaction-search-title">{messages.transactions}</h2>
          <label htmlFor="transaction-query">{messages.searchLabel}</label>
          <input
            id="transaction-query"
            className="dashboard__search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={messages.searchPlaceholder}
          />
          <p className="dashboard__hint">{messages.searchHint}</p>
          <div className="dashboard__table-wrap">
            <table className="dashboard__table">
              <thead><tr><th>{messages.id}</th><th>{messages.customer}</th><th>{messages.amount}</th><th>{messages.status}</th></tr></thead>
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
            {filteredTransactions.length === 0 && <p className="dashboard__empty">{messages.noResults}</p>}
          </div>
        </section>
      </main>
    </Layout>
  );
}
