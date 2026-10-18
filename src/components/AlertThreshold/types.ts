export type AlertLevel = 'ok' | 'warning' | 'critical';

export interface MetricThreshold {
  metricKey: string;
  label: string;
  warningValue: number;
  criticalValue: number;
  /** Higher values are worse (e.g. error rate). Default: true */
  higherIsBad?: boolean;
  unit?: string;
}

export interface ThresholdViolation {
  timestamp: string;
  metricKey: string;
  metricLabel: string;
  currentValue: number;
  threshold: number;
  level: 'warning' | 'critical';
}

export interface AlertStatus {
  level: AlertLevel;
  violations: ThresholdViolation[];
}

export const THRESHOLDS_STORAGE_KEY = 'proxypay_alert_thresholds';
export const VIOLATIONS_LOG_KEY = 'proxypay_threshold_violations';

export const DEFAULT_THRESHOLDS: MetricThreshold[] = [
  {
    metricKey: 'errorRate',
    label: 'Error Rate',
    warningValue: 5,
    criticalValue: 10,
    higherIsBad: true,
    unit: '%',
  },
  {
    metricKey: 'avgLatencyMs',
    label: 'Average Latency',
    warningValue: 1000,
    criticalValue: 3000,
    higherIsBad: true,
    unit: 'ms',
  },
  {
    metricKey: 'txnSuccessRate',
    label: 'Transaction Success Rate',
    warningValue: 95,
    criticalValue: 90,
    higherIsBad: false,
    unit: '%',
  },
  {
    metricKey: 'pendingTxns',
    label: 'Pending Transactions',
    warningValue: 100,
    criticalValue: 500,
    higherIsBad: true,
    unit: '',
  },
];
