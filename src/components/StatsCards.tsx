import React, { useState, useEffect, useCallback } from 'react';
import Skeleton from './Skeleton';

interface StatsData {
  totalTransactions: number;
  totalVolume: number;
  successRate: number;
  activeUsers: number;
}

export default function StatsCards(): React.JSX.Element {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1200));

      const mockStats: StatsData = {
        totalTransactions: 1547,
        totalVolume: 8924500,
        successRate: 98.5,
        activeUsers: 342,
      };

      setStats(mockStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    icon,
    color,
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color: string;
  }) => (
    <div className="stat-card" style={{ borderTopColor: color }}>
      <div className="stat-icon" style={{ backgroundColor: color + '20', color }}>
        {icon}
      </div>
      <div className="stat-content">
        <h4 className="stat-title">{title}</h4>
        <p className="stat-value">{value}</p>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className="stats-cards-container">
      <div className="stats-header">
        <h3>Dashboard Overview</h3>
        <button
          onClick={fetchStats}
          className="refresh-stats-button"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {isLoading && !stats ? (
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card skeleton-card">
              <div className="stat-icon-skeleton">
                <Skeleton variant="circular" width="48px" height="48px" />
              </div>
              <div className="stat-content">
                <Skeleton variant="text" width="120px" height="16px" />
                <Skeleton variant="text" width="80px" height="24px" style={{ marginTop: '8px' }} />
                <Skeleton variant="text" width="100px" height="14px" style={{ marginTop: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="stats-error">
          <p>{error}</p>
          <button onClick={fetchStats} className="retry-button">
            Retry
          </button>
        </div>
      ) : stats ? (
        <div className="stats-grid">
          <StatCard
            title="Total Transactions"
            value={stats.totalTransactions.toLocaleString()}
            subtitle="Last 30 days"
            icon="📊"
            color="#3b82f6"
          />
          <StatCard
            title="Total Volume"
            value={formatCurrency(stats.totalVolume)}
            subtitle="Processed amount"
            icon="💰"
            color="#10b981"
          />
          <StatCard
            title="Success Rate"
            value={`${stats.successRate}%`}
            subtitle="Transaction success"
            icon="✅"
            color="#8b5cf6"
          />
          <StatCard
            title="Active Users"
            value={stats.activeUsers.toLocaleString()}
            subtitle="Currently active"
            icon="👥"
            color="#f59e0b"
          />
        </div>
      ) : null}
    </div>
  );
}
