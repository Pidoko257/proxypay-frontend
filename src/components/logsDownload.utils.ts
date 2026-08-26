/**
 * Pure helpers for downloading dashboard log/analytics data.
 * JSX-free so they can be unit-tested in isolation.
 */

export type DownloadFormat = 'json' | 'csv';

export interface DownloadFilters {
  [key: string]: string | number | undefined | null;
}

/** Slugify a filter value for safe use inside a filename. */
function slug(value: string | number): string {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

/**
 * Build a descriptive filename that embeds the active filters, e.g.
 * `logs_endpoint-payments_status-5xx_2026-08-26.csv`
 */
export function buildDownloadFilename(
  base: string,
  filters: DownloadFilters,
  format: DownloadFormat,
  now: Date = new Date(),
): string {
  const parts = [base];
  Object.keys(filters).forEach((key) => {
    const raw = filters[key];
    if (raw === undefined || raw === null || raw === '') return;
    parts.push(`${slug(key)}-${slug(raw)}`);
  });
  parts.push(now.toISOString().slice(0, 10));
  return `${parts.join('_')}.${format}`;
}

/** Escape a single CSV field per RFC 4180. */
function csvField(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Convert an array of flat records into a CSV string. */
export function toCSV(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return '';
  const columns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
  const lines = [columns.map(csvField).join(',')];
  rows.forEach((row) => {
    lines.push(columns.map((col) => csvField(row[col])).join(','));
  });
  return lines.join('\n');
}

/** Serialize records to the requested format. */
export function serializeRows(
  rows: Array<Record<string, unknown>>,
  format: DownloadFormat,
): { content: string; mimeType: string } {
  if (format === 'csv') {
    return { content: toCSV(rows), mimeType: 'text/csv;charset=utf-8' };
  }
  return { content: JSON.stringify(rows, null, 2), mimeType: 'application/json' };
}

/**
 * Trigger a client-side file download. No-op outside the browser so it is safe
 * to import in tests.
 */
export function triggerDownload(filename: string, content: string, mimeType: string): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
    return false;
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}
