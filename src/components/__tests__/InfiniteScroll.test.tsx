/**
 * Tests for Issue #449 — Infinite Scroll
 * Tests the useInfiniteScroll hook and LogsDashboard infinite scroll behaviour.
 */

import { renderHook, act } from '@testing-library/react';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { LogsDashboard } from '../LogsDashboard';

// ─── useInfiniteScroll hook tests ────────────────────────────────────────────

describe('useInfiniteScroll hook (#449)', () => {
  let onLoadMore: jest.Mock;

  beforeEach(() => {
    onLoadMore = jest.fn();
    // Mock IntersectionObserver
    const mockObserver = {
      observe: jest.fn(),
      disconnect: jest.fn(),
      unobserve: jest.fn(),
    };
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      value: jest.fn(() => mockObserver),
    });
  });

  it('calls onLoadMore when scrolled to bottom within threshold', () => {
    // Set up a fake scroll environment
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 350, // 1000 - 350 - 600 = 50 < threshold(100)
    });

    renderHook(() =>
      useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: false, threshold: 100 })
    );

    // Trigger the scroll handler
    act(() => {
      fireEvent.scroll(window);
    });

    expect(onLoadMore).toHaveBeenCalled();
  });

  it('does not call onLoadMore when isLoading is true', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 350 });

    renderHook(() =>
      useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: true, threshold: 100 })
    );

    act(() => {
      fireEvent.scroll(window);
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not call onLoadMore when hasMore is false', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 350 });

    renderHook(() =>
      useInfiniteScroll({ onLoadMore, hasMore: false, isLoading: false, threshold: 100 })
    );

    act(() => {
      fireEvent.scroll(window);
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not call onLoadMore when far from bottom', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 2000,
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });

    renderHook(() =>
      useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: false, threshold: 100 })
    );

    act(() => {
      fireEvent.scroll(window);
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('returns a sentinelRef', () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: false })
    );
    expect(result.current.sentinelRef).toBeDefined();
  });
});

// ─── LogsDashboard infinite scroll integration ────────────────────────────────

const makeAnalytics = (endpointCount: number) => ({
  dateRange: { start: new Date('2026-01-01'), end: new Date('2026-01-31') },
  totalRequests: endpointCount * 100,
  totalErrors: 10,
  errorRate: 1,
  avgResponseTime: 120,
  p95ResponseTime: 300,
  p99ResponseTime: 800,
  statusCodeBreakdown: [],
  usageByHour: [],
  topEndpoints: Array.from({ length: endpointCount }, (_, i) => ({
    endpoint: `/api/endpoint-${i}`,
    method: 'GET',
    count: 100,
    avgResponseTime: 120,
    errorRate: 1,
  })),
  topErrors: [],
  topUsers: [],
  topIPs: [],
});

describe('LogsDashboard infinite scroll (#449)', () => {
  beforeEach(() => {
    const mockObserver = {
      observe: jest.fn(),
      disconnect: jest.fn(),
      unobserve: jest.fn(),
    };
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      value: jest.fn(() => mockObserver),
    });
  });

  it('shows first page of endpoints initially (max 20)', () => {
    const analytics = makeAnalytics(50) as any;
    render(<LogsDashboard analytics={analytics} />);

    // Switch to endpoints tab
    fireEvent.click(screen.getByText(/Endpoints/i));

    const items = screen.getAllByText(/\/api\/endpoint-/);
    // First page = 20 items
    expect(items.length).toBeLessThanOrEqual(20);
  });

  it('renders the infinite scroll sentinel', () => {
    const analytics = makeAnalytics(50) as any;
    render(<LogsDashboard analytics={analytics} />);

    fireEvent.click(screen.getByText(/Endpoints/i));

    expect(screen.getByTestId('infinite-scroll-sentinel')).toBeInTheDocument();
  });

  it('shows "All endpoints loaded" when all are visible (few endpoints)', () => {
    const analytics = makeAnalytics(5) as any;
    render(<LogsDashboard analytics={analytics} />);

    fireEvent.click(screen.getByText(/Endpoints/i));

    expect(screen.getByTestId('infinite-scroll-end')).toBeInTheDocument();
  });

  it('renders scroll container with correct test id', () => {
    const analytics = makeAnalytics(5) as any;
    render(<LogsDashboard analytics={analytics} />);
    fireEvent.click(screen.getByText(/Endpoints/i));
    expect(screen.getByTestId('endpoints-scroll-container')).toBeInTheDocument();
  });
});
