import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

const STATUS_CLASS: Record<string, string> = {
  completed: 'txn-status--completed',
  pending: 'txn-status--pending',
  failed: 'txn-status--failed',
};

function Table() {
  const { useTransactions } = require('../hooks/useTransactions');
  const { result, loading, error, page, sortBy, sortDir, setPage, setSort } = useTransactions();

  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 1;

  function SortIcon({ field }: { field: string }) {
    if (field !== sortBy) return <span className="txn-sort-icon txn-sort-icon--inactive">↕</span>;
    return <span className="txn-sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  function Th({ field, children }: { field: Parameters<typeof setSort>[0]; children: React.ReactNode }) {
    return (
      <th>
        <button className="txn-th-btn" onClick={() => setSort(field)} aria-sort={
          sortBy === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
        }>
          {children} <SortIcon field={field} />
        </button>
      </th>
    );
  }

  return (
    <div className="txn-wrap">
      {error && <p className="txn-error" role="alert">⚠ {error}</p>}

      <div className="txn-table-wrap">
        <table className="txn-table" aria-label="Transaction history" aria-busy={loading}>
          <thead>
            <tr>
              <th>ID</th>
              <Th field="date">Date</Th>
              <Th field="amount">Amount</Th>
              <th>Description</th>
              <Th field="status">Status</Th>
            </tr>
          </thead>
          <tbody>
            {loading && !result ? (
              <tr><td colSpan={5} className="txn-loading">Loading…</td></tr>
            ) : result?.data.length === 0 ? (
              <tr><td colSpan={5} className="txn-empty">No transactions found.</td></tr>
            ) : (
              result?.data.map((txn) => (
                <tr key={txn.id} className={loading ? 'txn-row--stale' : ''}>
                  <td className="txn-id">{txn.id}</td>
                  <td>{new Date(txn.date).toLocaleString()}</td>
                  <td className="txn-amount">
                    {txn.amount.toLocaleString(undefined, { style: 'currency', currency: txn.currency })}
                  </td>
                  <td>{txn.description}</td>
                  <td>
                    <span className={`txn-status ${STATUS_CLASS[txn.status] ?? ''}`}>
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="txn-pagination" role="navigation" aria-label="Pagination">
        <button
          className="button button--secondary button--sm"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1 || loading}
        >
          ← Prev
        </button>
        <span className="txn-page-info">
          Page {page}{result ? ` of ${totalPages}` : ''}{' '}
          {result && <span className="txn-total">({result.total} total)</span>}
        </span>
        <button
          className="button button--secondary button--sm"
          onClick={() => setPage(page + 1)}
          disabled={!result || page >= totalPages || loading}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default function TransactionTable(): React.JSX.Element {
  return (
    <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading transactions…</p>}>
      {() => <Table />}
    </BrowserOnly>
  );
}
