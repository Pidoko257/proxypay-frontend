/**
 * Pure anomaly-detection helpers for the Advanced Logs Dashboard.
 * JSX-free so they can be unit-tested in isolation.
 */

export type DashboardTab = 'overview' | 'endpoints' | 'errors' | 'usage' | 'users';

export type AnomalySeverity = 'warning' | 'critical';

export interface Anomaly {
  id: string;
  tab: DashboardTab;
  severity: AnomalySeverity;
  metric: string;
  message: string;
  value: number;
  threshold: number;
}

export interface AnomalyThresholds {
  /** Absolute error-rate percentage that is always considered critical. */
  errorRateCritical: number;
  /** Absolute error-rate percentage that raises a warning. */
  errorRateWarning: number;
  /** Multiplier of the historical p95 baseline that flags a latency spike. */
  p95SpikeFactor: number;
  /** Multiplier of the mean hourly volume that flags a traffic spike. */
  hourlyVolumeSpikeFactor: number;
}

export const DEFAULT_THRESHOLDS: AnomalyThresholds = {
  errorRateCritical: 10,
  errorRateWarning: 5,
  p95SpikeFactor: 2,
  hourlyVolumeSpikeFactor: 3,
};

interface UsagePoint {
  hour: number;
  count: number;
  errorRate: number;
}

export interface AnomalyInput {
  errorRate: number;
  p95ResponseTime: number;
  /** Rolling p95 the dashboard considers "normal" (e.g. from initialAnalytics). */
  baselineP95?: number;
  usageByHour?: UsagePoint[];
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Detect anomalies in the current analytics snapshot. */
export function detectAnomalies(
  input: AnomalyInput,
  thresholds: AnomalyThresholds = DEFAULT_THRESHOLDS,
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Error-rate spike
  if (input.errorRate >= thresholds.errorRateCritical) {
    anomalies.push({
      id: 'error-rate-critical',
      tab: 'errors',
      severity: 'critical',
      metric: 'errorRate',
      message: `Error rate ${input.errorRate.toFixed(2)}% exceeds critical threshold of ${thresholds.errorRateCritical}%`,
      value: input.errorRate,
      threshold: thresholds.errorRateCritical,
    });
  } else if (input.errorRate >= thresholds.errorRateWarning) {
    anomalies.push({
      id: 'error-rate-warning',
      tab: 'errors',
      severity: 'warning',
      metric: 'errorRate',
      message: `Error rate ${input.errorRate.toFixed(2)}% exceeds warning threshold of ${thresholds.errorRateWarning}%`,
      value: input.errorRate,
      threshold: thresholds.errorRateWarning,
    });
  }

  // P95 latency spike vs. baseline
  if (input.baselineP95 && input.baselineP95 > 0) {
    const limit = input.baselineP95 * thresholds.p95SpikeFactor;
    if (input.p95ResponseTime > limit) {
      anomalies.push({
        id: 'p95-spike',
        tab: 'overview',
        severity: 'critical',
        metric: 'p95ResponseTime',
        message: `P95 response time ${Math.round(input.p95ResponseTime)}ms is ${(input.p95ResponseTime / input.baselineP95).toFixed(1)}× the baseline of ${Math.round(input.baselineP95)}ms`,
        value: input.p95ResponseTime,
        threshold: limit,
      });
    }
  }

  // Hourly traffic spike
  const usage = input.usageByHour ?? [];
  if (usage.length > 1) {
    const counts = usage.map((u) => u.count);
    const avg = mean(counts);
    const limit = avg * thresholds.hourlyVolumeSpikeFactor;
    const spike = usage.find((u) => avg > 0 && u.count > limit);
    if (spike) {
      anomalies.push({
        id: `hourly-volume-spike-${spike.hour}`,
        tab: 'usage',
        severity: 'warning',
        metric: 'hourlyVolume',
        message: `Traffic at ${spike.hour}:00 (${spike.count} req) is ${(spike.count / avg).toFixed(1)}× the hourly average`,
        value: spike.count,
        threshold: limit,
      });
    }

    const errorHour = usage.find((u) => u.errorRate >= thresholds.errorRateCritical);
    if (errorHour) {
      anomalies.push({
        id: `hourly-error-spike-${errorHour.hour}`,
        tab: 'usage',
        severity: 'critical',
        metric: 'hourlyErrorRate',
        message: `Error rate at ${errorHour.hour}:00 is ${errorHour.errorRate.toFixed(1)}%`,
        value: errorHour.errorRate,
        threshold: thresholds.errorRateCritical,
      });
    }
  }

  return anomalies;
}

/** Group anomalies by the dashboard tab they belong to. */
export function anomaliesByTab(anomalies: Anomaly[]): Partial<Record<DashboardTab, Anomaly[]>> {
  const out: Partial<Record<DashboardTab, Anomaly[]>> = {};
  anomalies.forEach((a) => {
    (out[a.tab] ??= []).push(a);
  });
  return out;
}

/** Highest severity present, or null when there are no anomalies. */
export function worstSeverity(anomalies: Anomaly[]): AnomalySeverity | null {
  if (anomalies.some((a) => a.severity === 'critical')) return 'critical';
  if (anomalies.length) return 'warning';
  return null;
}

/**
 * Fire optional email/webhook alerts. Returns the payload that would be sent so
 * callers (and tests) can assert on it. Network call is best-effort.
 */
export function buildAlertPayload(anomalies: Anomaly[], source = 'advanced-logs-dashboard') {
  return {
    source,
    detectedAt: new Date().toISOString(),
    count: anomalies.length,
    worstSeverity: worstSeverity(anomalies),
    anomalies,
  };
}

export async function dispatchWebhookAlert(
  webhookUrl: string,
  anomalies: Anomaly[],
): Promise<boolean> {
  if (!webhookUrl || !anomalies.length || typeof fetch === 'undefined') return false;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildAlertPayload(anomalies)),
    });
    return true;
  } catch {
    return false;
  }
}
