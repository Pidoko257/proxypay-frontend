import React from 'react';
import { render, screen } from '@testing-library/react';
import { LogsDashboard, MetricLabel, METRIC_DEFINITIONS, METRICS_DOC_URL } from '../LogsDashboard';

/**
 * Covers issue #363 — metric definitions surfaced as tooltips, links to
 * documentation, and a glossary reference.
 *
 * NOTE: written for Jest + @testing-library/react; add a runner to execute.
 */
const analytics: any = {
  dateRange: { start: new Date('2026-08-01'), end: new Date('2026-08-02') },
  totalRequests: 1000,
  totalErrors: 20,
  errorRate: 2,
  avgResponseTime: 120,
  p95ResponseTime: 300,
  p99ResponseTime: 800,
  statusCodeBreakdown: [],
  usageByHour: [],
  topEndpoints: [],
  topErrors: [],
  topUsers: [],
  topIPs: [],
};

describe('LogsDashboard metric definitions', () => {
  it('MetricLabel renders a definition tooltip and a docs link', () => {
    render(<MetricLabel name="P95 Response Time" />);
    const info = screen.getByTestId('metric-tooltip-P95 Response Time');
    expect(info).toHaveAttribute('title', METRIC_DEFINITIONS['P95 Response Time']);
    const link = screen.getByRole('link', { name: /P95 Response Time/i });
    expect(link).toHaveAttribute('href', METRICS_DOC_URL);
  });

  it('shows tooltips on the key dashboard metrics', () => {
    render(<LogsDashboard analytics={analytics} />);
    ['Total Requests', 'Error Rate', 'Avg Response Time', 'P95 Response Time', 'P99 Response Time']
      .forEach((name) => {
        expect(screen.getAllByTestId(`metric-tooltip-${name}`).length).toBeGreaterThan(0);
      });
  });

  it('every documented metric has a non-empty definition', () => {
    Object.values(METRIC_DEFINITIONS).forEach((def) => {
      expect(def.length).toBeGreaterThan(10);
    });
  });
});
