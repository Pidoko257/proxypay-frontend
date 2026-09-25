/**
 * Export Controls Component
 * Buttons and UI for exporting analytics reports with filter preservation.
 *
 * Fix #352:
 *  - handleExport is fully wired: builds a real CSV from filteredLogs (or
 *    analytics data) and triggers a browser download via a Blob URL.
 *  - The filename includes the active date range from FilterState.
 *  - The CSV and JSON export buttons are disabled (with aria-label) when
 *    there is no data to export (totalRequests === 0).
 */

import React, { useState } from 'react';
import { AnalyticsResult } from '../analytics/analytics-engine';
import { ReportGenerator, ExportOptions, BatchExportItem } from '../analytics/report-generator';

export interface FilterState {
  startDate: string;
  endDate: string;
  endpoint: string;
  method: string;
  statusCode: string;
  minResponseTime: number;
  maxResponseTime: number;
}

interface ExportControlsProps {
  analytics: AnalyticsResult;
  filters?: FilterState;
  onExportStart?: () => void;
  onExportComplete?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape a single CSV cell value: wrap in double-quotes if the value contains
 * a comma, double-quote, or newline; escape inner double-quotes by doubling.
 */
function csvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build a CSV string from an AnalyticsResult.
 * Exports the topEndpoints table as the primary dataset.
 */
function buildCsv(analytics: AnalyticsResult): string {
  const header = ['Endpoint', 'Method', 'Requests', 'Avg Response Time (ms)', 'Error Rate (%)'];
  const rows = analytics.topEndpoints.map(ep => [
    ep.endpoint,
    ep.method,
    ep.count,
    Math.round(ep.avgResponseTime),
    ep.errorRate.toFixed(2),
  ]);

  return [header, ...rows]
    .map(row => row.map(csvCell).join(','))
    .join('\n');
}

/**
 * Build a filename that includes the active date range.
 * e.g. `logs_2026-01-01_2026-01-31.csv`
 * Falls back to `logs_all.<ext>` when no filters are provided.
 */
function buildFilename(filters: FilterState | undefined, ext: string): string {
  if (filters?.startDate && filters?.endDate) {
    return `logs_${filters.startDate}_${filters.endDate}.${ext}`;
  }
  return `logs_all.${ext}`;
}

/**
 * Trigger a browser file download from an in-memory string.
 */
function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ExportControls: React.FC<ExportControlsProps> = ({
  analytics,
  filters,
  onExportStart,
  onExportComplete,
}) => {
  const [dateRanges, setDateRanges] = useState<Array<{ startDate: string; endDate: string }>>(
    filters ? [{ startDate: filters.startDate, endDate: filters.endDate }] : []
  );
  const [batchError, setBatchError] = useState<string | null>(null);

  /** True when there is nothing to export. */
  const isEmpty = analytics.totalRequests === 0;

  /**
   * #352: Fully wired export handler.
   *  - CSV: builds in-memory CSV from analytics.topEndpoints, then downloads.
   *  - JSON: delegates to ReportGenerator (existing behaviour) but uses the
   *    filter-aware filename.
   */
  const handleExport = (format: 'json' | 'csv') => {
    if (isEmpty) return;
    onExportStart?.();

    try {
      if (format === 'csv') {
        const csv = buildCsv(analytics);
        const filename = buildFilename(filters, 'csv');
        triggerDownload(csv, filename, 'text/csv;charset=utf-8;');
      } else {
        const filename = buildFilename(filters, 'json');
        const options: ExportOptions = {
          format,
          filename,
          filters,
        };
        ReportGenerator.exportReport(analytics, options);
      }
    } finally {
      onExportComplete?.();
    }
  };

  const addDateRange = () => {
    setDateRanges((ranges) => [...ranges, { startDate: '', endDate: '' }]);
  };

  const updateDateRange = (index: number, key: 'startDate' | 'endDate', value: string) => {
    setDateRanges((ranges) =>
      ranges.map((range, rangeIndex) =>
        rangeIndex === index ? { ...range, [key]: value } : range
      )
    );
  };

  const handleBatchExport = async () => {
    setBatchError(null);
    const validRanges = dateRanges.filter((range) => range.startDate && range.endDate);
    try {
      onExportStart?.();
      const items: BatchExportItem[] = validRanges.map((range) => ({
        analytics,
        filters: { ...filters, ...range } as FilterState,
        filename: `logs_${range.startDate}_${range.endDate}.json`,
      }));
      await ReportGenerator.exportBatch(items);
    } catch (error) {
      setBatchError(error instanceof Error ? error.message : 'Batch export failed');
    } finally {
      onExportComplete?.();
    }
  };

  const disabledTitle = isEmpty ? 'No data to export' : undefined;

  return (
    <div className="export-controls">
      <span className="export-label">📥 Export Report:</span>

      {/* JSON export — disabled when no data */}
      <button
        className="export-btn json-btn"
        onClick={() => handleExport('json')}
        disabled={isEmpty}
        title={disabledTitle ?? 'Download as JSON with all data and metadata'}
        aria-label={isEmpty ? 'Export JSON — no data available' : 'Export as JSON'}
        data-testid="export-json-btn"
      >
        📋 JSON
      </button>

      {/* CSV export — disabled when no data */}
      <button
        className="export-btn csv-btn"
        onClick={() => handleExport('csv')}
        disabled={isEmpty}
        title={disabledTitle ?? 'Download as CSV (spreadsheet format)'}
        aria-label={isEmpty ? 'Export CSV — no data available' : 'Export as CSV'}
        data-testid="export-csv-btn"
      >
        📊 CSV
      </button>

      <div className="batch-export-controls">
        <strong>Batch date ranges</strong>
        {dateRanges.map((range, index) => (
          <div key={index} className="batch-export-range">
            <input
              aria-label={`Batch range ${index + 1} start`}
              type="date"
              value={range.startDate}
              onChange={(event) => updateDateRange(index, 'startDate', event.target.value)}
            />
            <input
              aria-label={`Batch range ${index + 1} end`}
              type="date"
              value={range.endDate}
              onChange={(event) => updateDateRange(index, 'endDate', event.target.value)}
            />
          </div>
        ))}
        <button type="button" onClick={addDateRange}>
          + Add range
        </button>
        <button
          type="button"
          onClick={handleBatchExport}
          disabled={dateRanges.length === 0}
        >
          📦 Export ZIP
        </button>
        {batchError && <span role="alert">{batchError}</span>}
      </div>
    </div>
  );
};

export { buildCsv, buildFilename, triggerDownload };
export default ExportControls;
