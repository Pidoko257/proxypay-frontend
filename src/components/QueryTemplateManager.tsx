import React, { useState, useEffect } from 'react';

export interface QueryFilters {
  [key: string]: string | number | boolean | undefined;
}

export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  filters: QueryFilters;
  createdAt: string;
}

const STORAGE_KEY = 'proxypay_query_templates';

function loadTemplates(): QueryTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueryTemplate[]) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: QueryTemplate[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // storage full or unavailable
  }
}

function encodeFiltersToUrl(filters: QueryFilters): string {
  if (typeof window === 'undefined') return '';
  try {
    const json = JSON.stringify(filters);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    const url = new URL(window.location.href);
    url.searchParams.set('tpl', b64);
    return url.toString();
  } catch {
    return window.location.href;
  }
}

function decodeFiltersFromUrl(): QueryFilters | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const b64 = params.get('tpl');
    if (!b64) return null;
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json) as QueryFilters;
  } catch {
    return null;
  }
}

interface QueryTemplateManagerProps {
  /** The current active filters that can be saved as a template */
  currentFilters?: QueryFilters;
  /** Called when the user loads a template */
  onLoad?: (template: QueryTemplate) => void;
}

export default function QueryTemplateManager({
  currentFilters = {},
  onLoad,
}: QueryTemplateManagerProps): React.JSX.Element {
  const [templates, setTemplates] = useState<QueryTemplate[]>([]);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [notification, setNotification] = useState('');

  useEffect(() => {
    setTemplates(loadTemplates());
    // Auto-load from URL if present
    const fromUrl = decodeFiltersFromUrl();
    if (fromUrl && onLoad) {
      const urlTemplate: QueryTemplate = {
        id: 'url-import',
        name: 'Shared Template',
        description: 'Loaded from shared URL',
        filters: fromUrl,
        createdAt: new Date().toISOString(),
      };
      onLoad(urlTemplate);
    }
  }, []);

  function notify(msg: string): void {
    setNotification(msg);
    setTimeout(() => setNotification(''), 2500);
  }

  function handleSave(): void {
    if (!newName.trim()) {
      setSaveError('Template name is required.');
      return;
    }
    setSaveError('');
    const template: QueryTemplate = {
      id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: newName.trim(),
      description: newDescription.trim(),
      filters: currentFilters,
      createdAt: new Date().toISOString(),
    };
    const updated = [...templates, template];
    setTemplates(updated);
    saveTemplates(updated);
    setNewName('');
    setNewDescription('');
    notify('Template saved.');
  }

  function handleLoad(template: QueryTemplate): void {
    onLoad?.(template);
    notify(`Loaded "${template.name}".`);
  }

  function handleDelete(id: string): void {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
    notify('Template deleted.');
  }

  function startRename(template: QueryTemplate): void {
    setRenamingId(template.id);
    setRenameValue(template.name);
  }

  function commitRename(id: string): void {
    if (!renameValue.trim()) return;
    const updated = templates.map((t) =>
      t.id === id ? { ...t, name: renameValue.trim() } : t,
    );
    setTemplates(updated);
    saveTemplates(updated);
    setRenamingId(null);
    notify('Template renamed.');
  }

  function handleShare(template: QueryTemplate): void {
    const url = encodeFiltersToUrl(template.filters);
    setShareUrl(url);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => notify('Share URL copied to clipboard.'));
    }
  }

  const containerStyle: React.CSSProperties = {
    border: '1px solid var(--ifm-color-emphasis-300)',
    borderRadius: 8,
    padding: '1.25rem',
    marginBottom: '1.5rem',
    background: 'var(--ifm-background-surface-color)',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 120,
    padding: '6px 10px',
    borderRadius: 4,
    border: '1px solid var(--ifm-color-emphasis-400)',
    fontSize: 14,
    background: 'var(--ifm-background-color)',
    color: 'var(--ifm-font-color-base)',
  };

  const smallBtnStyle: React.CSSProperties = {
    padding: '4px 10px',
    fontSize: 12,
    borderRadius: 4,
    cursor: 'pointer',
    border: '1px solid var(--ifm-color-emphasis-400)',
    background: 'var(--ifm-background-color)',
    color: 'var(--ifm-font-color-base)',
  };

  const primaryBtnStyle: React.CSSProperties = {
    ...smallBtnStyle,
    background: 'var(--ifm-color-primary)',
    color: '#fff',
    border: 'none',
  };

  const dangerBtnStyle: React.CSSProperties = {
    ...smallBtnStyle,
    background: '#dc2626',
    color: '#fff',
    border: 'none',
  };

  return (
    <div style={containerStyle}>
      <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: 16 }}>
        Query Templates
      </h3>

      {notification && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: '6px 12px',
            background: 'var(--ifm-color-primary-lightest)',
            color: '#fff',
            borderRadius: 4,
            marginBottom: 8,
            fontSize: 13,
          }}
        >
          {notification}
        </div>
      )}

      {/* Save new template */}
      <div style={rowStyle}>
        <input
          style={inputStyle}
          type="text"
          placeholder="Template name *"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          aria-label="Template name"
        />
        <input
          style={inputStyle}
          type="text"
          placeholder="Description (optional)"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          aria-label="Template description"
        />
        <button style={primaryBtnStyle} onClick={handleSave}>
          Save Current Filters
        </button>
      </div>
      {saveError && (
        <p role="alert" style={{ color: '#dc2626', fontSize: 12, margin: '0 0 8px' }}>
          {saveError}
        </p>
      )}

      {/* Template list */}
      {templates.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ifm-color-emphasis-600)', margin: 0 }}>
          No templates saved yet. Configure filters and click &quot;Save Current Filters&quot;.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {templates.map((tpl) => (
            <li
              key={tpl.id}
              style={{
                borderTop: '1px solid var(--ifm-color-emphasis-200)',
                paddingTop: 10,
                paddingBottom: 10,
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {renamingId === tpl.id ? (
                  <>
                    <input
                      style={{ ...inputStyle, flex: '0 0 180px' }}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(tpl.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      aria-label="Rename template"
                      autoFocus
                    />
                    <button style={primaryBtnStyle} onClick={() => commitRename(tpl.id)}>
                      OK
                    </button>
                    <button style={smallBtnStyle} onClick={() => setRenamingId(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{tpl.name}</span>
                    <button style={primaryBtnStyle} onClick={() => handleLoad(tpl)}>
                      Load
                    </button>
                    <button style={smallBtnStyle} onClick={() => startRename(tpl)}>
                      Rename
                    </button>
                    <button style={smallBtnStyle} onClick={() => handleShare(tpl)}>
                      Share
                    </button>
                    <button style={dangerBtnStyle} onClick={() => handleDelete(tpl.id)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
              {tpl.description && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ifm-color-emphasis-600)' }}>
                  {tpl.description}
                </p>
              )}
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ifm-color-emphasis-500)' }}>
                Saved: {new Date(tpl.createdAt).toLocaleString()} &nbsp;|&nbsp;
                Filters: {Object.keys(tpl.filters).length} key(s)
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Share URL display */}
      {shareUrl && (
        <div
          style={{
            marginTop: 12,
            padding: '8px 12px',
            background: 'var(--ifm-color-emphasis-100)',
            borderRadius: 4,
            fontSize: 12,
            wordBreak: 'break-all',
          }}
        >
          <strong>Share URL:</strong>{' '}
          <a href={shareUrl} target="_blank" rel="noreferrer">
            {shareUrl}
          </a>{' '}
          <button
            style={{ ...smallBtnStyle, marginLeft: 6 }}
            onClick={() => setShareUrl(null)}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
