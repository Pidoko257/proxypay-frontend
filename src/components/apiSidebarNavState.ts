/**
 * State helpers for APISidebarNav.
 *
 * - #359: persist the set of expanded tag groups to localStorage so a user's
 *   expanded "favorites" survive a page reload.
 * - #360: compute the visible window for virtual scrolling of very large
 *   endpoint lists.
 *
 * Extracted as a dependency-free module so the rules can be unit-tested without
 * rendering the React component.
 */

/** localStorage key for persisted expanded-tag state (#359). */
export const EXPANDED_TAGS_STORAGE_KEY = 'proxypay.apiSidebarNav.expandedTags';

/** Read the persisted list of expanded tag names. SSR-safe / failure-tolerant. */
export function readExpandedTags(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(EXPANDED_TAGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === 'string')
      : [];
  } catch {
    return [];
  }
}

/** Persist the list of expanded tag names. SSR-safe / failure-tolerant. */
export function writeExpandedTags(tags: Iterable<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      EXPANDED_TAGS_STORAGE_KEY,
      JSON.stringify([...tags]),
    );
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}

/**
 * Threshold above which a tag's endpoint list is virtualized (#360). Lists at
 * or below this size render every item directly.
 */
export const VIRTUALIZE_THRESHOLD = 100;

/** Row height in px — keep in sync with `styles.endpointItem`. */
export const ENDPOINT_ROW_HEIGHT = 34;
/** Height of the scroll viewport in px for a virtualized list. */
export const VIRTUAL_VIEWPORT_HEIGHT = 480;
/** Extra rows rendered above/below the viewport to avoid blank flashes. */
export const VIRTUAL_OVERSCAN = 8;

export interface VisibleRange {
  /** Index of the first rendered row. */
  first: number;
  /** Index one past the last rendered row. */
  last: number;
  /** Total scrollable height in px (all rows). */
  totalHeight: number;
  /** Pixel offset to translate the rendered slice into place. */
  offsetY: number;
}

/**
 * Given the current scroll offset and the total number of rows, return the
 * slice of rows that must be mounted for a windowed list.
 */
export function computeVisibleRange(
  scrollTop: number,
  totalRows: number,
  rowHeight: number = ENDPOINT_ROW_HEIGHT,
  viewportHeight: number = VIRTUAL_VIEWPORT_HEIGHT,
  overscan: number = VIRTUAL_OVERSCAN,
): VisibleRange {
  const safeScroll = Number.isFinite(scrollTop) && scrollTop > 0 ? scrollTop : 0;
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const maxFirst = Math.max(0, totalRows - visibleCount);
  const first = Math.min(
    maxFirst,
    Math.max(0, Math.floor(safeScroll / rowHeight) - overscan),
  );
  const last = Math.min(totalRows, first + visibleCount);
  return {
    first,
    last,
    totalHeight: totalRows * rowHeight,
    offsetY: first * rowHeight,
  };
}
