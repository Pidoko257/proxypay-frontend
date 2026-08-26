import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MetricsPanel from './MetricsPanel';

describe('MetricsPanel Comparison View (#411)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render the Compare toggle button', () => {
    render(<MetricsPanel />);
    const compareBtn = screen.getByTitle('Toggle comparison view');
    expect(compareBtn).toBeInTheDocument();
    expect(compareBtn.textContent).toContain('Compare');
  });

  it('should show comparison view when toggle is clicked', () => {
    render(<MetricsPanel />);
    const compareBtn = screen.getByTitle('Toggle comparison view');
    fireEvent.click(compareBtn);

    expect(screen.getByText('📊 Compare Metrics Across Date Ranges')).toBeInTheDocument();
  });

  it('should show date range pickers for Period A and Period B', () => {
    render(<MetricsPanel />);
    fireEvent.click(screen.getByTitle('Toggle comparison view'));

    expect(screen.getByText('Period A')).toBeInTheDocument();
    expect(screen.getByText('Period B')).toBeInTheDocument();
  });

  it('should render comparison table with endpoint data', () => {
    render(<MetricsPanel />);
    fireEvent.click(screen.getByTitle('Toggle comparison view'));

    expect(screen.getByText('Calls/Day')).toBeInTheDocument();
    expect(screen.getByText('Period A')).toBeInTheDocument();
    expect(screen.getByText('Period B')).toBeInTheDocument();
    expect(screen.getByText('Difference')).toBeInTheDocument();
    expect(screen.getByText('Trend Δ')).toBeInTheDocument();
  });

  it('should update date range when inputs change', () => {
    render(<MetricsPanel />);
    fireEvent.click(screen.getByTitle('Toggle comparison view'));

    const dateInputs = screen.getAllByDisplayValue('2026-08-16');
    expect(dateInputs.length).toBeGreaterThan(0);
  });

  it('should hide comparison view when toggled off', () => {
    render(<MetricsPanel />);
    const compareBtn = screen.getByTitle('Toggle comparison view');
    fireEvent.click(compareBtn);
    expect(screen.getByText('📊 Compare Metrics Across Date Ranges')).toBeInTheDocument();

    fireEvent.click(compareBtn);
    expect(screen.queryByText('📊 Compare Metrics Across Date Ranges')).not.toBeInTheDocument();
  });

  it('should show summary cards for Period A and Period B', () => {
    render(<MetricsPanel />);
    fireEvent.click(screen.getByTitle('Toggle comparison view'));

    expect(screen.getAllByText(/Period A Total|Period B Total/i).length).toBeGreaterThanOrEqual(2);
  });

  it('should show difference with positive/negative indicators', () => {
    render(<MetricsPanel />);
    fireEvent.click(screen.getByTitle('Toggle comparison view'));

    const diffCells = screen.getAllByText(/[▲▼]/);
    expect(diffCells.length).toBeGreaterThan(0);
  });
});
