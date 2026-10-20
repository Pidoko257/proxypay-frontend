/**
 * Transactions page — /transactions (Issue #634)
 *
 * Lists all sample transactions. Clicking a transaction expands it
 * to reveal the TransactionComments panel.
 */

import React, { useState } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { transactions } from '../data/transactions';
import TransactionComments from '../components/TransactionComments';

export default function TransactionsPage(): React.JSX.Element {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleExpand(id: string): void {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function statusClass(status: string): string {
    switch (status) {
      case 'Completed':
        return 'tx-page-badge tx-page-badge--completed';
      case 'Failed':
        return 'tx-page-badge tx-page-badge--failed';
      case 'Processing':
        return 'tx-page-badge tx-page-badge--processing';
      default:
        return 'tx-page-badge';
    }
  }

  return (
    <Layout
      title="Transactions"
      description="Browse and annotate ProxyPay transactions"
    >
      <main className="tx-page-main">
        <div className="tx-page-header">
          <h1 className="tx-page-title">Transactions</h1>
          <p className="tx-page-subtitle">
            Click a transaction to expand comments and annotations.
          </p>
        </div>

        <div className="tx-page-list">
          {transactions.map((tx) => {
            const isExpanded = expandedId === tx.id;
            return (
              <div
                key={tx.id}
                className={`tx-page-card${isExpanded ? ' tx-page-card--expanded' : ''}`}
              >
                {/* Row summary — always visible */}
                <button
                  className="tx-page-card-summary"
                  onClick={() => toggleExpand(tx.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`tx-comments-${tx.id}`}
                >
                  <span className="tx-page-id">{tx.id}</span>
                  <span className="tx-page-customer">{tx.customer}</span>
                  <span className="tx-page-amount">
                    ${tx.amount.toLocaleString()}
                  </span>
                  <span className={statusClass(tx.status)}>{tx.status}</span>
                  <span className="tx-page-date">{tx.createdAt}</span>
                  <span className="tx-page-chevron" aria-hidden="true">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </button>

                {/* Expandable comments section */}
                {isExpanded && (
                  <div
                    id={`tx-comments-${tx.id}`}
                    className="tx-page-comments-panel"
                  >
                    <div className="tx-page-comments-meta">
                      <dl className="tx-page-details">
                        <dt>Processing time</dt>
                        <dd>{tx.processingTimeMs.toLocaleString()} ms</dd>
                        <dt>Date</dt>
                        <dd>{tx.createdAt}</dd>
                      </dl>
                    </div>
                    <h3 className="tx-page-comments-heading">Comments</h3>
                    <BrowserOnly fallback={<p>Loading comments…</p>}>
                      {() => <TransactionComments transactionId={tx.id} />}
                    </BrowserOnly>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </Layout>
  );
}
