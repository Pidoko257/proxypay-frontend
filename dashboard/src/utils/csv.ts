/**
 * CSV export utilities
 */

export interface CSVColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  header: string;
  formatter?: (value: unknown, row: T) => string;
}

export interface CSVExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  delimiter?: string;
}

export class CSVExporter {
  private static readonly DEFAULT_DELIMITER = ',';
  private static readonly DEFAULT_FILENAME = 'export.csv';

  /**
   * Escape a CSV value to prevent injection attacks and handle special characters
   */
  private static escapeCsvValue(value: string, guardInjection: boolean = true): string {
    if (value === null || value === undefined) {
      return '';
    }

    let escaped = String(value);

    // Guard against CSV injection (formula injection)
    if (guardInjection) {
      const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
      if (dangerousChars.some((char) => escaped.startsWith(char))) {
        escaped = `'${escaped}`;
      }
    }

    // Escape quotes and wrap in quotes if necessary
    if (escaped.includes('"') || escaped.includes(',') || escaped.includes('\n') || escaped.includes('\r')) {
      escaped = `"${escaped.replace(/"/g, '""')}"`;
    }

    return escaped;
  }

  /**
   * Generate CSV content from an array of objects
   */
  static generateCSV<T extends Record<string, unknown>>(
    data: T[],
    columns: CSVColumn<T>[],
    options: CSVExportOptions = {}
  ): string {
    const { includeHeaders = true, delimiter = this.DEFAULT_DELIMITER } = options;

    if (!data || data.length === 0) {
      return '';
    }

    const lines: string[] = [];

    // Add headers
    if (includeHeaders) {
      const headers = columns.map((col) => this.escapeCsvValue(col.header, true));
      lines.push(headers.join(delimiter));
    }

    // Add data rows
    data.forEach((row) => {
      const values = columns.map((col) => {
        const value = row[col.key as keyof T];
        const formatted = col.formatter ? col.formatter(value, row) : value;
        return this.escapeCsvValue(String(formatted), true);
      });
      lines.push(values.join(delimiter));
    });

    return lines.join('\n');
  }

  /**
   * Download CSV content as a file
   */
  static downloadCSV(content: string, filename: string = this.DEFAULT_FILENAME): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export data directly to CSV file
   */
  static exportToCSV<T extends Record<string, unknown>>(
    data: T[],
    columns: CSVColumn<T>[],
    options: CSVExportOptions = {}
  ): void {
    const content = this.generateCSV(data, columns, options);
    const filename = options.filename || this.DEFAULT_FILENAME;
    this.downloadCSV(content, filename);
  }
}
