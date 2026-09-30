import React from 'react';
import { RateLimitInfo, getRateLimitStatus } from '../hooks/useRateLimitMonitor';
import styles from './RateLimitWarningToast.module.css';

interface RateLimitWarningToastProps {
  rateLimitInfo: RateLimitInfo | null;
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Toast notification for rate limit warnings
 * Appears at top of screen when approaching or critical limits
 */
export const RateLimitWarningToast: React.FC<RateLimitWarningToastProps> = ({
  rateLimitInfo,
  visible,
  onDismiss,
}) => {
  if (!visible || !rateLimitInfo) {
    return null;
  }

  const status = getRateLimitStatus(rateLimitInfo);
  
  if (status === 'ok') {
    return null;
  }

  return (
    <div className={`${styles.toast} ${styles[status]}`}>
      <div className={styles.content}>
        <div className={styles.icon}>
          {status === 'critical' && '🔴'}
          {status === 'warning' && '🟡'}
        </div>
        <div className={styles.message}>
          <div className={styles.title}>
            {status === 'critical' && 'Critical: API Rate Limit'}
            {status === 'warning' && 'Warning: API Rate Limit Approaching'}
          </div>
          <div className={styles.details}>
            {rateLimitInfo.remaining} of {rateLimitInfo.limit} requests remaining
            ({rateLimitInfo.percentageUsed}% used) • Resets in {rateLimitInfo.formattedReset}
          </div>
        </div>
      </div>
      <button
        type="button"
        className={styles.closeButton}
        onClick={onDismiss}
        aria-label="Dismiss rate limit warning"
      >
        ✕
      </button>
    </div>
  );
};

export default RateLimitWarningToast;
