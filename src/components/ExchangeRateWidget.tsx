import React, { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import Skeleton from './Skeleton';

interface ExchangeRate {
  xlmUsd: number;
  xlmXaf: number;
  timestamp: number;
}

interface RateDisplayProps {
  label: string;
  value: number;
  previousValue: number;
  isStale: boolean;
}

function RateDisplay({ label, value, previousValue, isStale }: RateDisplayProps) {
  const trend = value > previousValue ? 'up' : value < previousValue ? 'down' : 'neutral';
  
  return (
    <div className="rate-display">
      <span className="rate-label">{label}</span>
      <span className={clsx('rate-value', { 'rate-stale': isStale })}>
        {value.toFixed(4)}
      </span>
      <span className={clsx('rate-trend', `trend-${trend}`)}>
        {trend === 'up' && '↑'}
        {trend === 'down' && '↓'}
        {trend === 'neutral' && '→'}
      </span>
    </div>
  );
}

export default function ExchangeRateWidget(): React.JSX.Element {
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [previousRate, setPreviousRate] = useState<ExchangeRate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchExchangeRate = useCallback(async () => {
    try {
      // Using CoinGecko API for XLM rates (free, no API key required)
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd,xaf'
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rate');
      }

      const data = await response.json();
      const newRate: ExchangeRate = {
        xlmUsd: data.stellar.usd,
        xlmXaf: data.stellar.xaf,
        timestamp: Date.now(),
      };

      setPreviousRate(rate);
      setRate(newRate);
      setError(null);
      setIsStale(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Mark as stale if we have previous data
      if (rate) {
        setIsStale(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [rate]);

  useEffect(() => {
    // Initial fetch
    fetchExchangeRate();

    // Set up polling every 30 seconds
    const interval = setInterval(() => {
      fetchExchangeRate();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchExchangeRate]);

  // Calculate XAF rate from USD if not directly available (fallback)
  const xlmXaf = rate?.xlmXaf || (rate?.xlmUsd ? rate.xlmUsd * 600 : 0); // Approximate conversion
  const previousXlmXaf = previousRate?.xlmXaf || (previousRate?.xlmUsd ? previousRate.xlmUsd * 600 : 0);

  return (
    <div className="exchange-rate-widget">
      <div className="widget-header">
        <h3>Live Exchange Rates</h3>
        <span className={clsx('status-indicator', { 'status-error': error, 'status-stale': isStale })}>
          {isLoading && 'Loading...'}
          {error && isStale && 'Stale'}
          {!isLoading && !error && 'Live'}
        </span>
      </div>
      
      {isLoading && !rate && (
        <div className="widget-content">
          <div className="rate-display">
            <Skeleton variant="text" width="80px" />
            <Skeleton variant="text" width="100px" />
            <Skeleton variant="circular" width="24px" height="24px" />
          </div>
          <div className="rate-display">
            <Skeleton variant="text" width="80px" />
            <Skeleton variant="text" width="100px" />
            <Skeleton variant="circular" width="24px" height="24px" />
          </div>
          <div className="widget-footer">
            <Skeleton variant="text" width="150px" />
          </div>
        </div>
      )}
      
      {error && !rate && (
        <div className="widget-error">
          <p>Unable to load exchange rates</p>
          <button onClick={fetchExchangeRate} className="retry-button">
            Retry
          </button>
        </div>
      )}
      
      {rate && (
        <div className="widget-content">
          <RateDisplay
            label="XLM/USD"
            value={rate.xlmUsd}
            previousValue={previousRate?.xlmUsd || rate.xlmUsd}
            isStale={isStale}
          />
          <RateDisplay
            label="XLM/XAF"
            value={xlmXaf}
            previousValue={previousXlmXaf || xlmXaf}
            isStale={isStale}
          />
          <div className="widget-footer">
            <span className="last-updated">
              Updated: {new Date(rate.timestamp).toLocaleTimeString()}
            </span>
            {isStale && (
              <span className="stale-warning">⚠️ Data may be outdated</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
