/**
 * CSV export utilities.
 *
 * Provides a small, dependency-free CSV serializer with proper escaping and
 * a guard against CSV injection (formula injection) attacks.
 */

export interface CSVColumn<T> {
  /** Header label written to the first row. */
  header: string;
  /** Extracts the cell value for a given row. */
  value: (row: T) => unknown;
}

export const CSVExporter = {
  /**
   * Escape a single CSV cell value.
   *
   * - `null` / `undefined` become an empty string.
   * - Values beginning with a formula trigger (`=`, `+`, `-`, `@`, tab, CR)
   *   are prefixed with a single quote to prevent CSV injection.
   * - Values containing a comma, double quote, CR, or LF are wrapped in
   *   double quotes, with embedded quotes doubled.
   */
  escapeCsvValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    let str = String(value);

    // Guard against CSV injection: neutralize leading formula characters.
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    if (/[",\r\n]/.test(str)) {
      str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  },

  /**
   * Serialize rows into a CSV string using the provided column definitions.
   */
  toCsv<T>(rows: T[], columns: CSVColumn<T>[]): string {
    const header = columns
      .map((col) => CSVExporter.escapeCsvValue(col.header))
      .join(',');

    const body = rows.map((row) =>
      columns
        .map((col) => CSVExporter.escapeCsvValue(col.value(row)))
        .join(','),
    );

    return [header, ...body].join('\n');
  },

  /**
   * Build a CSV string and trigger a browser download.
   */
  download<T>(filename: string, rows: T[], columns: CSVColumn<T>[]): void {
    const csv = CSVExporter.toCsv(rows, columns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
