import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PerformanceBenchmarks, { generateHistory } from './PerformanceBenchmarks';
import { BENCHMARK_DATA } from './PerformanceBenchmarks';

describe('PerformanceBenchmarks Date Range (#413)', () => {
  it('should render date range picker inputs', () => {
    render(<PerformanceBenchmarks />);
    const dateInputs = screen.getAllByDisplayValue('');
    const datePickers = document.querySelectorAll('input[type="date"]');
    expect(datePickers.length).toBe(2);
  });

  it('should generate 30-day history by default', () => {
    const base = BENCHMARK_DATA[0];
    const history = generateHistory(base);
    expect(history.length).toBe(30);
  });

  it('should generate history for a custom date range', () => {
    const base = BENCHMARK_DATA[0];
    const start = '2026-08-01';
    const end = '2026-08-07';
    const history = generateHistory(base, start, end);
    expect(history.length).toBe(7);
    expect(history[0].date).toBe('2026-08-01');
    expect(history[6].date).toBe('2026-08-07');
  });

  it('should generate history for a single day range', () => {
    const base = BENCHMARK_DATA[0];
    const history = generateHistory(base, '2026-08-15', '2026-08-15');
    expect(history.length).toBe(1);
    expect(history[0].date).toBe('2026-08-15');
  });

  it('should include p50, p95, p99, and throughput in each point', () => {
    const base = BENCHMARK_DATA[0];
    const history = generateHistory(base, '2026-08-01', '2026-08-03');
    history.forEach((point) => {
      expect(point).toHaveProperty('date');
      expect(point).toHaveProperty('p50');
      expect(point).toHaveProperty('p95');
      expect(point).toHaveProperty('p99');
      expect(point).toHaveProperty('throughput');
    });
  });

  it('should update displayed range info when dates are selected', () => {
    render(<PerformanceBenchmarks />);

    const dateInputs = document.querySelectorAll('input[type="date"]') as NodeListOf<HTMLInputElement>;
    fireEvent.change(dateInputs[0], { target: { value: '2026-08-01' } });
    fireEvent.change(dateInputs[1], { target: { value: '2026-08-07' } });

    fireEvent.click(screen.getByText('POST /payments'));

    const rangeInfo = screen.getByText(/Custom range:/);
    expect(rangeInfo.textContent).toContain('2026-08-01');
    expect(rangeInfo.textContent).toContain('2026-08-07');
  });

  it('should show default range message when no custom dates selected', () => {
    render(<PerformanceBenchmarks />);

    fireEvent.click(screen.getByText('POST /payments'));

    expect(screen.getByText(/\(30-day default history\)/)).toBeInTheDocument();
  });
});
