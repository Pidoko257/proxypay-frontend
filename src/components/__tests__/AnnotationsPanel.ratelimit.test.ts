import {
  withinRateLimit,
  pruneRateEntries,
  MAX_ANNOTATIONS_PER_DAY,
} from '../AnnotationsPanel';

/**
 * Covers issue #368 — a user may create at most 10 annotations per rolling
 * 24h window; further attempts must be rejected.
 */
const NOW = 1_000_000_000_000;
const HOUR = 60 * 60 * 1000;

describe('annotation rate limiting', () => {
  it('allows submissions below the daily cap', () => {
    const stamps = Array.from({ length: 9 }, (_, i) => NOW - i * HOUR);
    expect(withinRateLimit(stamps, NOW)).toBe(true);
  });

  it('blocks the 11th submission within 24h', () => {
    const stamps = Array.from({ length: MAX_ANNOTATIONS_PER_DAY }, (_, i) => NOW - i * HOUR);
    expect(withinRateLimit(stamps, NOW)).toBe(false);
  });

  it('ignores submissions older than the 24h window', () => {
    const old = Array.from({ length: 20 }, (_, i) => NOW - (30 + i) * HOUR);
    expect(pruneRateEntries(old, NOW)).toHaveLength(0);
    expect(withinRateLimit(old, NOW)).toBe(true);
  });

  it('frees up quota as entries age out of the window', () => {
    const stamps = Array.from({ length: MAX_ANNOTATIONS_PER_DAY }, (_, i) => NOW - i * HOUR);
    expect(withinRateLimit(stamps, NOW)).toBe(false);
    // 25h later the oldest entries have expired
    expect(withinRateLimit(stamps, NOW + 25 * HOUR)).toBe(true);
  });
});
