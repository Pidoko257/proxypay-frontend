import React, { useState, useMemo } from 'react';
import styles from './CostCalculator.module.css';

interface CostBreakdown {
  baseCost: number;
  dataTransferCost: number;
  totalMonthlyCost: number;
  totalYearlyCost: number;
}

const PRICING = {
  perRequest: 0.0001, // $0.0001 per request
  perGbData: 0.12, // $0.12 per GB of data transfer
};

export default function CostCalculator(): React.JSX.Element {
  const [monthlyRequests, setMonthlyRequests] = useState<number>(10000);
  const [monthlyDataGb, setMonthlyDataGb] = useState<number>(50);
  const [includeAuth, setIncludeAuth] = useState<boolean>(true);

  const costs = useMemo((): CostBreakdown => {
    const baseCost = monthlyRequests * PRICING.perRequest;
    const dataTransferCost = monthlyDataGb * PRICING.perGbData;
    const totalMonthlyCost = baseCost + dataTransferCost;
    const authAddon = includeAuth ? totalMonthlyCost * 0.1 : 0; // 10% auth overhead

    return {
      baseCost,
      dataTransferCost,
      totalMonthlyCost: totalMonthlyCost + authAddon,
      totalYearlyCost: (totalMonthlyCost + authAddon) * 12,
    };
  }, [monthlyRequests, monthlyDataGb, includeAuth]);

  const handleRequestsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setMonthlyRequests(Math.max(0, value));
  };

  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setMonthlyDataGb(Math.max(0, value));
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className={styles.calculator}>
      <div className={styles.container}>
        <h2>API Cost Calculator</h2>
        <p className={styles.description}>
          Estimate your monthly costs based on expected API usage and data transfer.
        </p>

        <div className={styles.inputSection}>
          <div className={styles.inputGroup}>
            <label htmlFor="requests">
              Monthly API Requests
              <span className={styles.value}>{formatNumber(monthlyRequests)}</span>
            </label>
            <input
              id="requests"
              type="number"
              min="0"
              step="1000"
              value={monthlyRequests}
              onChange={handleRequestsChange}
              className={styles.slider}
            />
            <div className={styles.hint}>
              <code>${PRICING.perRequest}/request</code>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="data">
              Monthly Data Transfer (GB)
              <span className={styles.value}>{formatNumber(monthlyDataGb)}</span>
            </label>
            <input
              id="data"
              type="number"
              min="0"
              step="10"
              value={monthlyDataGb}
              onChange={handleDataChange}
              className={styles.slider}
            />
            <div className={styles.hint}>
              <code>${PRICING.perGbData}/GB</code>
            </div>
          </div>

          <div className={styles.checkboxGroup}>
            <input
              id="auth"
              type="checkbox"
              checked={includeAuth}
              onChange={(e) => setIncludeAuth(e.target.checked)}
            />
            <label htmlFor="auth">Include authentication/security overhead (+10%)</label>
          </div>
        </div>

        <div className={styles.costBreakdown}>
          <div className={styles.costRow}>
            <div className={styles.costLabel}>API Requests:</div>
            <div className={styles.costValue}>{formatCurrency(costs.baseCost)}</div>
          </div>
          <div className={styles.costRow}>
            <div className={styles.costLabel}>Data Transfer:</div>
            <div className={styles.costValue}>{formatCurrency(costs.dataTransferCost)}</div>
          </div>
          {includeAuth && (
            <div className={styles.costRow}>
              <div className={styles.costLabel}>Auth/Security (10%):</div>
              <div className={styles.costValue}>
                {formatCurrency(costs.totalMonthlyCost - costs.baseCost - costs.dataTransferCost)}
              </div>
            </div>
          )}
          <div className={`${styles.costRow} ${styles.total}`}>
            <div className={styles.costLabel}>Monthly Total:</div>
            <div className={styles.costValue}>{formatCurrency(costs.totalMonthlyCost)}</div>
          </div>
          <div className={`${styles.costRow} ${styles.yearly}`}>
            <div className={styles.costLabel}>Annual Total:</div>
            <div className={styles.costValue}>{formatCurrency(costs.totalYearlyCost)}</div>
          </div>
        </div>

        <div className={styles.disclaimer}>
          <p>
            <strong>Note:</strong> This calculator provides estimates based on standard pricing.
            For custom pricing or volume discounts, please contact our sales team.
          </p>
        </div>
      </div>
    </div>
  );
}
