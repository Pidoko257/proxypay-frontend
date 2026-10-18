import React from 'react';
import { RateLimitInfo, getRateLimitStatus, formatRateLimitDisplay } from '../hooks/useRateLimitMonitor';
import styles from './RateLimitIndicator.module.css';

interface RateLimitIndicatorProps {
  rateLimitInfo: RateLimitInfo | null;
  showLabel?: boolean;
  compact?: boolean;
}

/**
 * Component to display API rate limit status
 * Shows remaining requests, percentage bar, and reset time
 */
export const RateLimitIndicator: React.FC<RateLimitIndicatorProps> = ({
  rateLimitInfo,
  showLabel = true,
  compact = false,
}) => {
  if (!rateLimitInfo) {
    return null;
  }

  const status = getRateLimitStatus(rateLimitInfo);
  const percentageUsed = rateLimitInfo.percentageUsed;

  if (compact) {
    return (
      <div className={`${styles.compact} ${styles[status]}`}>
        <span className={styles.indicator} />
        <span className={styles.text}>
          {rateLimitInfo.remaining}/{rateLimitInfo.limit}
        </span>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${styles[status]}`}>
      <div className={styles.header}>
        <div className={styles.title}>
          <span className={styles.label}>API Rate Limit</span>
          <span className={`${styles.status} ${styles[status]}`}>
            {status === 'critical' && '🔴 Critical'}
            {status === 'warning' && '🟡 Approaching'}
            {status === 'ok' && '🟢 OK'}
          </span>
        </div>
      </div>

      <div className={styles.content}>
        {/* Progress bar */}
        <div className={styles.progressContainer}>
          <div
            className={`${styles.progressBar} ${styles[status]}`}
            style={{ width: `${percentageUsed}%` }}
            role="progressbar"
            aria-valuenow={percentageUsed}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`API rate limit usage: ${percentageUsed}%`}
          />
        </div>

        {/* Stats grid */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Requests Remaining</div>
            <div className={styles.statValue}>{rateLimitInfo.remaining}</div>
            <div className={styles.statContext}>of {rateLimitInfo.limit}</div>
          </div>

          <div className={styles.stat}>
            <div className={styles.statLabel}>Usage</div>
            <div className={styles.statValue}>{percentageUsed}%</div>
            <div className={styles.statContext}>{rateLimitInfo.used} used</div>
          </div>

          <div className={styles.stat}>
            <div className={styles.statLabel}>Resets In</div>
            <div className={styles.statValue}>{rateLimitInfo.formattedReset}</div>
            <div className={styles.statContext}>
              {new Date(rateLimitInfo.reset * 1000).toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Status message */}
        {status !== 'ok' && (
          <div className={`${styles.message} ${styles[status]}`}>
            {status === 'critical' && (
              <>
                <strong>⚠️ Critical Rate Limit:</strong> You are approaching your API rate limit.
                To avoid service interruption, reduce API calls or upgrade your plan.
              </>
            )}
            {status === 'warning' && (
              <>
                <strong>⚠️ Rate Limit Warning:</strong> You have used 80% or more of your API quota.
                Consider reducing API calls to avoid reaching the limit.
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RateLimitIndicator;
