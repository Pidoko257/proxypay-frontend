/**
 * CSV export utilities.
 */

/**
 * Escape a value for inclusion in a CSV cell.
 * Wraps in quotes when the value contains a comma, quote, or newline,
 * and doubles any embedded quotes.
 */
export function escapeCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export class CSVExporter {
  static escapeValue(value: unknown): string {
    return escapeCsvValue(value);
  }

  static toRow(values: unknown[]): string {
    return values.map((v) => escapeCsvValue(v)).join(',');
  }

  static toCsv(rows: unknown[][]): string {
    return rows.map((row) => CSVExporter.toRow(row)).join('\n');
  }
}
