import React, { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';
import { WebhooksIllustration } from './EmptyStateIllustrations';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
  createdAt: number;
}

interface WebhookTableProps {
  filter?: string;
}

export default function WebhookTable({ filter }: WebhookTableProps): React.JSX.Element {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockWebhooks: Webhook[] = [
        {
          id: 'WH001',
          url: 'https://example.com/webhooks/payment',
          events: ['payment.completed', 'payment.failed'],
          status: 'active',
          createdAt: Date.now() - 86400000,
        },
        {
          id: 'WH002',
          url: 'https://example.com/webhooks/transaction',
          events: ['transaction.created'],
          status: 'active',
          createdAt: Date.now() - 172800000,
        },
      ];

      // Apply filter if provided
      const filteredWebhooks = filter
        ? mockWebhooks.filter(webhook =>
            webhook.url.toLowerCase().includes(filter.toLowerCase()) ||
            webhook.id.toLowerCase().includes(filter.toLowerCase())
          )
        : mockWebhooks;

      setWebhooks(filteredWebhooks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhooks');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const getStatusColor = (status: Webhook['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'inactive':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <div className="webhook-table-container">
      <div className="table-header">
        <h3>Webhooks</h3>
        <button
          onClick={fetchWebhooks}
          className="refresh-button"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {isLoading && webhooks.length === 0 ? (
        <div className="table-skeleton">
          <div className="table-row table-header-row">
            <Skeleton variant="text" width="80px" />
            <Skeleton variant="text" width="200px" />
            <Skeleton variant="text" width="150px" />
            <Skeleton variant="text" width="80px" />
            <Skeleton variant="text" width="100px" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="table-row">
              <Skeleton variant="text" width="80px" />
              <Skeleton variant="text" width="200px" />
              <Skeleton variant="text" width="150px" />
              <Skeleton variant="text" width="80px" />
              <Skeleton variant="text" width="100px" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="table-error">
          <p>{error}</p>
          <button onClick={fetchWebhooks} className="retry-button">
            Retry
          </button>
        </div>
      ) : webhooks.length === 0 ? (
        <EmptyState
          illustration={<WebhooksIllustration />}
          title="No webhooks configured"
          message="Set up webhooks to receive real-time notifications for important events."
          action={{
            label: 'Create Webhook',
            onClick: () => console.log('Navigate to create webhook'),
            variant: 'primary',
          }}
        />
      ) : (
        <div className="table-wrapper">
          <table className="webhook-table">
            <thead>
              <tr className="table-header-row">
                <th>ID</th>
                <th>URL</th>
                <th>Events</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((webhook) => (
                <tr key={webhook.id} className="table-row">
                  <td className="webhook-id">{webhook.id}</td>
                  <td className="webhook-url">{webhook.url}</td>
                  <td className="webhook-events">
                    {webhook.events.map((event, idx) => (
                      <span key={idx} className="event-tag">
                        {event}
                      </span>
                    ))}
                  </td>
                  <td className={clsx('webhook-status', getStatusColor(webhook.status))}>
                    {webhook.status}
                  </td>
                  <td className="webhook-date">{formatTimestamp(webhook.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
