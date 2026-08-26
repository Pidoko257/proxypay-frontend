import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LogsDashboard from './LogsDashboard';
import { AnalyticsResult, LogAnalyticsEngine } from '../analytics/analytics-engine';
import { SampleLogGenerator } from '../analytics/sample-logs';

function makeAnalytics(): AnalyticsResult {
  const logs = SampleLogGenerator.generateSampleLogs(500);
  return LogAnalyticsEngine.analyze(logs);
}

describe('LogsDashboard Hourly/Daily Toggle (#412)', () => {
  it('should render Hourly and Daily toggle buttons', () => {
    const analytics = makeAnalytics();
    render(<LogsDashboard analytics={analytics} />);

    expect(screen.getByTitle('Toggle hourly view').textContent).toBe('Hourly');
    expect(screen.getByTitle('Toggle daily view').textContent).toBe('Daily');
  });

  it('should show hourly chart by default', () => {
    const analytics = makeAnalytics();
    render(<LogsDashboard analytics={analytics} />);

    const hourlyBars = document.querySelectorAll('.hour-bar');
    expect(hourlyBars.length).toBeGreaterThan(0);
  });

  it('should switch to daily view when Daily is clicked', () => {
    const analytics = makeAnalytics();
    render(<LogsDashboard analytics={analytics} />);

    fireEvent.click(screen.getByTitle('Toggle daily view'));

    const dailyBars = document.querySelectorAll('.day-bar');
    expect(dailyBars.length).toBeGreaterThan(0);

    const hourlyBars = document.querySelectorAll('.hour-bar');
    expect(hourlyBars.length).toBe(0);
  });

  it('should switch back to hourly view when Hourly is clicked', () => {
    const analytics = makeAnalytics();
    render(<LogsDashboard analytics={analytics} />);

    fireEvent.click(screen.getByTitle('Toggle daily view'));
    fireEvent.click(screen.getByTitle('Toggle hourly view'));

    const hourlyBars = document.querySelectorAll('.hour-bar');
    expect(hourlyBars.length).toBeGreaterThan(0);
  });

  it('should display daily labels when in daily view', () => {
    const analytics = makeAnalytics();
    render(<LogsDashboard analytics={analytics} />);

    fireEvent.click(screen.getByTitle('Toggle daily view'));

    const dayLabels = document.querySelectorAll('.day-label');
    expect(dayLabels.length).toBeGreaterThan(0);
  });

  it('should highlight active toggle button', () => {
    const analytics = makeAnalytics();
    render(<LogsDashboard analytics={analytics} />);

    const dailyBtn = screen.getByTitle('Toggle daily view');
    fireEvent.click(dailyBtn);

    expect(dailyBtn.className).toContain('active');
  });
});
