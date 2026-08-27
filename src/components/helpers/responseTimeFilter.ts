/**
 * Response-time filtering for the Advanced Logs Dashboard.
 *
 * The min/max response-time filter is *inclusive* on both ends. These helpers
 * centralise that rule so the UI copy and the filtering logic can never drift
 * apart.
 */

export interface HasResponseTime {
  responseTime: number;
}

/** Inclusive on both bounds: `min <= value <= max`. */
export function isWithinResponseTime(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export function filterByResponseTime<T extends HasResponseTime>(
  logs: T[],
  min: number,
  max: number,
): T[] {
  return logs.filter((log) => isWithinResponseTime(log.responseTime, min, max));
}

/**
 * Coerce a raw `<input type="number">` value into a usable number, falling back
 * to `fallback` for empty / non-numeric input so the filter never turns into
 * `NaN` comparisons (which would silently drop every row).
 */
export function coerceResponseTime(raw: string, fallback: number): number {
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Label shown next to the filter so users know the range is inclusive. */
export function formatResponseTimeRange(min: number, max: number): string {
  return `${min.toLocaleString()}–${max.toLocaleString()} ms (inclusive)`;
}
