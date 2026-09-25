/**
 * Tests for issues #319, #352, #353, #354
 *
 * #319 — APISidebarNav resolveRedocElement + toast feedback
 * #352 — ExportControls filter-aware CSV, filename, disabled state
 * #353 — LogsDashboard scroll position preservation per tab
 * #354 — LogsDashboard usageByHour windowing (100-point limit)
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { resolveRedocElement } from '../APISidebarNav';
import { buildCsv, buildFilename } from '../ExportControls';
import { LogsDashboard } from '../LogsDashboard';
import type { FilterState } from '../ExportControls';
import type { AnalyticsResult } from '../../analytics/analytics-engine';

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

// Minimal endpoint entry for test fixtures — cast to avoid specifying every
// EndpointMetrics field (minResponseTime, maxResponseTime, etc.).
type PartialEndpoint = Pick<
  AnalyticsResult['topEndpoints'][number],
  'endpoint' | 'method' | 'count' | 'avgResponseTime' | 'errorRate'
>;

function makeEndpoints(partials: PartialEndpoint[]): AnalyticsResult['topEndpoints'] {
  return partials.map(p => ({
    minResponseTime: 0,
    maxResponseTime: 1000,
    errorCount: 0,
    statusCodes: {},
    successRate: 100,
    p95ResponseTime: 200,
    p99ResponseTime: 400,
    ...p,
  }));
}

function makeAnalytics(usageByHourLength = 24): AnalyticsResult {
  return {
    totalRequests: usageByHourLength * 10,
    totalErrors: 5,
    errorRate: 0.5,
    avgResponseTime: 120,
    p95ResponseTime: 300,
    p99ResponseTime: 800,
    dateRange: { start: new Date('2026-01-01'), end: new Date('2026-01-31') },
    topEndpoints: makeEndpoints([
      { endpoint: '/api/payments', method: 'POST', count: 500, avgResponseTime: 200, errorRate: 1.5 },
      { endpoint: '/api/users', method: 'GET', count: 300, avgResponseTime: 80, errorRate: 0.3 },
    ]),
    topErrors: [],
    usageByHour: Array.from({ length: usageByHourLength }, (_, i) => ({
      hour: i,
      count: (i + 1) * 5,
      avgResponseTime: 100,
      errorRate: 0,
    })),
    statusCodeBreakdown: [],
    topUsers: [],
    topIPs: [],
  };
}

// ---------------------------------------------------------------------------
// #319 — resolveRedocElement
// ---------------------------------------------------------------------------

describe('#319 resolveRedocElement', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns the first element whose id matches', () => {
    const el = document.createElement('div');
    el.id = 'tag/payments/get/api/payments';
    document.body.appendChild(el);

    const result = resolveRedocElement([
      'nonexistent-id',
      'tag/payments/get/api/payments',
    ]);

    expect(result).toBe(el);
  });

  it('matches via data-section-id attribute', () => {
    const el = document.createElement('section');
    el.setAttribute('data-section-id', 'my-tag');
    document.body.appendChild(el);

    const result = resolveRedocElement(['my-tag']);
    expect(result).toBe(el);
  });

  it('returns null and does not throw when no candidates match', () => {
    const result = resolveRedocElement(['no-match-1', 'no-match-2']);
    expect(result).toBeNull();
  });

  it('logs a console.warn in development when no element is found', () => {
    const originalEnv = process.env.NODE_ENV as string | undefined;
    (process.env as Record<string, string>).NODE_ENV = 'development';
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    resolveRedocElement(['gone', 'also-gone']);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('resolveRedocElement'),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );

    warnSpy.mockRestore();
    if (originalEnv === undefined) {
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
    } else {
      (process.env as Record<string, string>).NODE_ENV = originalEnv;
    }
  });

  it('returns the first match when multiple candidates exist', () => {
    const first = document.createElement('div');
    first.id = 'first-match';
    const second = document.createElement('div');
    second.id = 'second-match';
    document.body.append(first, second);

    const result = resolveRedocElement(['first-match', 'second-match']);
    expect(result).toBe(first);
  });
});

// ---------------------------------------------------------------------------
// #352 — ExportControls helpers: buildCsv + buildFilename
// ---------------------------------------------------------------------------

describe('#352 ExportControls helpers', () => {
  const analytics = makeAnalytics(24);

  describe('buildFilename', () => {
    it('includes date range from filters', () => {
      const filters: FilterState = {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        endpoint: '',
        method: '',
        statusCode: '',
        minResponseTime: 0,
        maxResponseTime: 10000,
      };
      expect(buildFilename(filters, 'csv')).toBe('logs_2026-01-01_2026-01-31.csv');
    });

    it('falls back to logs_all when filters are undefined', () => {
      expect(buildFilename(undefined, 'csv')).toBe('logs_all.csv');
    });

    it('falls back to logs_all when startDate is empty', () => {
      const filters: FilterState = {
        startDate: '',
        endDate: '2026-01-31',
        endpoint: '',
        method: '',
        statusCode: '',
        minResponseTime: 0,
        maxResponseTime: 10000,
      };
      expect(buildFilename(filters, 'csv')).toBe('logs_all.csv');
    });

    it('works with json extension', () => {
      const filters: FilterState = {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        endpoint: '',
        method: '',
        statusCode: '',
        minResponseTime: 0,
        maxResponseTime: 10000,
      };
      expect(buildFilename(filters, 'json')).toBe('logs_2026-02-01_2026-02-28.json');
    });
  });

  describe('buildCsv', () => {
    it('produces a header row and one row per topEndpoint', () => {
      const csv = buildCsv(analytics);
      const lines = csv.split('\n');
      // header + 2 endpoint rows
      expect(lines.length).toBe(3);
      expect(lines[0]).toContain('Endpoint');
      expect(lines[0]).toContain('Method');
    });

    it('includes endpoint path and method in rows', () => {
      const csv = buildCsv(analytics);
      expect(csv).toContain('/api/payments');
      expect(csv).toContain('POST');
      expect(csv).toContain('/api/users');
      expect(csv).toContain('GET');
    });

    it('quotes cells that contain commas', () => {
      const a: AnalyticsResult = {
        ...analytics,
        topEndpoints: makeEndpoints([
          { endpoint: '/api/a,b', method: 'GET', count: 1, avgResponseTime: 10, errorRate: 0 },
        ]),
      };
      const csv = buildCsv(a);
      expect(csv).toContain('"/api/a,b"');
    });

    it('returns only the header row when topEndpoints is empty', () => {
      const empty: AnalyticsResult = { ...analytics, topEndpoints: [] };
      const csv = buildCsv(empty);
      const lines = csv.split('\n').filter(Boolean);
      expect(lines.length).toBe(1); // header only
    });
  });
});

// ---------------------------------------------------------------------------
// #353 — LogsDashboard scroll position preservation
// ---------------------------------------------------------------------------

describe('#353 LogsDashboard scroll preservation', () => {
  let originalRaf: typeof requestAnimationFrame;

  beforeEach(() => {
    // Mock requestAnimationFrame to execute the callback synchronously so
    // scroll assertions can run without async timers.
    originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    };

    Object.defineProperty(window, 'scrollY', { writable: true, value: 0 });
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRaf;
  });

  it('calls scrollTo(0) on first tab switch (no saved position)', () => {
    const analytics = makeAnalytics(24);
    render(<LogsDashboard analytics={analytics} />);

    // Simulate user having scrolled down on the overview tab
    (window as { scrollY: number }).scrollY = 400;

    const endpointsTab = screen.getByRole('button', { name: /Endpoints/i });
    fireEvent.click(endpointsTab);

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
  });

  it('resets to top when resetScrollOnTabChange=true', () => {
    const analytics = makeAnalytics(24);
    render(<LogsDashboard analytics={analytics} resetScrollOnTabChange />);

    (window as { scrollY: number }).scrollY = 600;
    const usageTab = screen.getByRole('button', { name: /Usage/i });
    fireEvent.click(usageTab);

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
  });
});

// ---------------------------------------------------------------------------
// #354 — LogsDashboard usageByHour windowing
// ---------------------------------------------------------------------------

describe('#354 LogsDashboard hourly data windowing', () => {
  it('renders only 100 hour-bars by default when dataset has 720 items', () => {
    const analytics = makeAnalytics(720);
    render(<LogsDashboard analytics={analytics} />);

    // Overview tab is active by default — count rendered hour-bar elements
    const bars = document.querySelectorAll('.hour-bar');
    expect(bars.length).toBe(100);
  });

  it('does not render "Show older data" button when data <= 100', () => {
    const analytics = makeAnalytics(24);
    render(<LogsDashboard analytics={analytics} />);
    expect(screen.queryByTestId('show-older-btn')).not.toBeInTheDocument();
  });

  it('shows "Show older data" button when data > 100', () => {
    const analytics = makeAnalytics(200);
    render(<LogsDashboard analytics={analytics} />);
    expect(screen.getByTestId('show-older-btn')).toBeInTheDocument();
  });

  it('renders all bars after clicking "Show older data"', () => {
    const analytics = makeAnalytics(200);
    render(<LogsDashboard analytics={analytics} />);

    fireEvent.click(screen.getByTestId('show-older-btn'));

    const bars = document.querySelectorAll('.hour-bar');
    expect(bars.length).toBe(200);
  });

  it('renders "Show less" button after expanding', () => {
    const analytics = makeAnalytics(200);
    render(<LogsDashboard analytics={analytics} />);

    fireEvent.click(screen.getByTestId('show-older-btn'));
    expect(screen.getByTestId('show-less-btn')).toBeInTheDocument();
  });

  it('returns to 100 bars after clicking "Show less"', () => {
    const analytics = makeAnalytics(200);
    render(<LogsDashboard analytics={analytics} />);

    fireEvent.click(screen.getByTestId('show-older-btn'));
    fireEvent.click(screen.getByTestId('show-less-btn'));

    const bars = document.querySelectorAll('.hour-bar');
    expect(bars.length).toBe(100);
  });
});
