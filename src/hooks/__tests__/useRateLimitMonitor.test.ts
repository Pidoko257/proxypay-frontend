import {
  parseRateLimitHeaders,
  formatReset,
  formatRateLimitDisplay,
  getRateLimitStatus,
} from '../hooks/useRateLimitMonitor';

describe('Rate Limit Monitor', () => {
  describe('parseRateLimitHeaders', () => {
    it('should parse valid rate limit headers', () => {
      const now = Math.floor(Date.now() / 1000);
      const headers = {
        'x-ratelimit-limit': '1000',
        'x-ratelimit-remaining': '500',
        'x-ratelimit-reset': (now + 3600).toString(),
      };

      const result = parseRateLimitHeaders(headers);

      expect(result).not.toBeNull();
      expect(result!.limit).toBe(1000);
      expect(result!.remaining).toBe(500);
      expect(result!.used).toBe(500);
      expect(result!.percentageUsed).toBe(50);
      expect(result!.isApproaching).toBe(false);
      expect(result!.isCritical).toBe(false);
    });

    it('should detect approaching limit at 80% usage', () => {
      const now = Math.floor(Date.now() / 1000);
      const headers = {
        'x-ratelimit-limit': '1000',
        'x-ratelimit-remaining': '200',
        'x-ratelimit-reset': (now + 3600).toString(),
      };

      const result = parseRateLimitHeaders(headers);

      expect(result!.percentageUsed).toBe(80);
      expect(result!.isApproaching).toBe(true);
      expect(result!.isCritical).toBe(false);
    });

    it('should detect critical limit at 90% usage', () => {
      const now = Math.floor(Date.now() / 1000);
      const headers = {
        'x-ratelimit-limit': '1000',
        'x-ratelimit-remaining': '100',
        'x-ratelimit-reset': (now + 3600).toString(),
      };

      const result = parseRateLimitHeaders(headers);

      expect(result!.percentageUsed).toBe(90);
      expect(result!.isCritical).toBe(true);
    });

    it('should handle case-insensitive header names', () => {
      const now = Math.floor(Date.now() / 1000);
      const headers = {
        'X-RateLimit-Limit': '1000',
        'X-RateLimit-Remaining': '500',
        'X-RateLimit-Reset': (now + 3600).toString(),
      };

      const result = parseRateLimitHeaders(headers);

      expect(result).not.toBeNull();
      expect(result!.limit).toBe(1000);
      expect(result!.remaining).toBe(500);
    });

    it('should return null for invalid headers', () => {
      const headers = {};

      const result = parseRateLimitHeaders(headers);

      expect(result).toBeNull();
    });

    it('should return null for missing required headers', () => {
      const headers = {
        'x-ratelimit-limit': '1000',
        // Missing remaining and reset
      };

      const result = parseRateLimitHeaders(headers);

      expect(result).toBeNull();
    });

    it('should calculate time to reset correctly', () => {
      const now = Math.floor(Date.now() / 1000);
      const resetTime = now + 3600; // 1 hour from now
      const headers = {
        'x-ratelimit-limit': '1000',
        'x-ratelimit-remaining': '500',
        'x-ratelimit-reset': resetTime.toString(),
      };

      const result = parseRateLimitHeaders(headers);

      expect(result!.timeToReset).toBeGreaterThan(3595000); // Approximately 1 hour in ms
      expect(result!.timeToReset).toBeLessThan(3605000);
    });
  });

  describe('formatReset', () => {
    it('should format milliseconds to hours, minutes, seconds', () => {
      const ms = 3661000; // 1h 1m 1s

      const result = formatReset(ms);

      expect(result).toBe('1h 1m 1s');
    });

    it('should format minutes and seconds', () => {
      const ms = 125000; // 2m 5s

      const result = formatReset(ms);

      expect(result).toBe('2m 5s');
    });

    it('should format seconds only', () => {
      const ms = 45000; // 45s

      const result = formatReset(ms);

      expect(result).toBe('45s');
    });

    it('should handle 0 milliseconds', () => {
      const ms = 0;

      const result = formatReset(ms);

      expect(result).toBe('0s');
    });

    it('should format hours only when no minutes or seconds', () => {
      const ms = 7200000; // 2h

      const result = formatReset(ms);

      expect(result).toBe('2h');
    });
  });

  describe('formatRateLimitDisplay', () => {
    it('should format rate limit info for display', () => {
      const info = {
        limit: 1000,
        remaining: 500,
        reset: Math.floor(Date.now() / 1000) + 3600,
        used: 500,
        percentageUsed: 50,
        isApproaching: false,
        isCritical: false,
        timeToReset: 3600000,
        formattedReset: '1h',
      };

      const result = formatRateLimitDisplay(info);

      expect(result).toContain('500/1000 requests remaining');
      expect(result).toContain('50% used');
      expect(result).toContain('1h');
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return "ok" for normal usage', () => {
      const info = {
        limit: 1000,
        remaining: 500,
        reset: Math.floor(Date.now() / 1000) + 3600,
        used: 500,
        percentageUsed: 50,
        isApproaching: false,
        isCritical: false,
        timeToReset: 3600000,
        formattedReset: '1h',
      };

      const result = getRateLimitStatus(info);

      expect(result).toBe('ok');
    });

    it('should return "warning" for approaching limit', () => {
      const info = {
        limit: 1000,
        remaining: 200,
        reset: Math.floor(Date.now() / 1000) + 3600,
        used: 800,
        percentageUsed: 80,
        isApproaching: true,
        isCritical: false,
        timeToReset: 3600000,
        formattedReset: '1h',
      };

      const result = getRateLimitStatus(info);

      expect(result).toBe('warning');
    });

    it('should return "critical" for critical limit', () => {
      const info = {
        limit: 1000,
        remaining: 100,
        reset: Math.floor(Date.now() / 1000) + 3600,
        used: 900,
        percentageUsed: 90,
        isApproaching: true,
        isCritical: true,
        timeToReset: 3600000,
        formattedReset: '1h',
      };

      const result = getRateLimitStatus(info);

      expect(result).toBe('critical');
    });

    it('should return "ok" when info is null', () => {
      const result = getRateLimitStatus(null);

      expect(result).toBe('ok');
    });
  });
});
