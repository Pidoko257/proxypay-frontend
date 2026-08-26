/**
 * Chart labelling tests for LogsDashboard (issue #376).
 *
 * NOTE: this repository does not yet have a test runner wired up. These specs target
 * jest + @testing-library/react and run as-is once that tooling is added.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LogsDashboard } from '../LogsDashboard';
import type { AnalyticsResult } from '../../analytics/analytics-engine';

const analytics = {
  dateRange: { start: new Date('2026-08-01'), end: new Date('2026-08-07') },
  totalRequests: 1000,
  totalErrors: 40,
  errorRate: 4,
  avgResponseTime: 120,
  p95ResponseTime: 300,
  p99ResponseTime: 500,
  statusCodeBreakdown: [
    { code: 200, count: 800, percentage: 80 },
    { code: 404, count: 160, percentage: 16 },
    { code: 500, count: 40, percentage: 4 },
  ],
  usageByHour: [
    { hour: 0, count: 100, avgResponseTime: 110, errorRate: 2 },
    { hour: 1, count: 220, avgResponseTime: 130, errorRate: 8 },
  ],
  topEndpoints: [],
  topErrors: [],
  topUsers: [],
  topIPs: [],
} as unknown as AnalyticsResult;

describe('LogsDashboard chart labelling (#376)', () => {
  it('gives every chart a titled figure/caption', () => {
    render(<LogsDashboard analytics={analytics} />);
    expect(screen.getByText('Status Code Distribution')).toBeInTheDocument();
    expect(screen.getByText('Hourly Usage Pattern')).toBeInTheDocument();
    expect(document.querySelectorAll('figure.chart-section')).toHaveLength(2);
  });

  it('renders a legend for the status-code and hourly charts', () => {
    render(<LogsDashboard analytics={analytics} />);
    const legends = screen.getAllByRole('list', { name: /chart legend/i });
    expect(legends.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/2xx Success/)).toBeInTheDocument();
    expect(screen.getByText(/5xx Server error/)).toBeInTheDocument();
    expect(screen.getByText(/Error rate > 5%/)).toBeInTheDocument();
  });

  it('labels the axes with units', () => {
    render(<LogsDashboard analytics={analytics} />);
    expect(screen.getByText(/Hour of day \(0–23h\)/)).toBeInTheDocument();
    expect(screen.getByText('Requests')).toBeInTheDocument();
    expect(screen.getByText(/share of total requests/i)).toBeInTheDocument();
  });
});
