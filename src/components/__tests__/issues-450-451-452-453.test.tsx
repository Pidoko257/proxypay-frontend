/**
 * Tests for issues #450, #451, #452, #453
 *
 * #450 — ComparisonView: side-by-side diff, sync scroll, diff highlighting
 * #451 — ErrorBoundary: fallback UI, retry, HOC, error logging
 * #452 — TelemetryService: GDPR opt-in, page views, interactions, hook
 * #453 — ResponsiveImage: srcset, picture sources, placeholder, error state
 */

import React, { useState } from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

import { ComparisonView, computeDiff } from '../ComparisonView';
import type { DiffLine } from '../ComparisonView';

import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary';

import { TelemetryService, useTelemetry } from '../../analytics/TelemetryService';
import type { ConsentStatus } from '../../analytics/TelemetryService';

import { ResponsiveImage } from '../ResponsiveImage';
import type { PictureSource } from '../ResponsiveImage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Throw a component that renders fine the second time */
function makeThrowOnce(message = 'Test render error') {
  let thrown = false;

  const ThrowOnce: React.FC = () => {
    if (!thrown) {
      thrown = true;
      throw new Error(message);
    }
    return <div data-testid="recovered">Recovered</div>;
  };

  ThrowOnce.displayName = 'ThrowOnce';
  return ThrowOnce;
}

/** Component that always throws */
const AlwaysThrows: React.FC = () => {
  throw new Error('Always fails');
};

// Suppress React's "act" warning noise for error boundaries in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (
      msg.includes('An update to') ||
      msg.includes('ErrorBoundary') ||
      msg.includes('The above error') ||
      msg.includes('act(')
    ) return;
    originalConsoleError(...args);
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});

// ---------------------------------------------------------------------------
// #450 — ComparisonView
// ---------------------------------------------------------------------------

describe('#450 computeDiff', () => {
  it('identifies unchanged lines', () => {
    const lines = computeDiff('hello\nworld', 'hello\nworld');
    expect(lines.every(l => l.kind === 'unchanged')).toBe(true);
  });

  it('identifies added lines', () => {
    const lines = computeDiff('line1', 'line1\nline2');
    const added = lines.filter(l => l.kind === 'added');
    expect(added.length).toBeGreaterThan(0);
    expect(added[0].textRight).toBe('line2');
  });

  it('identifies removed lines', () => {
    const lines = computeDiff('line1\nline2', 'line1');
    const removed = lines.filter(l => l.kind === 'removed');
    expect(removed.length).toBeGreaterThan(0);
    expect(removed[0].textLeft).toBe('line2');
  });

  it('handles empty strings', () => {
    const lines = computeDiff('', '');
    // Single empty line on both sides — should be unchanged
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it('handles completely different content', () => {
    const lines = computeDiff('foo\nbar', 'baz\nqux');
    const changed = lines.filter(l => l.kind !== 'unchanged');
    expect(changed.length).toBeGreaterThan(0);
  });
});

describe('#450 ComparisonView rendering', () => {
  it('renders with data-testid="comparison-view"', () => {
    render(<ComparisonView title="Test" />);
    expect(screen.getByTestId('comparison-view')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<ComparisonView labelLeft="Version A" labelRight="Version B" />);
    expect(screen.getByText('Version A')).toBeInTheDocument();
    expect(screen.getByText('Version B')).toBeInTheDocument();
  });

  it('renders diff lines from diffLines prop', () => {
    const diffLines: DiffLine[] = [
      { lineLeft: 1, lineRight: 1, kind: 'unchanged', textLeft: 'same', textRight: 'same' },
      { lineLeft: undefined, lineRight: 2, kind: 'added', textLeft: '', textRight: 'new line' },
      { lineLeft: 2, lineRight: undefined, kind: 'removed', textLeft: 'old line', textRight: '' },
    ];
    render(<ComparisonView diffLines={diffLines} />);
    expect(screen.getAllByText('same').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('new line')).toBeInTheDocument();
    expect(screen.getByText('old line')).toBeInTheDocument();
  });

  it('shows "No differences found" when all lines are unchanged and diff-only filter is toggled', () => {
    const diffLines: DiffLine[] = [
      { lineLeft: 1, lineRight: 1, kind: 'unchanged', textLeft: 'same', textRight: 'same' },
    ];
    render(<ComparisonView diffLines={diffLines} />);
    // Toggle "Diffs only"
    fireEvent.click(screen.getByText(/Diffs only/i));
    expect(screen.getByText('No differences found')).toBeInTheDocument();
  });

  it('shows diff badge when there are differences', () => {
    const diffLines: DiffLine[] = [
      { lineLeft: undefined, lineRight: 1, kind: 'added', textLeft: '', textRight: 'added' },
    ];
    render(<ComparisonView diffLines={diffLines} />);
    expect(screen.getByText(/1 diff/i)).toBeInTheDocument();
  });

  it('renders arbitrary content in content mode', () => {
    render(
      <ComparisonView
        contentLeft={<span>left content</span>}
        contentRight={<span>right content</span>}
      />,
    );
    expect(screen.getByText('left content')).toBeInTheDocument();
    expect(screen.getByText('right content')).toBeInTheDocument();
  });

  it('sync-scroll toggle button is present and toggleable', () => {
    render(<ComparisonView />);
    const btn = screen.getByTestId('sync-scroll-toggle');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows legend when diffLines provided', () => {
    const diffLines: DiffLine[] = [
      { lineLeft: 1, lineRight: 1, kind: 'unchanged', textLeft: 'x', textRight: 'x' },
    ];
    render(<ComparisonView diffLines={diffLines} showLegend />);
    expect(screen.getByText('Added')).toBeInTheDocument();
    expect(screen.getByText('Removed')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// #451 — ErrorBoundary
// ---------------------------------------------------------------------------

describe('#451 ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">OK</div>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary section="MySection">
        <AlwaysThrows />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong in MySection/i)).toBeInTheDocument();
  });

  it('shows the error message in the fallback', () => {
    render(
      <ErrorBoundary>
        <AlwaysThrows />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Always fails/i)).toBeInTheDocument();
  });

  it('has role="alert" on the fallback for screen readers', () => {
    render(
      <ErrorBoundary>
        <AlwaysThrows />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('retry button resets the boundary so children can re-render', () => {
    const ThrowOnce = makeThrowOnce('one-time error');

    render(
      <ErrorBoundary section="RetrySection">
        <ThrowOnce />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);

    expect(screen.getByTestId('recovered')).toBeInTheDocument();
  });

  it('calls onError prop when an error is caught', () => {
    const spy = jest.fn();

    render(
      <ErrorBoundary onError={spy}>
        <AlwaysThrows />
      </ErrorBoundary>,
    );

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });

  it('logs error to console', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <AlwaysThrows />
      </ErrorBoundary>,
    );

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('renders custom fallback when fallback prop is provided', () => {
    render(
      <ErrorBoundary fallback={(err) => <div data-testid="custom">{err.message}</div>}>
        <AlwaysThrows />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('custom')).toHaveTextContent('Always fails');
  });

  it('withErrorBoundary HOC wraps component and shows fallback on error', () => {
    const SafeComponent = withErrorBoundary(AlwaysThrows, { section: 'HOC test' });

    render(<SafeComponent />);
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong in HOC test/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// #452 — TelemetryService
// ---------------------------------------------------------------------------

describe('#452 TelemetryService', () => {
  // Always start with a fresh singleton
  beforeEach(() => {
    TelemetryService.reset();
    // Clear persisted consent
    try { localStorage.removeItem('proxypay_telemetry_consent'); } catch {}
  });

  afterEach(() => {
    TelemetryService.reset();
  });

  it('starts with consent=pending', () => {
    const svc = TelemetryService.getInstance();
    expect(svc.getConsent()).toBe('pending');
    expect(svc.isOptedIn()).toBe(false);
  });

  it('grantConsent() sets consent to granted', () => {
    const svc = TelemetryService.getInstance();
    svc.grantConsent();
    expect(svc.getConsent()).toBe('granted');
    expect(svc.isOptedIn()).toBe(true);
  });

  it('denyConsent() sets consent to denied', () => {
    const svc = TelemetryService.getInstance();
    svc.denyConsent();
    expect(svc.getConsent()).toBe('denied');
    expect(svc.isOptedIn()).toBe(false);
  });

  it('does not queue page views when consent is pending', () => {
    const svc = TelemetryService.getInstance();
    svc.trackPageView('/docs');
    expect(svc.queueSize()).toBe(0);
  });

  it('does not queue interactions when consent is denied', () => {
    const svc = TelemetryService.getInstance();
    svc.denyConsent();
    svc.trackInteraction('feature', 'click', 'comparison-view');
    expect(svc.queueSize()).toBe(0);
  });

  it('queues page view events after consent is granted', () => {
    const svc = TelemetryService.getInstance();
    svc.grantConsent();
    svc.trackPageView('/api');
    expect(svc.queueSize()).toBe(1);
  });

  it('queues interaction events after consent is granted', () => {
    const svc = TelemetryService.getInstance();
    svc.grantConsent();
    svc.trackInteraction('navigation', 'click', 'sidebar-link');
    expect(svc.queueSize()).toBe(1);
  });

  it('denyConsent() clears the event queue', () => {
    const svc = TelemetryService.getInstance();
    svc.grantConsent();
    svc.trackPageView('/home');
    svc.trackPageView('/api');
    expect(svc.queueSize()).toBe(2);

    svc.denyConsent();
    expect(svc.queueSize()).toBe(0);
  });

  it('persists consent to localStorage', () => {
    const svc = TelemetryService.getInstance();
    svc.grantConsent();
    expect(localStorage.getItem('proxypay_telemetry_consent')).toBe('granted');

    TelemetryService.reset();
    const svc2 = TelemetryService.getInstance();
    // Consent should be restored from storage
    expect(svc2.getConsent()).toBe('granted');
  });

  it('flush() clears the queue', async () => {
    const svc = TelemetryService.getInstance({ endpoint: '' });
    svc.grantConsent();
    svc.trackPageView('/page1');
    svc.trackPageView('/page2');
    await svc.flush();
    expect(svc.queueSize()).toBe(0);
  });

  it('onConsentChange fires when consent changes', () => {
    const svc = TelemetryService.getInstance();
    const statuses: ConsentStatus[] = [];
    svc.onConsentChange(s => statuses.push(s));

    svc.grantConsent();
    svc.denyConsent();

    expect(statuses).toEqual(['granted', 'denied']);
  });

  it('getInstance returns the same instance', () => {
    const a = TelemetryService.getInstance();
    const b = TelemetryService.getInstance();
    expect(a).toBe(b);
  });
});

describe('#452 useTelemetry hook', () => {
  beforeEach(() => {
    TelemetryService.reset();
    try { localStorage.removeItem('proxypay_telemetry_consent'); } catch {}
  });

  afterEach(() => {
    TelemetryService.reset();
  });

  const ConsentUI: React.FC = () => {
    const { consent, isOptedIn, grantConsent, denyConsent, trackPageView, trackInteraction } =
      useTelemetry();

    return (
      <div>
        <span data-testid="consent">{consent}</span>
        <span data-testid="opted-in">{isOptedIn ? 'yes' : 'no'}</span>
        <button onClick={grantConsent}>Grant</button>
        <button onClick={denyConsent}>Deny</button>
        <button onClick={() => trackPageView('/test')}>Track page</button>
        <button onClick={() => trackInteraction('test', 'click')}>Track interaction</button>
      </div>
    );
  };

  it('initial consent is pending', () => {
    render(<ConsentUI />);
    expect(screen.getByTestId('consent')).toHaveTextContent('pending');
    expect(screen.getByTestId('opted-in')).toHaveTextContent('no');
  });

  it('grantConsent updates consent state', () => {
    render(<ConsentUI />);
    fireEvent.click(screen.getByText('Grant'));
    expect(screen.getByTestId('consent')).toHaveTextContent('granted');
    expect(screen.getByTestId('opted-in')).toHaveTextContent('yes');
  });

  it('denyConsent updates consent state', () => {
    render(<ConsentUI />);
    fireEvent.click(screen.getByText('Deny'));
    expect(screen.getByTestId('consent')).toHaveTextContent('denied');
  });

  it('trackPageView does nothing before consent', () => {
    render(<ConsentUI />);
    fireEvent.click(screen.getByText('Track page'));
    expect(TelemetryService.getInstance().queueSize()).toBe(0);
  });

  it('trackInteraction queues event after consent is granted', () => {
    render(<ConsentUI />);
    fireEvent.click(screen.getByText('Grant'));
    fireEvent.click(screen.getByText('Track interaction'));
    expect(TelemetryService.getInstance().queueSize()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// #453 — ResponsiveImage
// ---------------------------------------------------------------------------

describe('#453 ResponsiveImage', () => {
  it('renders an <img> element', () => {
    render(<ResponsiveImage src="/img/hero.jpg" alt="Hero image" />);
    expect(screen.getByTestId('responsive-image')).toBeInTheDocument();
  });

  it('passes through the src and alt attributes', () => {
    render(<ResponsiveImage src="/img/logo.png" alt="Logo" />);
    const img = screen.getByTestId('responsive-image');
    expect(img).toHaveAttribute('src', '/img/logo.png');
    expect(img).toHaveAttribute('alt', 'Logo');
  });

  it('applies srcSet and sizes attributes', () => {
    render(
      <ResponsiveImage
        src="/img/photo.jpg"
        alt="Photo"
        srcSet="/img/photo-400.jpg 400w, /img/photo-800.jpg 800w"
        sizes="(max-width: 600px) 100vw, 50vw"
      />,
    );
    const img = screen.getByTestId('responsive-image');
    expect(img).toHaveAttribute('srcset', '/img/photo-400.jpg 400w, /img/photo-800.jpg 800w');
    expect(img).toHaveAttribute('sizes', '(max-width: 600px) 100vw, 50vw');
  });

  it('renders <picture> element when sources prop is provided', () => {
    const sources: PictureSource[] = [
      { media: '(max-width: 640px)', srcSet: '/img/photo-sm.webp', type: 'image/webp' },
      { media: '(min-width: 641px)', srcSet: '/img/photo-lg.webp', type: 'image/webp' },
    ];

    const { container } = render(
      <ResponsiveImage src="/img/photo.jpg" alt="Photo" sources={sources} />,
    );

    const picture = container.querySelector('picture');
    expect(picture).toBeInTheDocument();

    const sourceTags = container.querySelectorAll('source');
    expect(sourceTags.length).toBe(2);
    expect(sourceTags[0]).toHaveAttribute('media', '(max-width: 640px)');
    expect(sourceTags[1]).toHaveAttribute('media', '(min-width: 641px)');
  });

  it('sets loading="lazy" by default', () => {
    render(<ResponsiveImage src="/img/x.jpg" alt="x" />);
    expect(screen.getByTestId('responsive-image')).toHaveAttribute('loading', 'lazy');
  });

  it('sets loading="eager" when specified', () => {
    render(<ResponsiveImage src="/img/x.jpg" alt="x" loading="eager" />);
    expect(screen.getByTestId('responsive-image')).toHaveAttribute('loading', 'eager');
  });

  it('shows placeholder before image loads', () => {
    render(<ResponsiveImage src="/img/x.jpg" alt="x" />);
    expect(screen.getByTestId('responsive-image-placeholder')).toBeInTheDocument();
  });

  it('hides placeholder and shows image after onLoad fires', () => {
    render(<ResponsiveImage src="/img/x.jpg" alt="x" width={200} height={100} />);
    const img = screen.getByTestId('responsive-image');

    act(() => {
      fireEvent.load(img);
    });

    const placeholder = screen.getByTestId('responsive-image-placeholder');
    // Placeholder should be hidden (has placeholderHidden class or opacity 0)
    expect(placeholder.className).toMatch(/placeholderHidden|hidden/i);
  });

  it('renders error state when image fails to load', () => {
    render(<ResponsiveImage src="/img/broken.jpg" alt="Broken" />);
    const img = screen.getByTestId('responsive-image');

    act(() => {
      fireEvent.error(img);
    });

    expect(screen.getByTestId('responsive-image-error')).toBeInTheDocument();
  });

  it('decorative image (alt="") gets role="presentation"', () => {
    render(<ResponsiveImage src="/img/decoration.svg" alt="" />);
    const img = screen.getByTestId('responsive-image');
    expect(img).toHaveAttribute('role', 'presentation');
  });

  it('renders figcaption when caption prop is provided', () => {
    render(<ResponsiveImage src="/img/chart.png" alt="Chart" caption="Monthly revenue" />);
    expect(screen.getByText('Monthly revenue')).toBeInTheDocument();
  });

  it('calls onLoad callback when image loads', () => {
    const onLoad = jest.fn();
    render(<ResponsiveImage src="/img/x.jpg" alt="x" onLoad={onLoad} />);
    fireEvent.load(screen.getByTestId('responsive-image'));
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it('calls onError callback when image fails', () => {
    const onError = jest.fn();
    render(<ResponsiveImage src="/img/x.jpg" alt="x" onError={onError} />);
    fireEvent.error(screen.getByTestId('responsive-image'));
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('passes width and height to the img element', () => {
    render(<ResponsiveImage src="/img/x.jpg" alt="x" width={640} height={480} />);
    const img = screen.getByTestId('responsive-image');
    expect(img).toHaveAttribute('width', '640');
    expect(img).toHaveAttribute('height', '480');
  });
});
