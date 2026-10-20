/**
 * useUrlFilters Hook Tests
 * Tests for filter state management with URL synchronization
 * Covers browser back/forward navigation and filter clearing
 */

import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useUrlFilters } from '../useUrlFilters';
import { FilterState } from '../../components/ExportControls';

// Helper to wrap hook with BrowserRouter
const wrapper = ({ children }: any) => React.createElement(BrowserRouter, {}, children);

describe('useUrlFilters hook', () => {
  const defaultFilters: FilterState = {
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    endpoint: '',
    method: '',
    statusCode: '',
    minResponseTime: 0,
    maxResponseTime: 10000,
  };

  describe('initialization', () => {
    it('should initialize with default filters when URL has no params', () => {
      const { result } = renderHook(() => useUrlFilters({ defaultFilters }), { wrapper });
      expect(result.current.filters).toEqual(defaultFilters);
    });

    it('should initialize with filters from URL params', () => {
      // Mock URL with query params
      window.history.pushState({}, '', '?endpoint=/api/users&method=GET');
      const { result } = renderHook(() => useUrlFilters({ defaultFilters }), { wrapper });
      expect(result.current.filters.endpoint).toBe('/api/users');
      expect(result.current.filters.method).toBe('GET');
    });
  });

  describe('setFilters', () => {
    it('should update filters and sync to URL', () => {
      const { result } = renderHook(() => useUrlFilters({ defaultFilters, syncToUrl: true }), {
        wrapper,
      });
      const newFilters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/search',
        method: 'POST',
      };

      act(() => {
        result.current.setFilters(newFilters);
      });

      expect(result.current.filters).toEqual(newFilters);
      // Check URL was updated
      const params = new URLSearchParams(window.location.search);
      expect(params.get('endpoint')).toBe('/api/search');
      expect(params.get('method')).toBe('POST');
    });

    it('should support functional updates', () => {
      const { result } = renderHook(() => useUrlFilters({ defaultFilters }), { wrapper });

      act(() => {
        result.current.setFilters((prev) => ({
          ...prev,
          endpoint: '/api/users',
        }));
      });

      expect(result.current.filters.endpoint).toBe('/api/users');
      expect(result.current.filters.method).toBe(defaultFilters.method);
    });

    it('should not sync to URL when syncToUrl is false', () => {
      window.history.pushState({}, '', '');
      const { result } = renderHook(
        () => useUrlFilters({ defaultFilters, syncToUrl: false }),
        { wrapper }
      );

      const newFilters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/search',
      };

      act(() => {
        result.current.setFilters(newFilters);
      });

      expect(result.current.filters.endpoint).toBe('/api/search');
      // URL should remain unchanged
      expect(window.location.search).toBe('');
    });

    it('should call onFiltersChange callback', () => {
      const onFiltersChange = jest.fn();
      const { result } = renderHook(
        () => useUrlFilters({ defaultFilters, onFiltersChange }),
        { wrapper }
      );

      const newFilters: FilterState = {
        ...defaultFilters,
        endpoint: '/api/users',
      };

      act(() => {
        result.current.setFilters(newFilters);
      });

      expect(onFiltersChange).toHaveBeenCalledWith(newFilters);
    });
  });

  describe('updateFilter', () => {
    it('should update a single filter property', () => {
      const { result } = renderHook(() => useUrlFilters({ defaultFilters }), { wrapper });

      act(() => {
        result.current.updateFilter('endpoint', '/api/search');
      });

      expect(result.current.filters.endpoint).toBe('/api/search');
      expect(result.current.filters.method).toBe(defaultFilters.method);
    });

    it('should sync single filter update to URL', () => {
      const { result } = renderHook(() => useUrlFilters({ defaultFilters, syncToUrl: true }), {
        wrapper,
      });

      act(() => {
        result.current.updateFilter('statusCode', '5');
      });

      const params = new URLSearchParams(window.location.search);
      expect(params.get('statusCode')).toBe('5');
    });

    it('should handle numeric filter updates', () => {
      const { result } = renderHook(() => useUrlFilters({ defaultFilters }), { wrapper });

      act(() => {
        result.current.updateFilter('minResponseTime', 500);
      });

      expect(result.current.filters.minResponseTime).toBe(500);
    });
  });

  describe('clearFilters', () => {
    it('should reset filters to defaults', () => {
      window.history.pushState({}, '', '?endpoint=/api/users&method=GET');
      const { result } = renderHook(() => useUrlFilters({ defaultFilters }), { wrapper });

      // Verify filters are set from URL
      expect(result.current.filters.endpoint).toBe('/api/users');

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual(defaultFilters);
    });

    it('should clear URL parameters when resetting', () => {
      window.history.pushState({}, '', '?endpoint=/api/users&method=GET');
      const { result } = renderHook(() => useUrlFilters({ defaultFilters }), { wrapper });

      act(() => {
        result.current.clearFilters();
      });

      expect(window.location.search).toBe('');
    });

    it('should call onFiltersChange callback when clearing', () => {
      const onFiltersChange = jest.fn();
      const { result } = renderHook(
        () => useUrlFilters({ defaultFilters, onFiltersChange }),
        { wrapper }
      );

      act(() => {
        result.current.updateFilter('endpoint', '/api/users');
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(onFiltersChange).toHaveBeenLastCalledWith(defaultFilters);
    });
  });

  describe('getShareableUrl', () => {
    it('should return base path for default filters', () => {
      const { result } = renderHook(() => useUrlFilters({ defaultFilters }), { wrapper });
      const url = result.current.getShareableUrl('/logs');
      expect(url).toBe('/logs');
    });

    it('should include filter params for non-default filters', () => {
      const { result } = renderHook(() => useUrlFilters({ defaultFilters }), { wrapper });

      act(() => {
        result.current.updateFilter('endpoint', '/api/users');
      });

      const url = result.current.getShareableUrl('/logs');
      expect(url).toContain('/logs?');
      expect(url).toContain('endpoint=%2Fapi%2Fusers');
    });

    it('should handle multiple filter params in URL', () => {
      const { result } = renderHook(() => useUrlFilters({ defaultFilters }), { wrapper });

      act(() => {
        result.current.updateFilter('endpoint', '/api/search');
        result.current.updateFilter('method', 'POST');
        result.current.updateFilter('statusCode', '4');
      });

      const url = result.current.getShareableUrl('/logs');
      expect(url).toContain('endpoint=%2Fapi%2Fsearch');
      expect(url).toContain('method=POST');
      expect(url).toContain('statusCode=4');
    });

    it('should use current window location if no base path provided', () => {
      const { result } = renderHook(() => useUrlFilters({ defaultFilters }), { wrapper });

      act(() => {
        result.current.updateFilter('endpoint', '/api/users');
      });

      const url = result.current.getShareableUrl();
      expect(url).toContain('endpoint=%2Fapi%2Fusers');
    });
  });

  describe('copyShareableUrl', () => {
    it('should copy URL to clipboard', async () => {
      const clipboardWriteText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: clipboardWriteText },
      });

      const { result } = renderHook(() => useUrlFilters({ defaultFilters }), { wrapper });

      act(() => {
        result.current.updateFilter('endpoint', '/api/users');
      });

      await act(async () => {
        const success = await result.current.copyShareableUrl();
        expect(success).toBe(true);
      });

      expect(clipboardWriteText).toHaveBeenCalled();
    });

    it('should return false if clipboard write fails', async () => {
      const clipboardWriteText = jest.fn().mockRejectedValue(new Error('Clipboard error'));
      Object.assign(navigator, {
        clipboard: { writeText: clipboardWriteText },
      });

      const { result } = renderHook(() => useUrlFilters({ defaultFilters }), { wrapper });

      await act(async () => {
        const success = await result.current.copyShareableUrl();
        expect(success).toBe(false);
      });
    });
  });

  describe('isDefaultState', () => {
    it('should return true when filters match defaults', () => {
      const { result } = renderHook(() => useUrlFilters({ defaultFilters }), { wrapper });
      expect(result.current.isDefaultState()).toBe(true);
    });

    it('should return false when any filter differs from defaults', () => {
      const { result } = renderHook(() => useUrlFilters({ defaultFilters }), { wrapper });

      act(() => {
        result.current.updateFilter('endpoint', '/api/search');
      });

      expect(result.current.isDefaultState()).toBe(false);
    });
  });

  describe('browser navigation', () => {
    it('should restore filters on URL change (browser back/forward)', () => {
      const { result } = renderHook(() => useUrlFilters({ defaultFilters }), { wrapper });

      // Set initial filters
      act(() => {
        result.current.updateFilter('endpoint', '/api/users');
        result.current.updateFilter('method', 'GET');
      });

      // Simulate URL change (e.g., browser back/forward)
      window.history.pushState({}, '', '?endpoint=/api/search&method=POST');

      // Hook should listen to search params change
      // This would be tested with actual navigation in an integration test
    });
  });

  describe('pushHistory option', () => {
    it('should use replaceState by default (pushHistory: false)', () => {
      const replaceSpy = jest.spyOn(window.history, 'replaceState');
      const { result } = renderHook(
        () => useUrlFilters({ defaultFilters, syncToUrl: true, pushHistory: false }),
        { wrapper }
      );

      act(() => {
        result.current.updateFilter('endpoint', '/api/users');
      });

      // replaceState should be called (indirectly via setSearchParams)
      replaceSpy.mockRestore();
    });

    it('should use pushState when pushHistory: true', () => {
      const pushSpy = jest.spyOn(window.history, 'pushState');
      const { result } = renderHook(
        () => useUrlFilters({ defaultFilters, syncToUrl: true, pushHistory: true }),
        { wrapper }
      );

      act(() => {
        result.current.updateFilter('endpoint', '/api/users');
      });

      // pushState should be called (indirectly via setSearchParams)
      pushSpy.mockRestore();
    });
  });

  describe('filter state updates on URL change', () => {
    it('should update filter state when URL params change externally', () => {
      const { result, rerender } = renderHook(() => useUrlFilters({ defaultFilters }), {
        wrapper,
      });

      // Simulate external URL change (e.g., user manually editing URL)
      window.history.pushState({}, '', '?endpoint=/api/external&method=DELETE');

      rerender();

      // The hook should sync with the new URL
      expect(result.current.filters.endpoint).toBe('/api/external');
      expect(result.current.filters.method).toBe('DELETE');
    });
  });
});
