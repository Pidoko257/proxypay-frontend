import { shouldPollNow } from '../RateLimitDashboard';

/**
 * Covers issue #372 — RateLimitDashboard must pause its 30s status polling
 * while the browser tab is hidden and resume when it becomes active again.
 * The visibility decision lives in the pure `shouldPollNow` helper that the
 * polling effect consults on mount and on every `visibilitychange` event.
 */
describe('shouldPollNow', () => {
  it('polls when auto-refresh is on and the tab is visible', () => {
    expect(shouldPollNow(true, false)).toBe(true);
  });

  it('does not poll while the tab is hidden even with auto-refresh on', () => {
    expect(shouldPollNow(true, true)).toBe(false);
  });

  it('does not poll when auto-refresh is off, regardless of visibility', () => {
    expect(shouldPollNow(false, false)).toBe(false);
    expect(shouldPollNow(false, true)).toBe(false);
  });

  it('resumes polling once a hidden tab becomes visible again', () => {
    let hidden = true;
    expect(shouldPollNow(true, hidden)).toBe(false); // tab in background
    hidden = false; // user switches back
    expect(shouldPollNow(true, hidden)).toBe(true);
  });
});
