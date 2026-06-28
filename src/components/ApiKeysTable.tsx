import React, { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';
import { ApiKeysIllustration } from './EmptyStateIllustrations';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  scopes: string[];
  status: 'active' | 'revoked';
  createdAt: number;
  lastUsed?: number;
}

interface ApiKeysTableProps {
  filter?: string;
}

export default function ApiKeysTable({ filter }: ApiKeysTableProps): React.JSX.Element {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApiKeys = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockApiKeys: ApiKey[] = [
        {
          id: 'AK001',
          name: 'Production Key',
          key: 'pk_live_1234567890abcdef',
          scopes: ['payments', 'transactions', 'webhooks'],
          status: 'active',
          createdAt: Date.now() - 2592000000,
          lastUsed: Date.now() - 86400000,
        },
        {
          id: 'AK002',
          name: 'Test Key',
          key: 'pk_test_0987654321fedcba',
          scopes: ['payments'],
          status: 'active',
          createdAt: Date.now() - 5184000000,
          lastUsed: Date.now() - 172800000,
        },
      ];

      // Apply filter if provided
      const filteredApiKeys = filter
        ? mockApiKeys.filter(key =>
            key.name.toLowerCase().includes(filter.toLowerCase()) ||
            key.id.toLowerCase().includes(filter.toLowerCase())
          )
        : mockApiKeys;

      setApiKeys(filteredApiKeys);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const getStatusColor = (status: ApiKey['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'revoked':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const maskKey = (key: string) => {
    return key.slice(0, 8) + '...' + key.slice(-4);
  };

  return (
    <div className="api-keys-table-container">
      <div className="table-header">
        <h3>API Keys</h3>
        <button
          onClick={fetchApiKeys}
          className="refresh-button"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {isLoading && apiKeys.length === 0 ? (
        <div className="table-skeleton">
          <div className="table-row table-header-row">
            <Skeleton variant="text" width="80px" />
            <Skeleton variant="text" width="150px" />
            <Skeleton variant="text" width="120px" />
            <Skeleton variant="text" width="150px" />
            <Skeleton variant="text" width="80px" />
            <Skeleton variant="text" width="100px" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="table-row">
              <Skeleton variant="text" width="80px" />
              <Skeleton variant="text" width="150px" />
              <Skeleton variant="text" width="120px" />
              <Skeleton variant="text" width="150px" />
              <Skeleton variant="text" width="80px" />
              <Skeleton variant="text" width="100px" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="table-error">
          <p>{error}</p>
          <button onClick={fetchApiKeys} className="retry-button">
            Retry
          </button>
        </div>
      ) : apiKeys.length === 0 ? (
        <EmptyState
          illustration={<ApiKeysIllustration />}
          title="No API keys yet"
          message="Generate API keys to authenticate your applications and access ProxyPay services."
          action={{
            label: 'Generate API Key',
            onClick: () => console.log('Navigate to generate API key'),
            variant: 'primary',
          }}
        />
      ) : (
        <div className="table-wrapper">
          <table className="api-keys-table">
            <thead>
              <tr className="table-header-row">
                <th>ID</th>
                <th>Name</th>
                <th>Key</th>
                <th>Scopes</th>
                <th>Status</th>
                <th>Last Used</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((apiKey) => (
                <tr key={apiKey.id} className="table-row">
                  <td className="api-key-id">{apiKey.id}</td>
                  <td className="api-key-name">{apiKey.name}</td>
                  <td className="api-key-value">
                    <code>{maskKey(apiKey.key)}</code>
                  </td>
                  <td className="api-key-scopes">
                    {apiKey.scopes.map((scope, idx) => (
                      <span key={idx} className="scope-tag">
                        {scope}
                      </span>
                    ))}
                  </td>
                  <td className={clsx('api-key-status', getStatusColor(apiKey.status))}>
                    {apiKey.status}
                  </td>
                  <td className="api-key-last-used">
                    {apiKey.lastUsed ? formatTimestamp(apiKey.lastUsed) : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
