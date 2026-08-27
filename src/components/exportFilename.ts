/**
 * Filename helpers for ExportControls (#362).
 *
 * Extracted as a dependency-free module so the naming rules can be unit-tested
 * without rendering the React component.
 */

export type ExportFormat = 'json' | 'csv' | 'html' | 'markdown';

export const EXPORT_EXTENSIONS: Record<ExportFormat, string> = {
  json: 'json',
  csv: 'csv',
  html: 'html',
  markdown: 'md',
};

/**
 * Strip directory separators / illegal filename characters and any trailing
 * known extension so the value can be safely combined with a format extension.
 */
export function sanitizeFilename(name: string): string {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\.(json|csv|html|md|txt)$/i, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Suggested base name, e.g. `logs-analytics-2026-08-25`. */
export function suggestedFilename(date: Date = new Date()): string {
  return `logs-analytics-${date.toISOString().slice(0, 10)}`;
}

/** Combine a (possibly custom) base name with the format's extension. */
export function resolveFilename(base: string, format: ExportFormat): string {
  const clean = sanitizeFilename(base) || suggestedFilename();
  return `${clean}.${EXPORT_EXTENSIONS[format]}`;
}
