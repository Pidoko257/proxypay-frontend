/**
 * Export Controls Component
 * Buttons and UI for exporting analytics reports with filter preservation
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

export const ExportControls: React.FC<ExportControlsProps> = ({ 
  analytics, 
  filters,
  onExportStart,
  onExportComplete 
}) => {
  const [dateRanges, setDateRanges] = useState<Array<{ startDate: string; endDate: string }>>(
    filters ? [{ startDate: filters.startDate, endDate: filters.endDate }] : []
  );
  const [batchError, setBatchError] = useState<string | null>(null);

  const handleExport = (format: 'json' | 'csv') => {
    onExportStart?.();
    
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const options: ExportOptions = {
        format,
        filename: `logs-analytics-${timestamp}.${getExtension(format)}`,
        filters,
      };
      
      ReportGenerator.exportReport(analytics, options);
    } finally {
      onExportComplete?.();
    }
  };

  const addDateRange = () => {
    setDateRanges((ranges) => [...ranges, { startDate: '', endDate: '' }]);
  };

  const updateDateRange = (index: number, key: 'startDate' | 'endDate', value: string) => {
    setDateRanges((ranges) => ranges.map((range, rangeIndex) =>
      rangeIndex === index ? { ...range, [key]: value } : range
    ));
  };

  const handleBatchExport = async () => {
    setBatchError(null);
    const validRanges = dateRanges.filter((range) => range.startDate && range.endDate);
    try {
      onExportStart?.();
      const items: BatchExportItem[] = validRanges.map((range) => ({
        analytics,
        filters: { ...filters, ...range } as FilterState,
        filename: `logs-analytics-${range.startDate}-to-${range.endDate}.json`,
      }));
      await ReportGenerator.exportBatch(items);
    } catch (error) {
      setBatchError(error instanceof Error ? error.message : 'Batch export failed');
    } finally {
      onExportComplete?.();
    }
  };

  const getExtension = (format: string): string => {
    switch (format) {
      case 'json': return 'json';
      case 'csv': return 'csv';
      default: return 'txt';
    }
  };

  return (
    <div className="export-controls">
      <span className="export-label">📥 Export Report:</span>
      <button 
        className="export-btn json-btn" 
        onClick={() => handleExport('json')} 
        title="Download as JSON with all data and metadata"
      >
        📋 JSON
      </button>
      <button 
        className="export-btn csv-btn" 
        onClick={() => handleExport('csv')} 
        title="Download as CSV (spreadsheet format)"
      >
        📊 CSV
      </button>
      <div className="batch-export-controls">
        <strong>Batch date ranges</strong>
        {dateRanges.map((range, index) => (
          <div key={index} className="batch-export-range">
            <input aria-label={`Batch range ${index + 1} start`} type="date" value={range.startDate} onChange={(event) => updateDateRange(index, 'startDate', event.target.value)} />
            <input aria-label={`Batch range ${index + 1} end`} type="date" value={range.endDate} onChange={(event) => updateDateRange(index, 'endDate', event.target.value)} />
          </div>
        ))}
        <button type="button" onClick={addDateRange}>+ Add range</button>
        <button type="button" onClick={handleBatchExport} disabled={dateRanges.length === 0}>📦 Export ZIP</button>
        {batchError && <span role="alert">{batchError}</span>}
      </div>
    </div>
  );
};

export default ExportControls;
