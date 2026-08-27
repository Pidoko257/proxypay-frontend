import React from 'react';
import { render, screen, act } from '@testing-library/react';
import RateLimitDashboard, { formatCountdown } from '../RateLimitDashboard';

/**
 * Covers issue #400 — the Rate Limit dashboard shows a live HH:MM:SS countdown
 * to the reset time that ticks every second.
 *
 * NOTE: written for Jest + @testing-library/react; add a runner to execute.
 */
describe('formatCountdown', () => {
  it('formats milliseconds as zero-padded HH:MM:SS', () => {
    expect(formatCountdown(0)).toBe('00:00:00');
    expect(formatCountdown(1000)).toBe('00:00:01');
    expect(formatCountdown(61 * 1000)).toBe('00:01:01');
    expect(formatCountdown((3600 + 125) * 1000)).toBe('01:02:05');
  });

  it('clamps a negative (already elapsed) remainder to zero', () => {
    expect(formatCountdown(-5000)).toBe('00:00:00');
  });

  it('advances by exactly one second per 1000ms', () => {
    const start = 5 * 60 * 1000; // 00:05:00
    expect(formatCountdown(start)).toBe('00:05:00');
    expect(formatCountdown(start - 1000)).toBe('00:04:59');
  });
});

describe('RateLimitDashboard countdown', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders a countdown cell that updates every second', () => {
    render(<RateLimitDashboard />);
    act(() => {
      jest.advanceTimersByTime(600); // resolve the mock fetch delay
    });

    const cell = screen.getByTestId('rate-limit-countdown');
    const first = cell.textContent;
    expect(first).toMatch(/^\d{2}:\d{2}:\d{2}$/);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(cell.textContent).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(cell.textContent).not.toBe(first);
  });
});
