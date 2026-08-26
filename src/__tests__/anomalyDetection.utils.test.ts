import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectAnomalies,
  anomaliesByTab,
  worstSeverity,
  buildAlertPayload,
  DEFAULT_THRESHOLDS,
} from '../components/anomalyDetection.utils.ts';

const flatUsage = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 100, errorRate: 1 }));

test('no anomalies for a healthy snapshot', () => {
  const out = detectAnomalies({
    errorRate: 1.2,
    p95ResponseTime: 220,
    baselineP95: 200,
    usageByHour: flatUsage,
  });
  assert.deepEqual(out, []);
});

test('flags a warning-level error rate', () => {
  const out = detectAnomalies({ errorRate: 6, p95ResponseTime: 100 });
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, 'warning');
  assert.equal(out[0].tab, 'errors');
});

test('flags a critical error rate', () => {
  const out = detectAnomalies({ errorRate: 15, p95ResponseTime: 100 });
  assert.equal(out[0].severity, 'critical');
});

test('flags a P95 latency spike against the baseline', () => {
  const out = detectAnomalies({ errorRate: 0, p95ResponseTime: 900, baselineP95: 200 });
  const spike = out.find((a) => a.id === 'p95-spike');
  assert.ok(spike);
  assert.equal(spike!.tab, 'overview');
});

test('does not flag P95 without a baseline', () => {
  const out = detectAnomalies({ errorRate: 0, p95ResponseTime: 9000 });
  assert.equal(out.find((a) => a.id === 'p95-spike'), undefined);
});

test('flags an hourly traffic spike', () => {
  const usage = flatUsage.map((u) => (u.hour === 3 ? { ...u, count: 5000 } : u));
  const out = detectAnomalies({ errorRate: 0, p95ResponseTime: 10, usageByHour: usage });
  const spike = out.find((a) => a.id === 'hourly-volume-spike-3');
  assert.ok(spike);
  assert.equal(spike!.tab, 'usage');
});

test('anomaliesByTab groups and worstSeverity ranks', () => {
  const out = detectAnomalies({ errorRate: 15, p95ResponseTime: 900, baselineP95: 200 });
  const grouped = anomaliesByTab(out);
  assert.ok(grouped.errors && grouped.errors.length >= 1);
  assert.equal(worstSeverity(out), 'critical');
  assert.equal(worstSeverity([]), null);
});

test('buildAlertPayload summarizes anomalies', () => {
  const out = detectAnomalies({ errorRate: 15, p95ResponseTime: 100 });
  const payload = buildAlertPayload(out);
  assert.equal(payload.count, out.length);
  assert.equal(payload.worstSeverity, 'critical');
  assert.equal(payload.source, 'advanced-logs-dashboard');
});

test('DEFAULT_THRESHOLDS are sane', () => {
  assert.ok(DEFAULT_THRESHOLDS.errorRateCritical > DEFAULT_THRESHOLDS.errorRateWarning);
});
