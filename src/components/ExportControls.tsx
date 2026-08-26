/**
 * Export Controls Component
 * Buttons and UI for exporting analytics reports
 */

import React, { useMemo, useState } from 'react';
import { AnalyticsResult } from '../analytics/analytics-engine';
import { ReportGenerator } from '../analytics/report-generator';
import {
  ExportFormat,
  resolveFilename,
  sanitizeFilename,
  suggestedFilename,
} from './exportFilename';

interface ExportControlsProps {
  analytics: AnalyticsResult;
}

export const ExportControls: React.FC<ExportControlsProps> = ({ analytics }) => {
  // #362: let the user customise the filename before download ("Save As").
  const defaultName = useMemo(() => suggestedFilename(), []);
  const [filename, setFilename] = useState<string>(defaultName);

  const handleExport = (format: ExportFormat) => {
    ReportGenerator.exportReport(analytics, {
      format,
      filename: resolveFilename(filename, format),
    });
  };

  return (
    <div className="export-controls">
      <label className="export-filename">
        <span className="export-label">Save As:</span>
        <input
          type="text"
          className="export-filename-input"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          onBlur={() => {
            if (!sanitizeFilename(filename)) setFilename(defaultName);
          }}
          placeholder={defaultName}
          aria-label="Export filename"
          spellCheck={false}
        />
        <span className="export-filename-hint">{resolveFilename(filename, 'csv')}</span>
      </label>

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
