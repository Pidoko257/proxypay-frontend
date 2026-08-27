/**
 * Export Controls Component
 * Buttons and UI for exporting analytics reports with filter preservation
 */

import React, { useMemo, useState } from 'react';
import { AnalyticsResult } from '../analytics/analytics-engine';
import { ReportGenerator, ExportOptions } from '../analytics/report-generator';

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
    </div>
  );
};

export default ExportControls;
