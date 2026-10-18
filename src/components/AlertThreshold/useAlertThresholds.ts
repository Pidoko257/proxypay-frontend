import { useState, useEffect, useMemo, useRef } from 'react';
import type {
  MetricThreshold,
  AlertStatus,
  AlertLevel,
  ThresholdViolation,
} from './types';
import {
  THRESHOLDS_STORAGE_KEY,
  VIOLATIONS_LOG_KEY,
  DEFAULT_THRESHOLDS,
} from './types';

export function loadThresholds(): MetricThreshold[] {
  if (typeof window === 'undefined') return DEFAULT_THRESHOLDS;
  try {
    const raw = window.localStorage.getItem(THRESHOLDS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MetricThreshold[]) : DEFAULT_THRESHOLDS;
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

export function persistThresholds(thresholds: MetricThreshold[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(thresholds));
  } catch {
    // storage unavailable
  }
}

function appendViolationLog(violations: ThresholdViolation[]): void {
  if (typeof window === 'undefined' || violations.length === 0) return;
  try {
    const raw = window.localStorage.getItem(VIOLATIONS_LOG_KEY);
    const log: ThresholdViolation[] = raw ? JSON.parse(raw) : [];
    for (const v of violations) log.unshift(v);
    // Keep last 200 violations
    if (log.length > 200) log.length = 200;
    window.localStorage.setItem(VIOLATIONS_LOG_KEY, JSON.stringify(log));
  } catch {
    // storage unavailable
  }
}

export type MetricValues = Record<string, number>;

/**
 * Evaluates metric values against stored thresholds and returns the overall
 * alert status plus any violations. Violations are also console-warned and
 * appended to the localStorage violation log (once per change).
 */
export function useAlertThresholds(metricValues: MetricValues): AlertStatus & {
  thresholds: MetricThreshold[];
} {
  const [thresholds, setThresholds] = useState<MetricThreshold[]>([]);

  useEffect(() => {
    setThresholds(loadThresholds());
    // Listen for storage changes (e.g. settings updated in another component)
    function onStorage(e: StorageEvent) {
      if (e.key === THRESHOLDS_STORAGE_KEY) {
        setThresholds(loadThresholds());
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Compute violations from current thresholds + metric values
  const { level, violations } = useMemo<AlertStatus>(() => {
    const found: ThresholdViolation[] = [];

    for (const thr of thresholds) {
      const value = metricValues[thr.metricKey];
      if (value === undefined) continue;

      const higherIsBad = thr.higherIsBad !== false;
      const isCritical = higherIsBad
        ? value >= thr.criticalValue
        : value <= thr.criticalValue;
      const isWarning = higherIsBad
        ? value >= thr.warningValue
        : value <= thr.warningValue;

      if (isCritical || isWarning) {
        const alertLevel: 'critical' | 'warning' = isCritical ? 'critical' : 'warning';
        const threshold = isCritical ? thr.criticalValue : thr.warningValue;
        found.push({
          timestamp: new Date().toISOString(),
          metricKey: thr.metricKey,
          metricLabel: thr.label,
          currentValue: value,
          threshold,
          level: alertLevel,
        });
      }
    }

    const overallLevel: AlertLevel = found.some((v) => v.level === 'critical')
      ? 'critical'
      : found.some((v) => v.level === 'warning')
        ? 'warning'
        : 'ok';

    return { level: overallLevel, violations: found };
  }, [thresholds, metricValues]);

  // Log violations as a side effect (not during render)
  const prevViolationsRef = useRef<ThresholdViolation[]>([]);
  useEffect(() => {
    if (violations.length > 0) {
      // Only log newly detected violations (compare by key+level)
      const prevKeys = new Set(
        prevViolationsRef.current.map((v) => `${v.metricKey}:${v.level}`),
      );
      const newViolations = violations.filter(
        (v) => !prevKeys.has(`${v.metricKey}:${v.level}`),
      );
      if (newViolations.length > 0) {
        appendViolationLog(newViolations);
        for (const v of newViolations) {
          const thr = thresholds.find((t) => t.metricKey === v.metricKey);
          console.warn(
            `[ProxyPay Alert] ${v.level.toUpperCase()}: ${v.metricLabel} = ${v.currentValue}${thr?.unit ?? ''} ` +
              `(threshold: ${v.threshold}${thr?.unit ?? ''})`,
          );
        }
      }
    }
    prevViolationsRef.current = violations;
  }, [violations, thresholds]);

  return { level, violations, thresholds };
}
