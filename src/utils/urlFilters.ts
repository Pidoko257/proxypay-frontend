/**
 * URL Filter Utilities
 * Encodes and decodes filter state to/from URL query parameters
 * Handles special character encoding and type conversion
 */

import { FilterState } from '../components/ExportControls';

/**
 * Encodes a filter state object into URL query parameters.
 * Omits default/empty values to keep URLs clean.
 * Handles special characters via encodeURIComponent.
 *
 * @param filters - The filter state to encode
 * @returns A URLSearchParams object ready to be appended to URLs
 */
export function encodeFiltersToUrl(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  // Date filters - only include if they have non-empty values
  // (Don't skip based on defaults, as dates can legitimately be included)
  if (filters.startDate) {
    params.append('startDate', filters.startDate);
  }
  if (filters.endDate) {
    params.append('endDate', filters.endDate);
  }

  // String filters (only include if not empty)
  if (filters.endpoint) {
    params.append('endpoint', filters.endpoint);
  }
  if (filters.method) {
    params.append('method', filters.method);
  }
  if (filters.statusCode) {
    params.append('statusCode', filters.statusCode);
  }

  // Numeric filters (include if they differ from defaults)
  if (filters.minResponseTime !== 0) {
    params.append('minResponseTime', String(filters.minResponseTime));
  }
  if (filters.maxResponseTime !== 10000) {
    params.append('maxResponseTime', String(filters.maxResponseTime));
  }

  return params;
}

/**
 * Decodes URL query parameters back into a filter state object.
 * Handles type conversion (strings to numbers where needed).
 * Returns defaults for any missing values.
 *
 * @param searchParams - URLSearchParams from the current URL
 * @param defaults - Default filter state values
 * @returns Parsed filter state
 */
export function decodeFiltersFromUrl(
  searchParams: URLSearchParams,
  defaults: FilterState
): FilterState {
  return {
    startDate: searchParams.get('startDate') || defaults.startDate,
    endDate: searchParams.get('endDate') || defaults.endDate,
    endpoint: searchParams.get('endpoint') || defaults.endpoint,
    method: searchParams.get('method') || defaults.method,
    statusCode: searchParams.get('statusCode') || defaults.statusCode,
    minResponseTime: parseInt(searchParams.get('minResponseTime') || String(defaults.minResponseTime), 10),
    maxResponseTime: parseInt(searchParams.get('maxResponseTime') || String(defaults.maxResponseTime), 10),
  };
}

/**
 * Checks if a filter state object matches the defaults.
 * Used to determine when URL parameters should be cleared.
 *
 * @param filters - The filter state to check
 * @param defaults - The default filter state
 * @returns true if filters match defaults, false otherwise
 */
export function filtersAreDefault(filters: FilterState, defaults: FilterState): boolean {
  return (
    filters.startDate === defaults.startDate &&
    filters.endDate === defaults.endDate &&
    filters.endpoint === defaults.endpoint &&
    filters.method === defaults.method &&
    filters.statusCode === defaults.statusCode &&
    filters.minResponseTime === defaults.minResponseTime &&
    filters.maxResponseTime === defaults.maxResponseTime
  );
}

/**
 * Builds a complete URL with encoded filter parameters.
 * Useful for sharing filter URLs with colleagues.
 *
 * @param basePath - The base path (e.g., '/logs')
 * @param filters - The filter state to encode
 * @returns Complete URL with query parameters
 */
export function buildFilterUrl(basePath: string, filters: FilterState): string {
  const params = encodeFiltersToUrl(filters);
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

/**
 * Extracts clean filter parameters, removing any with undefined or empty values.
 * Ensures URL parameters stay clean and minimal.
 *
 * @param filters - The filter state to clean
 * @returns Cleaned filter state without empty values
 */
export function cleanFilterState(filters: Partial<FilterState>): Partial<FilterState> {
  const result: Partial<FilterState> = {};
  
  for (const [key, value] of Object.entries(filters)) {
    // Skip empty strings and undefined values
    if (value !== '' && value !== null && value !== undefined) {
      result[key as keyof FilterState] = value as any;
    }
  }
  
  return result;
}
