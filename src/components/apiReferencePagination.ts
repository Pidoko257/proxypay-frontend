/**
 * URL-backed pagination helpers for ApiReference (#361).
 *
 * Pagination state (`page`, `pageSize`) is mirrored into the URL query string
 * so a given page of results can be bookmarked and shared. Extracted as a
 * dependency-free module so the parsing/serialising rules can be unit-tested.
 */

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 200;

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export function clampInt(
  value: number,
  min: number,
  max: number,
  fallback: number,
): number {
  // Missing / non-numeric / below-range values fall back to the default rather
  // than silently snapping to `min` (e.g. `?pageSize=0` should mean "default").
  if (!Number.isFinite(value) || Math.floor(value) < min) return fallback;
  return Math.min(max, Math.floor(value));
}

/** Parse `page` / `pageSize` from a query string (`?page=2&pageSize=50`). */
export function parsePaginationParams(search: string): PaginationParams {
  const params = new URLSearchParams(search || '');
  return {
    page: clampInt(Number(params.get('page')), 1, Number.MAX_SAFE_INTEGER, 1),
    pageSize: clampInt(
      Number(params.get('pageSize')),
      1,
      MAX_PAGE_SIZE,
      DEFAULT_PAGE_SIZE,
    ),
  };
}

/**
 * Serialise pagination into a query string, preserving any other params and
 * omitting default values so clean URLs stay clean.
 */
export function buildPaginationSearch(
  search: string,
  { page, pageSize }: PaginationParams,
): string {
  const params = new URLSearchParams(search || '');
  if (page > 1) params.set('page', String(page));
  else params.delete('page');
  if (pageSize !== DEFAULT_PAGE_SIZE) params.set('pageSize', String(pageSize));
  else params.delete('pageSize');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function readPaginationFromLocation(): PaginationParams {
  if (typeof window === 'undefined') {
    return { page: 1, pageSize: DEFAULT_PAGE_SIZE };
  }
  return parsePaginationParams(window.location.search);
}

/** Reflect pagination in the URL without adding a history entry. */
export function syncPaginationToLocation(next: PaginationParams): void {
  if (typeof window === 'undefined') return;
  const search = buildPaginationSearch(window.location.search, next);
  if (search === window.location.search) return;
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${search}${window.location.hash}`,
  );
}
