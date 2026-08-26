/**
 * Comparative trend tests for PerformanceBenchmarks (issue #378).
 *
 * NOTE: this repository does not yet have a test runner wired up. These specs target
 * jest + @testing-library/react and run as-is once that tooling is added.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PerformanceBenchmarks from '../PerformanceBenchmarks';

describe('PerformanceBenchmarks comparative analysis (#378)', () => {
  it('adds a per-endpoint p95 trend column to the table', () => {
    render(<PerformanceBenchmarks />);
    expect(screen.getByRole('columnheader', { name: /trend \(p95\)/i })).toBeInTheDocument();
    // Every data row renders a WoW pill.
    expect(screen.getAllByText(/WoW/).length).toBeGreaterThan(0);
  });

  it('summarises how many endpoints are improving vs degrading week over week', () => {
    render(<PerformanceBenchmarks />);
    expect(screen.getByText(/Improving WoW \(p95\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Degrading WoW \(p95\)/i)).toBeInTheDocument();
  });

  it('shows week-over-week and month-over-month deltas for the selected endpoint', async () => {
    const user = userEvent.setup();
    render(<PerformanceBenchmarks />);

    await user.click(screen.getByText('POST /payments'));

    const trend = screen.getByText(/Latency Trend/i).closest('div') as HTMLElement;
    expect(within(trend).getByText(/Week over week/i)).toBeInTheDocument();
    expect(within(trend).getByText(/Month over month/i)).toBeInTheDocument();
    // Direction is labelled in words, not just colour.
    expect(within(trend).getAllByText(/faster|slower|no change/i).length).toBeGreaterThan(0);
  });
});
