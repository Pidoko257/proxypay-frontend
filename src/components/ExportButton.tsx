import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import BrowserOnly from '@docusaurus/BrowserOnly';

export type ExportFormat = 'csv' | 'json' | 'xml';

export interface ExportRecord {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ExportButtonProps {
  /** Data rows to export */
  data: ExportRecord[];
  /** Base filename without extension */
  filename?: string;
  /** Label shown on the button */
  label?: string;
  /** Extra CSS class names */
  className?: string;
}

// ---------- format helpers ----------

function toCSV(data: ExportRecord[], includeHeaders: boolean): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const escape = (v: unknown): string => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const rows = data.map(row => headers.map(h => escape(row[h])).join(','));
  return includeHeaders ? [headers.join(','), ...rows].join('\n') : rows.join('\n');
}

function toJSON(data: ExportRecord[], beautify: boolean): string {
  return beautify ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

function toXML(data: ExportRecord[], beautify: boolean): string {
  const indent = (level: number) => (beautify ? '  '.repeat(level) : '');
  const nl = beautify ? '\n' : '';
  const sanitizeTag = (key: string) =>
    key.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/^([^a-zA-Z_])/, '_$1');
  const escapeValue = (v: unknown) =>
    String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const items = data
    .map(row => {
      const fields = Object.entries(row)
        .map(([k, v]) => `${indent(2)}<${sanitizeTag(k)}>${escapeValue(v)}</${sanitizeTag(k)}>${nl}`)
        .join('');
      return `${indent(1)}<record>${nl}${fields}${indent(1)}</record>`;
    })
    .join(nl);

  return `<?xml version="1.0" encoding="UTF-8"?>${nl}<records>${nl}${items}${nl}</records>`;
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- inner component (browser-only) ----------

function ExportButtonInner({ data, filename = 'export', label = 'Export', className }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [beautify, setBeautify] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleExport = () => {
    let content: string;
    let mimeType: string;
    let ext: string;

    switch (format) {
      case 'json':
        content = toJSON(data, beautify);
        mimeType = 'application/json';
        ext = 'json';
        break;
      case 'xml':
        content = toXML(data, beautify);
        mimeType = 'application/xml';
        ext = 'xml';
        break;
      case 'csv':
      default:
        content = toCSV(data, includeHeaders);
        mimeType = 'text/csv';
        ext = 'csv';
        break;
    }

    downloadBlob(content, `${filename}.${ext}`, mimeType);
    setOpen(false);
  };

  const formatLabels: Record<ExportFormat, string> = { csv: 'CSV', json: 'JSON', xml: 'XML' };

  return (
    <div className="export-button-wrapper">
      {/* Main trigger — shows selected format */}
      <div className="export-button-group">
        <button
          className={clsx('button button--primary', className)}
          onClick={handleExport}
          aria-label={`Export as ${formatLabels[format]}`}
        >
          ↓ Export as {formatLabels[format]}
        </button>
        <button
          ref={triggerRef}
          className="button button--primary export-button-caret"
          onClick={() => setOpen(prev => !prev)}
          aria-haspopup="true"
          aria-expanded={open}
          aria-label="Choose export format"
        >
          ▾
        </button>
      </div>

      {/* Format selector panel */}
      {open && (
        <div
          ref={panelRef}
          className="export-panel"
          role="dialog"
          aria-label="Export options"
        >
          <div className="export-panel-section">
            <span className="export-panel-label">Format</span>
            <div className="export-format-options" role="radiogroup" aria-label="Export format">
              {(['csv', 'json', 'xml'] as ExportFormat[]).map(f => (
                <label key={f} className={clsx('export-format-option', { 'export-format-option--active': format === f })}>
                  <input
                    type="radio"
                    name="export-format"
                    value={f}
                    checked={format === f}
                    onChange={() => setFormat(f)}
                  />
                  {formatLabels[f]}
                </label>
              ))}
            </div>
          </div>

          {/* Format-specific options */}
          {format === 'csv' && (
            <div className="export-panel-section">
              <label className="export-option-row">
                <input
                  type="checkbox"
                  checked={includeHeaders}
                  onChange={e => setIncludeHeaders(e.target.checked)}
                />
                <span>Include column headers</span>
              </label>
            </div>
          )}

          {(format === 'json' || format === 'xml') && (
            <div className="export-panel-section">
              <label className="export-option-row">
                <input
                  type="checkbox"
                  checked={beautify}
                  onChange={e => setBeautify(e.target.checked)}
                />
                <span>Beautify output</span>
              </label>
            </div>
          )}

          <div className="export-panel-footer">
            <button
              className="button button--primary button--sm export-panel-confirm"
              onClick={handleExport}
            >
              Download {formatLabels[format]}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- public component (SSR-safe) ----------

export default function ExportButton(props: ExportButtonProps): React.JSX.Element {
  return (
    <BrowserOnly fallback={<button className="button button--primary" disabled>Export</button>}>
      {() => <ExportButtonInner {...props} />}
    </BrowserOnly>
  );
}
