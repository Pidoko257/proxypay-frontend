/**
 * useUrlFilters Hook
 * Manages filter state with automatic URL synchronization
 * Enables browser back/forward navigation and URL sharing
 */

import { useEffect, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterState } from '../components/ExportControls';
import {
  encodeFiltersToUrl,
  decodeFiltersFromUrl,
  filtersAreDefault,
  buildFilterUrl,
} from '../utils/urlFilters';

interface UseUrlFiltersOptions {
  /**
   * The default filter state applied when URL has no parameters.
   */
  defaultFilters: FilterState;

  /**
   * Optional callback fired whenever filters change.
   * Useful for analytics or side effects.
   */
  onFiltersChange?: (filters: FilterState) => void;

  /**
   * If true, sync filter state to URL after every change.
   * Default: true
   */
  syncToUrl?: boolean;

  /**
   * If true, also update URL history (pushState).
   * If false, only replace current history entry (replaceState).
   * Default: false (cleaner, no extra history clutter)
   */
  pushHistory?: boolean;
}

/**
 * Custom hook for managing filter state with URL synchronization.
 * Returns filter state, a setter, and utilities for sharing/clearing.
 *
 * @param options - Configuration options
 * @returns Object with filters, setters, and utilities
 */
export function useUrlFilters(options: UseUrlFiltersOptions) {
  const {
    defaultFilters,
    onFiltersChange,
    syncToUrl = true,
    pushHistory = false,
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFiltersState] = useState<FilterState>(() => {
    // Initialize from URL on mount
    return decodeFiltersFromUrl(searchParams, defaultFilters);
  });

  /**
   * Update filters and sync to URL (if enabled).
   * Optionally fires onFiltersChange callback.
   */
  const setFilters = useCallback(
    (newFilters: FilterState | ((prev: FilterState) => FilterState)) => {
      setFiltersState((prevFilters) => {
        const updated = typeof newFilters === 'function' ? newFilters(prevFilters) : newFilters;

        // Sync to URL if enabled
        if (syncToUrl) {
          const params = encodeFiltersToUrl(updated);
          setSearchParams(params, { replace: !pushHistory });
        }

        // Fire change callback
        onFiltersChange?.(updated);

        return updated;
      });
    },
    [syncToUrl, pushHistory, setSearchParams, onFiltersChange]
  );

  /**
   * Update a single filter property.
   * Convenience method to avoid spreading filters manually.
   */
  const updateFilter = useCallback(
    (key: keyof FilterState, value: any) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters]
  );

  /**
   * Reset all filters to defaults and clear URL parameters.
   */
  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    setSearchParams({}, { replace: true });
    onFiltersChange?.(defaultFilters);
  }, [defaultFilters, setSearchParams, onFiltersChange]);

  /**
   * Generate a shareable URL for current filters.
   * Useful for sharing filter links with colleagues.
   *
   * @param basePath - The base path (default: current pathname)
   * @returns Complete URL with all current filters encoded
   */
  const getShareableUrl = useCallback(
    (basePath?: string) => {
      const path = basePath || window.location.pathname;
      return buildFilterUrl(path, filters);
    },
    [filters]
  );

  /**
   * Copy the shareable URL to clipboard.
   * Provides visual feedback via the returned boolean.
   *
   * @returns Promise that resolves to true if copy succeeded
   */
  const copyShareableUrl = useCallback(async (): Promise<boolean> => {
    try {
      const url = getShareableUrl(window.location.origin + window.location.pathname);
      await navigator.clipboard.writeText(url);
      return true;
    } catch (error) {
      console.error('Failed to copy URL:', error);
      return false;
    }
  }, [getShareableUrl]);

  /**
   * Check if current filters match the defaults.
   */
  const isDefaultState = useCallback(() => {
    return filtersAreDefault(filters, defaultFilters);
  }, [filters, defaultFilters]);

  /**
   * Sync URL changes back to filter state (e.g., browser back/forward).
   * This effect listens to URL changes and updates state accordingly.
   */
  useEffect(() => {
    const urlFilters = decodeFiltersFromUrl(searchParams, defaultFilters);
    setFiltersState(urlFilters);
    onFiltersChange?.(urlFilters);
  }, [searchParams, defaultFilters, onFiltersChange]);

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    getShareableUrl,
    copyShareableUrl,
    isDefaultState,
  };
}

export type UseUrlFiltersReturn = ReturnType<typeof useUrlFilters>;
