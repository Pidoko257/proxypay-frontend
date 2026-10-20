import React, { useState, useEffect } from 'react';

interface Filters {
  status: string;
  amountMin: string;
  amountMax: string;
  dateFrom: string;
  dateTo: string;
  currency: string;
}

interface QueryTemplate {
  name: string;
  description: string;
  filters: Filters;
  createdAt: string;
}

const STORAGE_KEY = 'proxypay_query_templates';

const defaultFilters: Filters = {
  status: '',
  amountMin: '',
  amountMax: '',
  dateFrom: '',
  dateTo: '',
  currency: '',
};

function encodeFilters(filters: Filters): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(filters))));
}

function decodeFilters(encoded: string): Filters | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded)))) as Filters;
  } catch {
    return null;
  }
}

function loadTemplates(): QueryTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueryTemplate[];
  } catch {
    return [];
  }
}

function saveTemplates(templates: QueryTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export default function QueryTemplates(): JSX.Element {
  const [templates, setTemplates] = useState<QueryTemplate[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [copyMsg, setCopyMsg] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  // On mount: load templates from localStorage and auto-load ?t= param
  useEffect(() => {
    setTemplates(loadTemplates());

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('t');
      if (t) {
        const decoded = decodeFilters(t);
        if (decoded) {
          setFilters(decoded);
        }
      }
    }
  }, []);

  function handleFilterChange(field: keyof Filters, value: string): void {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave(): void {
    if (!templateName.trim()) {
      setSaveMsg('Please enter a template name.');
      setTimeout(() => setSaveMsg(''), 3000);
      return;
    }
    const newTemplate: QueryTemplate = {
      name: templateName.trim(),
      description: templateDesc.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString(),
    };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    saveTemplates(updated);
    setTemplateName('');
    setTemplateDesc('');
    setSaveMsg('Template saved!');
    setTimeout(() => setSaveMsg(''), 3000);
  }

  function handleLoad(template: QueryTemplate): void {
    setFilters({ ...template.filters });
  }

  function handleDelete(index: number): void {
    const updated = templates.filter((_, i) => i !== index);
    setTemplates(updated);
    saveTemplates(updated);
  }

  function handleCopyLink(): void {
    if (typeof window === 'undefined') return;
    const encoded = encodeFilters(filters);
    const url = `${window.location.origin}${window.location.pathname}?t=${encoded}`;
    navigator.clipboard.writeText(url).then(
      () => {
        setCopyMsg('Link copied!');
        setTimeout(() => setCopyMsg(''), 3000);
      },
      () => {
        setCopyMsg('Failed to copy.');
        setTimeout(() => setCopyMsg(''), 3000);
      }
    );
  }

  function handleClearFilters(): void {
    setFilters(defaultFilters);
    if (typeof window !== 'undefined') {
      const url = window.location.pathname;
      window.history.replaceState({}, '', url);
    }
  }

  const brand = '#2e8555';

  return (
    <>
      <style>{`
        .qt-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          max-width: 860px;
          margin: 0 auto;
          padding: 24px 16px;
          color: #1c1e21;
        }
        .qt-container h2 {
          color: ${brand};
          margin-bottom: 4px;
        }
        .qt-container p.subtitle {
          color: #555;
          margin-top: 0;
          margin-bottom: 24px;
        }
        .qt-card {
          border: 1px solid #dde1e7;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
          background: #fff;
        }
        .qt-card h3 {
          margin-top: 0;
          color: ${brand};
          font-size: 1rem;
          border-bottom: 1px solid #eee;
          padding-bottom: 8px;
          margin-bottom: 16px;
        }
        .qt-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 600px) {
          .qt-grid { grid-template-columns: 1fr; }
        }
        .qt-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .qt-field label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #444;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .qt-field input, .qt-field select {
          padding: 8px 10px;
          border: 1px solid #cdd1d9;
          border-radius: 5px;
          font-size: 0.9rem;
          transition: border-color 0.15s;
          background: #fafbfc;
        }
        .qt-field input:focus, .qt-field select:focus {
          outline: none;
          border-color: ${brand};
          background: #fff;
        }
        .qt-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: opacity 0.15s, transform 0.1s;
        }
        .qt-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .qt-btn:active { transform: translateY(0); }
        .qt-btn-primary { background: ${brand}; color: #fff; }
        .qt-btn-secondary { background: #e8f5ee; color: ${brand}; border: 1px solid ${brand}; }
        .qt-btn-danger { background: #fff0f0; color: #c0392b; border: 1px solid #e8a0a0; }
        .qt-btn-small { padding: 4px 10px; font-size: 0.8rem; }
        .qt-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          flex-wrap: wrap;
          align-items: center;
        }
        .qt-msg {
          font-size: 0.85rem;
          padding: 4px 10px;
          border-radius: 4px;
          background: #e8f5ee;
          color: ${brand};
          font-weight: 500;
        }
        .qt-save-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        @media (max-width: 600px) {
          .qt-save-row { grid-template-columns: 1fr; }
        }
        .qt-template-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .qt-template-item {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f0f2f5;
          gap: 12px;
        }
        .qt-template-item:last-child { border-bottom: none; }
        .qt-template-info { flex: 1; min-width: 0; }
        .qt-template-name {
          font-weight: 700;
          font-size: 0.95rem;
          color: #1c1e21;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .qt-template-desc {
          font-size: 0.82rem;
          color: #666;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .qt-template-meta {
          font-size: 0.75rem;
          color: #999;
          margin-top: 4px;
        }
        .qt-template-btns {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }
        .qt-empty {
          text-align: center;
          color: #999;
          font-size: 0.9rem;
          padding: 24px 0;
        }
        .qt-filters-preview {
          font-size: 0.78rem;
          color: #777;
          margin-top: 4px;
        }
        .qt-filters-preview code {
          background: #f4f6fa;
          border-radius: 3px;
          padding: 1px 4px;
        }
      `}</style>

      <div className="qt-container">
        <h2>Query Template System</h2>
        <p className="subtitle">
          Save, load, and share named filter combinations for transaction queries.
        </p>

        {/* Filter Builder */}
        <div className="qt-card">
          <h3>Current Filters</h3>
          <div className="qt-grid">
            <div className="qt-field">
              <label>Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Any</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>
            <div className="qt-field">
              <label>Currency</label>
              <select
                value={filters.currency}
                onChange={(e) => handleFilterChange('currency', e.target.value)}
              >
                <option value="">Any</option>
                <option value="USD">USD</option>
                <option value="XLM">XLM</option>
                <option value="KES">KES</option>
                <option value="GHS">GHS</option>
                <option value="NGN">NGN</option>
              </select>
            </div>
            <div className="qt-field">
              <label>Min Amount</label>
              <input
                type="number"
                placeholder="0.00"
                value={filters.amountMin}
                onChange={(e) => handleFilterChange('amountMin', e.target.value)}
              />
            </div>
            <div className="qt-field">
              <label>Max Amount</label>
              <input
                type="number"
                placeholder="No limit"
                value={filters.amountMax}
                onChange={(e) => handleFilterChange('amountMax', e.target.value)}
              />
            </div>
            <div className="qt-field">
              <label>Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div className="qt-field">
              <label>Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>

          <div className="qt-actions">
            <button className="qt-btn qt-btn-secondary" onClick={handleCopyLink}>
              🔗 Copy Share Link
            </button>
            <button className="qt-btn qt-btn-secondary" onClick={handleClearFilters}>
              ✕ Clear Filters
            </button>
            {copyMsg && <span className="qt-msg">{copyMsg}</span>}
          </div>
        </div>

        {/* Save Template */}
        <div className="qt-card">
          <h3>Save as Template</h3>
          <div className="qt-save-row">
            <div className="qt-field">
              <label>Template Name *</label>
              <input
                type="text"
                placeholder="e.g. Failed USD transactions"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="qt-field">
              <label>Description</label>
              <input
                type="text"
                placeholder="Optional description"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
              />
            </div>
          </div>
          <div className="qt-actions">
            <button className="qt-btn qt-btn-primary" onClick={handleSave}>
              💾 Save Template
            </button>
            {saveMsg && <span className="qt-msg">{saveMsg}</span>}
          </div>
        </div>

        {/* Template List */}
        <div className="qt-card">
          <h3>Saved Templates ({templates.length})</h3>
          {templates.length === 0 ? (
            <div className="qt-empty">No templates saved yet. Configure filters above and save one.</div>
          ) : (
            <ul className="qt-template-list">
              {templates.map((tpl, idx) => (
                <li key={idx} className="qt-template-item">
                  <div className="qt-template-info">
                    <div className="qt-template-name">{tpl.name}</div>
                    {tpl.description && (
                      <div className="qt-template-desc">{tpl.description}</div>
                    )}
                    <div className="qt-filters-preview">
                      {Object.entries(tpl.filters)
                        .filter(([, v]) => v !== '')
                        .map(([k, v]) => (
                          <span key={k} style={{ marginRight: 6 }}>
                            <code>{k}</code>: {v}
                          </span>
                        ))}
                    </div>
                    <div className="qt-template-meta">
                      Saved {new Date(tpl.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="qt-template-btns">
                    <button
                      className="qt-btn qt-btn-secondary qt-btn-small"
                      onClick={() => handleLoad(tpl)}
                    >
                      ↩ Load
                    </button>
                    <button
                      className="qt-btn qt-btn-danger qt-btn-small"
                      onClick={() => handleDelete(idx)}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
