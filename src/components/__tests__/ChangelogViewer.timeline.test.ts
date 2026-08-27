import { daysUntil, sunsetStatus } from '../ChangelogViewer';

/**
 * Covers issue #365 — the changelog must show the deprecation → sunset timeline
 * clearly and flag endpoints that are close to their sunset date.
 */
const NOW = new Date('2026-08-27T00:00:00Z').getTime();

describe('daysUntil', () => {
  it('counts whole days until a future date', () => {
    expect(daysUntil('2026-09-06T00:00:00Z', NOW)).toBe(10);
  });

  it('is negative once the date has passed', () => {
    expect(daysUntil('2026-08-20T00:00:00Z', NOW)).toBeLessThan(0);
  });
});

describe('sunsetStatus', () => {
  it('is "none" when no sunset date is set', () => {
    expect(sunsetStatus(undefined, NOW)).toBe('none');
  });

  it('is "nearing" within 90 days of sunset', () => {
    expect(sunsetStatus('2026-10-02T00:00:00Z', NOW)).toBe('nearing');
  });

  it('is "upcoming" when sunset is more than 90 days away', () => {
    expect(sunsetStatus('2027-06-01T00:00:00Z', NOW)).toBe('upcoming');
  });

  it('is "passed" once the sunset date is behind us', () => {
    expect(sunsetStatus('2026-01-01T00:00:00Z', NOW)).toBe('passed');
  });
});
