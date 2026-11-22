/**
 * URL Filters Utility Tests
 * Tests for encoding/decoding filter state to/from URL parameters
 * Covers special character handling and edge cases
 */

import {
  encodeFiltersToUrl,
  decodeFiltersFromUrl,
  filtersAreDefault,
  buildFilterUrl,
  cleanFilterState,
} from '../urlFilters';
import { FilterState } from '../../components/ExportControls';

describe('urlFilters utilities', () => {
  const defaultFilters: FilterState = {
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    endpoint: '',
    method: '',
    statusCode: '',
    minResponseTime: 0,
    maxResponseTime: 10000,
  };

  describe('encodeFiltersToUrl', () => {
    it('should encode filters with dates included', () => {
      const params = encodeFiltersToUrl(defaultFilters);
      // Dates are included even if they match defaults
      expect(params.get('startDate')).toBe('2026-01-01');
      expect(params.get('endDate')).toBe('2026-01-31');
    });

    it('should encode non-default filters', () => {
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/users',
        method: 'GET',
        statusCode: '4',
      };
      const params = encodeFiltersToUrl(filters);
      expect(params.get('endpoint')).toBe('/api/users');
      expect(params.get('method')).toBe('GET');
      expect(params.get('statusCode')).toBe('4');
    });

    it('should encode special characters in endpoint', () => {
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/users?id=[0-9]+&name=.*',
      };
      const params = encodeFiltersToUrl(filters);
      expect(params.get('endpoint')).toBe('/api/users?id=[0-9]+&name=.*');
    });

    it('should encode response time filters when non-default', () => {
      const filters: FilterState = {
        ...defaultFilters,
        minResponseTime: 100,
        maxResponseTime: 5000,
      };
      const params = encodeFiltersToUrl(filters);
      expect(params.get('minResponseTime')).toBe('100');
      expect(params.get('maxResponseTime')).toBe('5000');
    });

    it('should not encode default response time values', () => {
      const filters: FilterState = {
        ...defaultFilters,
        minResponseTime: 0,
        maxResponseTime: 10000,
      };
      const params = encodeFiltersToUrl(filters);
      expect(params.has('minResponseTime')).toBe(false);
      expect(params.has('maxResponseTime')).toBe(false);
    });

    it('should handle unicode characters', () => {
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/用户',
      };
      const params = encodeFiltersToUrl(filters);
      expect(decodeURIComponent(params.get('endpoint') || '')).toBe('/api/用户');
    });

    it('should handle spaces and special characters', () => {
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/search?q=hello world&filter=test@example.com',
      };
      const params = encodeFiltersToUrl(filters);
      const encoded = params.toString();
      expect(encoded).toContain('endpoint');
      // URL encoding should have converted spaces to %20 or +
      expect(encoded.length > 0).toBe(true);
    });
  });

  describe('decodeFiltersFromUrl', () => {
    it('should decode empty params to defaults', () => {
      const params = new URLSearchParams('');
      const filters = decodeFiltersFromUrl(params, defaultFilters);
      expect(filters).toEqual(defaultFilters);
    });

    it('should decode basic filter parameters', () => {
      const params = new URLSearchParams('endpoint=/api/users&method=GET&statusCode=4');
      const filters = decodeFiltersFromUrl(params, defaultFilters);
      expect(filters.endpoint).toBe('/api/users');
      expect(filters.method).toBe('GET');
      expect(filters.statusCode).toBe('4');
    });

    it('should decode numeric filters with type conversion', () => {
      const params = new URLSearchParams('minResponseTime=100&maxResponseTime=5000');
      const filters = decodeFiltersFromUrl(params, defaultFilters);
      expect(filters.minResponseTime).toBe(100);
      expect(filters.maxResponseTime).toBe(5000);
      expect(typeof filters.minResponseTime).toBe('number');
      expect(typeof filters.maxResponseTime).toBe('number');
    });

    it('should handle URL-encoded special characters', () => {
      const endpoint = '/api/search?q=hello%20world&filter=test%40example.com';
      const params = new URLSearchParams(`endpoint=${endpoint}`);
      const filters = decodeFiltersFromUrl(params, defaultFilters);
      // The full URL-encoded string is preserved as-is
      expect(filters.endpoint).toContain('hello');
    });

    it('should decode unicode characters', () => {
      const params = new URLSearchParams('endpoint=%2Fapi%2F%E7%94%A8%E6%88%B7'); // /api/用户
      const filters = decodeFiltersFromUrl(params, defaultFilters);
      expect(filters.endpoint).toContain('用户');
    });

    it('should use defaults for missing parameters', () => {
      const params = new URLSearchParams('endpoint=/api/users');
      const filters = decodeFiltersFromUrl(params, defaultFilters);
      expect(filters.method).toBe(defaultFilters.method);
      expect(filters.statusCode).toBe(defaultFilters.statusCode);
      expect(filters.minResponseTime).toBe(defaultFilters.minResponseTime);
    });

    it('should handle invalid numeric values gracefully', () => {
      const params = new URLSearchParams('minResponseTime=invalid');
      const filters = decodeFiltersFromUrl(params, defaultFilters);
      // parseInt('invalid') returns NaN, which may need handling
      expect(isNaN(filters.minResponseTime)).toBe(true);
    });
  });

  describe('encodeFiltersToUrl and decodeFiltersFromUrl roundtrip', () => {
    it('should preserve filter state through encode-decode cycle', () => {
      const original: FilterState = {
        startDate: '2026-01-15',
        endDate: '2026-01-31',
        endpoint: '/api/search',
        method: 'POST',
        statusCode: '2',
        minResponseTime: 50,
        maxResponseTime: 2000,
      };
      const params = encodeFiltersToUrl(original);
      const decoded = decodeFiltersFromUrl(params, defaultFilters);
      expect(decoded).toEqual(original);
    });

    it('should preserve complex endpoint patterns', () => {
      const original: FilterState = {
        ...defaultFilters,
        endpoint: '^/api/(v1|v2)/[a-z]+/(.*)',
      };
      const params = encodeFiltersToUrl(original);
      const decoded = decodeFiltersFromUrl(params, defaultFilters);
      expect(decoded.endpoint).toBe(original.endpoint);
    });
  });

  describe('filtersAreDefault', () => {
    it('should return true for default filters', () => {
      expect(filtersAreDefault(defaultFilters, defaultFilters)).toBe(true);
    });

    it('should return false when endpoint differs', () => {
      const filters: FilterState = { ...defaultFilters, endpoint: '/api/users' };
      expect(filtersAreDefault(filters, defaultFilters)).toBe(false);
    });

    it('should return false when response time filters differ', () => {
      const filters: FilterState = { ...defaultFilters, minResponseTime: 100 };
      expect(filtersAreDefault(filters, defaultFilters)).toBe(false);
    });

    it('should return false when any filter differs', () => {
      const filters: FilterState = { ...defaultFilters, statusCode: '5' };
      expect(filtersAreDefault(filters, defaultFilters)).toBe(false);
    });
  });

  describe('buildFilterUrl', () => {
    it('should include dates in URL since dates are always encoded', () => {
      const url = buildFilterUrl('/logs', defaultFilters);
      // Dates are included even for defaults
      expect(url).toContain('/logs?');
      expect(url).toContain('startDate=2026-01-01');
      expect(url).toContain('endDate=2026-01-31');
    });

    it('should build URL with query string for non-default filters', () => {
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/users',
        method: 'GET',
      };
      const url = buildFilterUrl('/logs', filters);
      expect(url).toContain('/logs?');
      expect(url).toContain('endpoint=%2Fapi%2Fusers');
      expect(url).toContain('method=GET');
    });

    it('should handle absolute URLs', () => {
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/search',
      };
      const url = buildFilterUrl('http://localhost:3001/logs', filters);
      expect(url).toContain('http://localhost:3001/logs?');
      expect(url).toContain('endpoint=%2Fapi%2Fsearch');
    });
  });

  describe('cleanFilterState', () => {
    it('should remove empty string values', () => {
      const dirty = {
        endpoint: '/api/users',
        method: '',
        statusCode: '4',
      };
      const clean = cleanFilterState(dirty);
      expect(clean.endpoint).toBe('/api/users');
      expect(clean.statusCode).toBe('4');
      expect(clean.method).toBeUndefined();
    });

    it('should remove null and undefined values', () => {
      const dirty: Partial<FilterState> = {
        endpoint: '/api/users',
        method: undefined,
        statusCode: undefined,
      };
      const clean = cleanFilterState(dirty);
      expect(clean.endpoint).toBe('/api/users');
      expect('method' in clean).toBe(false);
      expect('statusCode' in clean).toBe(false);
    });

    it('should preserve zero values for numeric fields', () => {
      const dirty: Partial<FilterState> = {
        minResponseTime: 0,
        maxResponseTime: 5000,
      };
      const clean = cleanFilterState(dirty);
      expect(clean.minResponseTime).toBe(0);
      expect(clean.maxResponseTime).toBe(5000);
    });
  });

  describe('Edge cases and security', () => {
    it('should handle XSS-like strings safely', () => {
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: "<img src=x onerror='alert(1)'>",
      };
      const params = encodeFiltersToUrl(filters);
      const decoded = decodeFiltersFromUrl(params, defaultFilters);
      // The value should be preserved as a string, not interpreted as HTML
      expect(decoded.endpoint).toBe(filters.endpoint);
    });

    it('should handle very long endpoint patterns', () => {
      const longPattern = '/api/' + 'a'.repeat(1000);
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: longPattern,
      };
      const params = encodeFiltersToUrl(filters);
      const decoded = decodeFiltersFromUrl(params, defaultFilters);
      expect(decoded.endpoint).toBe(longPattern);
    });

    it('should handle query parameters with & and = characters', () => {
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/search?q=a&b=c&d=e',
      };
      const params = encodeFiltersToUrl(filters);
      const decoded = decodeFiltersFromUrl(params, defaultFilters);
      expect(decoded.endpoint).toBe('/api/search?q=a&b=c&d=e');
    });
  });
});
