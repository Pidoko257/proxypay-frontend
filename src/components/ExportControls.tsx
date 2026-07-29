/**
 * Export Controls Component
 * Buttons and UI for exporting analytics reports
 */

import React from 'react';
import { AnalyticsResult } from '../analytics/analytics-engine';
import { ReportGenerator } from '../analytics/report-generator';

interface ExportControlsProps {
  analytics: AnalyticsResult;
}

export const ExportControls: React.FC<ExportControlsProps> = ({ analytics }) => {
  const handleExport = (format: 'json' | 'csv' | 'html' | 'markdown') => {
    const timestamp = new Date().toISOString().slice(0, 10);
    ReportGenerator.exportReport(analytics, {
      format,
      filename: `logs-analytics-${timestamp}.${getExtension(format)}`,
    });
  };

  const getExtension = (format: string): string => {
    switch (format) {
      case 'json': return 'json';
      case 'csv': return 'csv';
      case 'html': return 'html';
      case 'markdown': return 'md';
      default: return 'txt';
    }
  };

  return (
    <div className="export-controls">
      <span className="export-label">Export Report:</span>
      <button className="export-btn json-btn" onClick={() => handleExport('json')} title="Download as JSON">
        📋 JSON
      </button>
      <button className="export-btn csv-btn" onClick={() => handleExport('csv')} title="Download as CSV">
        📊 CSV
      </button>
      <button className="export-btn html-btn" onClick={() => handleExport('html')} title="Download as HTML">
        🌐 HTML
      </button>
      <button className="export-btn md-btn" onClick={() => handleExport('markdown')} title="Download as Markdown">
        📝 Markdown
      </button>
    </div>
  );
};

export default ExportControls;
