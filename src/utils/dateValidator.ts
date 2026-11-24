/**
 * Date validation and formatting utilities for transaction timestamps.
 *
 * Handles:
 * - Missing timestamps (null, undefined)
 * - Malformed timestamps (invalid date strings, non-string values)
 * - Boundary edge cases (very old dates, far future dates)
 * - Timezone-aware formatting
 */

export type DateValidationResult = 
  | { valid: true; date: Date }
  | { valid: false; reason: 'missing' | 'malformed' | 'invalid-range' };

export interface FormattedDate {
  isAvailable: boolean;
  formatted: string;
  date?: Date;
  validationReason?: string;
}

/**
 * Validates if a value is a valid timestamp that can be formatted.
 *
 * @param value - The timestamp to validate (string, Date, number, or any other type)
 * @returns Validation result with Date object if valid, or error reason if invalid
 */
export function validateTimestamp(value: unknown): DateValidationResult {
  // Check for missing/null values
  if (value === null || value === undefined || value === '') {
    return { valid: false, reason: 'missing' };
  }

  // Convert value to Date
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string') {
    date = new Date(value);
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else {
    return { valid: false, reason: 'malformed' };
  }

  // Check if date is valid (invalid Dates have NaN time)
  if (isNaN(date.getTime())) {
    return { valid: false, reason: 'malformed' };
  }

  // Check reasonable date range (1970 to year 9999)
  // This catches very far future dates and intentional epoch-0 errors
  const time = date.getTime();
  if (time < 0 || time > 253402300799000) { // Jan 1, 1970 to Dec 31, 9999
    return { valid: false, reason: 'invalid-range' };
  }

  return { valid: true, date };
}

/**
 * Formats a timestamp with fallback for invalid/missing values.
 *
 * @param timestamp - The timestamp to format
 * @param locale - Optional locale for formatting (defaults to user's locale)
 * @returns Object with formatted string and availability flag
 *
 * @example
 * formatDate('2026-09-30T08:02:11Z')
 * // { isAvailable: true, formatted: 'Sep 30, 2026, 8:02 AM' }
 *
 * @example
 * formatDate(null)
 * // { isAvailable: false, formatted: 'Date unavailable' }
 */
export function formatDate(
  timestamp: unknown,
  locale?: string
): FormattedDate {
  const validation = validateTimestamp(timestamp);

  if (!validation.valid) {
    const invalidResult = validation as { valid: false; reason: string };
    return {
      isAvailable: false,
      formatted: 'Date unavailable',
      validationReason: invalidResult.reason,
    };
  }

  const validResult = validation as { valid: true; date: Date };
  try {
    const formatted = validResult.date.toLocaleString(locale || undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    return {
      isAvailable: true,
      formatted,
      date: validResult.date,
    };
  } catch (error) {
    // Fallback if toLocaleString fails (e.g., invalid locale)
    return {
      isAvailable: false,
      formatted: 'Date unavailable',
      validationReason: 'formatting-error',
    };
  }
}

/**
 * Formats a timestamp with ISO 8601 format (full precision).
 * Useful for logs, exports, or technical displays.
 *
 * @param timestamp - The timestamp to format
 * @returns Formatted ISO string or 'Invalid date'
 */
export function formatDateISO(timestamp: unknown): string {
  const validation = validateTimestamp(timestamp);

  if (!validation.valid) {
    return 'Invalid date';
  }

  try {
    return validation.date.toISOString();
  } catch {
    return 'Invalid date';
  }
}

/**
 * Formats a timestamp with relative time (e.g., "2 hours ago").
 * Requires date-fns or similar. This is a placeholder for future enhancement.
 *
 * @param timestamp - The timestamp to format
 * @returns Relative time string
 */
export function formatDateRelative(timestamp: unknown): FormattedDate {
  const validation = validateTimestamp(timestamp);

  if (!validation.valid) {
    const invalidResult = validation as { valid: false; reason: string };
    return {
      isAvailable: false,
      formatted: 'Date unavailable',
      validationReason: invalidResult.reason,
    };
  }

  const validResult = validation as { valid: true; date: Date };
  try {
    const now = new Date();
    const diffMs = now.getTime() - validResult.date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relative: string;
    if (diffSecs < 60) {
      relative = 'just now';
    } else if (diffMins < 60) {
      relative = `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      relative = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      relative = `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      relative = validation.date.toLocaleDateString();
    }

    return {
      isAvailable: true,
      formatted: relative,
      date: validResult.date,
    };
  } catch {
    return {
      isAvailable: false,
      formatted: 'Date unavailable',
      validationReason: 'formatting-error',
    };
  }
}
