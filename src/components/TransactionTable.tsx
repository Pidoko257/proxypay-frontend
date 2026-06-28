import React, { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import Skeleton from './Skeleton';

interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: number;
  currency: string;
  recipient: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
}

interface TransactionTableProps {
  filter?: string;
}

export default function TransactionTable({ filter }: TransactionTableProps): React.JSX.Element {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockTransactions: Transaction[] = [
        {
          id: 'TXN001',
          type: 'send',
          amount: 5000,
          currency: 'XAF',
          recipient: '+237 671 234 567',
          status: 'completed',
          timestamp: Date.now() - 3600000,
        },
        {
          id: 'TXN002',
          type: 'receive',
          amount: 10000,
          currency: 'XAF',
          recipient: '+237 698 765 432',
          status: 'completed',
          timestamp: Date.now() - 7200000,
        },
        {
          id: 'TXN003',
          type: 'send',
          amount: 2500,
          currency: 'XAF',
          recipient: '+237 655 123 789',
          status: 'pending',
          timestamp: Date.now() - 10800000,
        },
        {
          id: 'TXN004',
          type: 'send',
          amount: 15.5,
          currency: 'XLM',
          recipient: 'GABC...XYZ',
          status: 'failed',
          timestamp: Date.now() - 14400000,
        },
        {
          id: 'TXN005',
          type: 'receive',
          amount: 7500,
          currency: 'XAF',
          recipient: '+237 677 987 654',
          status: 'completed',
          timestamp: Date.now() - 18000000,
        },
      ];

      // Apply filter if provided
      const filteredTransactions = filter
        ? mockTransactions.filter(tx =>
            tx.recipient.toLowerCase().includes(filter.toLowerCase()) ||
            tx.id.toLowerCase().includes(filter.toLowerCase())
          )
        : mockTransactions;

      setTransactions(filteredTransactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="transaction-table-container">
      <div className="table-header">
        <h3>Recent Transactions</h3>
        <button
          onClick={fetchTransactions}
          className="refresh-button"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {isLoading && transactions.length === 0 ? (
        <div className="table-skeleton">
          <div className="table-row table-header-row">
            <Skeleton variant="text" width="80px" />
            <Skeleton variant="text" width="60px" />
            <Skeleton variant="text" width="100px" />
            <Skeleton variant="text" width="120px" />
            <Skeleton variant="text" width="80px" />
            <Skeleton variant="text" width="100px" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="table-row">
              <Skeleton variant="text" width="80px" />
              <Skeleton variant="text" width="60px" />
              <Skeleton variant="text" width="100px" />
              <Skeleton variant="text" width="120px" />
              <Skeleton variant="text" width="80px" />
              <Skeleton variant="text" width="100px" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="table-error">
          <p>{error}</p>
          <button onClick={fetchTransactions} className="retry-button">
            Retry
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="table-empty">
          <p>No transactions found</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="transaction-table">
            <thead>
              <tr className="table-header-row">
                <th>ID</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Recipient</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="table-row">
                  <td className="transaction-id">{transaction.id}</td>
                  <td className={clsx('transaction-type', `type-${transaction.type}`)}>
                    {transaction.type === 'send' ? '↑ Send' : '↓ Receive'}
                  </td>
                  <td className="transaction-amount">
                    {transaction.amount.toFixed(2)} {transaction.currency}
                  </td>
                  <td className="transaction-recipient">{transaction.recipient}</td>
                  <td className={clsx('transaction-status', getStatusColor(transaction.status))}>
                    {transaction.status}
                  </td>
                  <td className="transaction-date">{formatTimestamp(transaction.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
