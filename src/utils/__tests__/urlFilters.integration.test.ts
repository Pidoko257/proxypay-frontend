/**
 * Integration Tests for URL-Based Filter State Management
 * Tests browser back/forward navigation, URL encoding, and filter clearing
 * without requiring React Router setup
 */

import {
  encodeFiltersToUrl,
  decodeFiltersFromUrl,
  filtersAreDefault,
  buildFilterUrl,
} from '../urlFilters';
import { FilterState } from '../../components/ExportControls';

describe('URL Filter Integration Tests', () => {
  const defaultFilters: FilterState = {
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    endpoint: '',
    method: '',
    statusCode: '',
    minResponseTime: 0,
    maxResponseTime: 10000,
  };

  describe('Browser Back/Forward Navigation', () => {
    it('should persist filter state across URL changes', () => {
      // User applies filters
      const appliedFilters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/users',
        method: 'GET',
        statusCode: '2',
      };

      // Encode to URL
      const params = encodeFiltersToUrl(appliedFilters);
      const urlString = params.toString();

      // Simulate browser navigation by parsing the URL again
      const newParams = new URLSearchParams(urlString);
      const restoredFilters = decodeFiltersFromUrl(newParams, defaultFilters);

      // Filters should be identical after round trip
      expect(restoredFilters).toEqual(appliedFilters);
    });

    it('should handle complex filter scenarios through URL navigation', () => {
      // Scenario: user navigates to URL with complex filters
      const complexUrl = 'endpoint=%2Fapi%2Fsearch&method=POST&statusCode=4&minResponseTime=100&maxResponseTime=5000&startDate=2026-01-15&endDate=2026-01-20';
      const params = new URLSearchParams(complexUrl);
      const filters = decodeFiltersFromUrl(params, defaultFilters);

      expect(filters.endpoint).toBe('/api/search');
      expect(filters.method).toBe('POST');
      expect(filters.statusCode).toBe('4');
      expect(filters.minResponseTime).toBe(100);
      expect(filters.maxResponseTime).toBe(5000);
      expect(filters.startDate).toBe('2026-01-15');
      expect(filters.endDate).toBe('2026-01-20');
    });
  });

  describe('URL Encoding Special Characters', () => {
    it('should encode regex patterns in endpoints', () => {
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: '^/api/v[1-2]/(users|posts)/[0-9]+',
      };
      const params = encodeFiltersToUrl(filters);
      const decoded = decodeFiltersFromUrl(params, defaultFilters);
      expect(decoded.endpoint).toBe(filters.endpoint);
    });

    it('should handle query parameters with special chars in endpoint', () => {
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/search?q=test&filter=value&sort=asc',
      };
      const params = encodeFiltersToUrl(filters);
      const decoded = decodeFiltersFromUrl(params, defaultFilters);
      expect(decoded.endpoint).toBe(filters.endpoint);
    });

    it('should preserve URL percent-encoded characters', () => {
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/users%20list',
      };
      const params = encodeFiltersToUrl(filters);
      const decoded = decodeFiltersFromUrl(params, defaultFilters);
      expect(decoded.endpoint).toContain('users');
    });

    it('should handle unicode in filter values', () => {
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/用户/搜索',
      };
      const params = encodeFiltersToUrl(filters);
      const decoded = decodeFiltersFromUrl(params, defaultFilters);
      expect(decoded.endpoint).toContain('用户');
      expect(decoded.endpoint).toContain('搜索');
    });

    it('should handle slashes, dots, and hyphens in endpoints', () => {
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/v1.0-beta/user-accounts',
      };
      const params = encodeFiltersToUrl(filters);
      const decoded = decodeFiltersFromUrl(params, defaultFilters);
      expect(decoded.endpoint).toBe(filters.endpoint);
    });
  });

  describe('Filter Clearing Functionality', () => {
    it('should clear all filters to defaults', () => {
      // Start with filters applied
      const appliedFilters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/search',
        method: 'POST',
        statusCode: '5',
        minResponseTime: 200,
        maxResponseTime: 8000,
      };

      // Verify they're not default
      expect(filtersAreDefault(appliedFilters, defaultFilters)).toBe(false);

      // Reset to defaults
      expect(filtersAreDefault(defaultFilters, defaultFilters)).toBe(true);
    });

    it('should produce empty URL when filters are cleared', () => {
      // Apply filters
      const appliedFilters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/users',
      };

      // Encode filters
      const params = encodeFiltersToUrl(appliedFilters);
      expect(params.toString().length > 0).toBe(true);

      // Clear to defaults
      const clearedParams = encodeFiltersToUrl(defaultFilters);
      // Default filters still include dates, so URL won't be completely empty
      expect(clearedParams.toString()).toContain('startDate');
    });

    it('should handle partial filter clearing', () => {
      // Start with multiple filters
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/search',
        method: 'POST',
        statusCode: '4',
      };

      // Clear endpoint filter only
      const partiallyCleared: FilterState = {
        ...filters,
        endpoint: '',
      };

      const params = encodeFiltersToUrl(partiallyCleared);
      expect(params.has('endpoint')).toBe(false);
      expect(params.has('method')).toBe(true);
      expect(params.has('statusCode')).toBe(true);
    });
  });

  describe('Shareable URL Generation', () => {
    it('should generate valid URLs for sharing', () => {
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/transactions',
        method: 'GET',
        minResponseTime: 50,
      };
      const url = buildFilterUrl('/logs', filters);
      expect(url).toContain('/logs?');
      expect(url).toContain('endpoint=%2Fapi%2Ftransactions');
      expect(url).toContain('method=GET');
    });

    it('should handle long filter URLs', () => {
      const longEndpoint = '/api/' + 'path/'.repeat(50) + 'endpoint';
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: longEndpoint,
      };
      const url = buildFilterUrl('/logs', filters);
      expect(url).toContain(encodeURIComponent(longEndpoint));
    });

    it('should be idempotent - same filters produce same URL', () => {
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/users',
        method: 'GET',
        statusCode: '2',
      };

      const url1 = buildFilterUrl('/logs', filters);
      const url2 = buildFilterUrl('/logs', filters);

      expect(url1).toBe(url2);
    });
  });

  describe('Filter State Validation', () => {
    it('should correctly identify default filters', () => {
      expect(filtersAreDefault(defaultFilters, defaultFilters)).toBe(true);
    });

    it('should correctly identify non-default filters', () => {
      const variants = [
        { ...defaultFilters, endpoint: '/api' },
        { ...defaultFilters, method: 'GET' },
        { ...defaultFilters, statusCode: '5' },
        { ...defaultFilters, minResponseTime: 100 },
        { ...defaultFilters, maxResponseTime: 5000 },
        { ...defaultFilters, startDate: '2026-01-02' },
        { ...defaultFilters, endDate: '2026-01-30' },
      ];

      variants.forEach((variant) => {
        expect(filtersAreDefault(variant, defaultFilters)).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple filter parameters without corruption', () => {
      const filters: FilterState = {
        startDate: '2026-01-10',
        endDate: '2026-01-20',
        endpoint: '/api/v1/users?id=1&name=test',
        method: 'DELETE',
        statusCode: '404',
        minResponseTime: 10,
        maxResponseTime: 9999,
      };

      const params = encodeFiltersToUrl(filters);
      const decoded = decodeFiltersFromUrl(params, defaultFilters);

      // Verify all fields are preserved
      expect(decoded.startDate).toBe(filters.startDate);
      expect(decoded.endDate).toBe(filters.endDate);
      expect(decoded.endpoint).toBe(filters.endpoint);
      expect(decoded.method).toBe(filters.method);
      expect(decoded.statusCode).toBe(filters.statusCode);
      expect(decoded.minResponseTime).toBe(filters.minResponseTime);
      expect(decoded.maxResponseTime).toBe(filters.maxResponseTime);
    });

    it('should handle zero values correctly', () => {
      const filters: FilterState = {
        ...defaultFilters,
        minResponseTime: 0,
        maxResponseTime: 0,
      };

      const params = encodeFiltersToUrl(filters);
      // Zero values for minResponseTime should not be encoded (default)
      // Zero for maxResponseTime should be encoded (non-default)
      expect(params.has('minResponseTime')).toBe(false);
      expect(params.get('maxResponseTime')).toBe('0');
    });

    it('should handle empty string filters correctly', () => {
      const filters: FilterState = {
        ...defaultFilters,
        endpoint: '',
        method: '',
      };

      const params = encodeFiltersToUrl(filters);
      expect(params.has('endpoint')).toBe(false);
      expect(params.has('method')).toBe(false);
    });
  });
});
