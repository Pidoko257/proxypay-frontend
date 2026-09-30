import { projectMetrics } from '../PerformanceBenchmarks';
import { calculateUsageForecast } from '../RateLimitDashboard';
import { getEndpointStatus } from '../ApiReference';
import { GRAPH_LABEL_COLOR, GRAPH_LABEL_FONT_SIZE } from '../DependencyGraph';

describe('dashboard enhancements', () => {
  it('projects throughput and latency for changed load', () => {
    expect(projectMetrics({ throughput: 100, p50: 100, p95: 200, p99: 300 }, 1.5, 1)).toEqual({
      throughput: 150,
      p50: 118,
      p95: 235,
      p99: 353,
    });
  });

  it('forecasts the time until a rate limit is reached', () => {
    const now = Date.UTC(2026, 0, 1);
    const forecast = calculateUsageForecast([
      { timestamp: now - 2 * 3600000, requestsUsed: 100 },
      { timestamp: now - 3600000, requestsUsed: 200 },
    ], 500, now);
    expect(forecast.requestsPerHour).toBe(100);
    expect(forecast.hoursUntilLimit).toBe(3);
    expect(forecast.projectedAtLimit).toBe(now + 3 * 3600000);
  });

  it('classifies lifecycle status metadata', () => {
    expect(getEndpointStatus({ deprecated: true })).toBe('deprecated');
    expect(getEndpointStatus({ 'x-experimental': true })).toBe('experimental');
    expect(getEndpointStatus({ 'x-status': 'new' })).toBe('new');
    expect(getEndpointStatus({})).toBe('stable');
  });

  it('uses readable graph label tokens', () => {
    expect(GRAPH_LABEL_FONT_SIZE).toBeGreaterThanOrEqual(14);
    expect(GRAPH_LABEL_COLOR).toBe('#172033');
  });
});
