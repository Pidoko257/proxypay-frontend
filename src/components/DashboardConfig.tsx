import React, { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Dashboard configuration shape.
 * Every exported/imported config carries a version field so older or newer
 * configurations can be migrated safely.
 */
export interface DashboardConfigData {
  version: number;
  theme: 'light' | 'dark' | 'auto';
  defaultTransactionView: 'list' | 'table' | 'cards';
  refreshIntervalSeconds: number;
  showNotifications: boolean;
  currency: string;
  hiddenColumns: string[];
  customWidgets: { id: string; name: string; enabled: boolean }[];
}

/** Current schema version for dashboard configurations. */
const CONFIG_VERSION = 1;

const DEFAULT_CONFIG: DashboardConfigData = {
  version: CONFIG_VERSION,
  theme: 'light',
  defaultTransactionView: 'table',
  refreshIntervalSeconds: 30,
  showNotifications: true,
  currency: 'USD',
  hiddenColumns: [],
  customWidgets: [
    { id: 'volume', name: 'Transaction Volume', enabled: true },
    { id: 'success-rate', name: 'Success Rate', enabled: true },
    { id: 'top-corridors', name: 'Top Corridors', enabled: false },
  ],
};

const STORAGE_KEY = 'proxypay-dashboard-config';

/** Validate an unknown object against the DashboardConfigData schema. */
function validateConfig(input: unknown): { valid: boolean; errors: string[]; config?: DashboardConfigData } {
  const errors: string[] = [];

  if (typeof input !== 'object' || input === null) {
    return { valid: false, errors: ['Configuration must be a JSON object.'] };
  }

  const obj = input as Record<string, unknown>;

  if (typeof obj.version !== 'number' || !Number.isInteger(obj.version)) {
    errors.push('`version` must be an integer.');
  }

  if (!['light', 'dark', 'auto'].includes(obj.theme as string)) {
    errors.push('`theme` must be one of: light, dark, auto.');
  }

  if (!['list', 'table', 'cards'].includes(obj.defaultTransactionView as string)) {
    errors.push('`defaultTransactionView` must be one of: list, table, cards.');
  }

  if (typeof obj.refreshIntervalSeconds !== 'number' || obj.refreshIntervalSeconds < 0) {
    errors.push('`refreshIntervalSeconds` must be a non-negative number.');
  }

  if (typeof obj.showNotifications !== 'boolean') {
    errors.push('`showNotifications` must be a boolean.');
  }

  if (typeof obj.currency !== 'string' || (obj.currency as string).length === 0) {
    errors.push('`currency` must be a non-empty string.');
  }

  if (!Array.isArray(obj.hiddenColumns)) {
    errors.push('`hiddenColumns` must be an array of strings.');
  }

  if (!Array.isArray(obj.customWidgets)) {
    errors.push('`customWidgets` must be an array.');
  } else {
    obj.customWidgets.forEach((w, i) => {
      const widget = w as Record<string, unknown>;
      if (typeof widget.id !== 'string' || typeof widget.name !== 'string' || typeof widget.enabled !== 'boolean') {
        errors.push(`customWidgets[${i}] must have { id: string, name: string, enabled: boolean }.`);
      }
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], config: obj as unknown as DashboardConfigData };
}

export default function DashboardConfig(): React.JSX.Element {
  const [config, setConfig] = useState<DashboardConfigData>(DEFAULT_CONFIG);
  const [previewConfig, setPreviewConfig] = useState<DashboardConfigData | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [shareLink, setShareLink] = useState<string>('');
  const [importedFileName, setImportedFileName] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved config from localStorage on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const { valid, config: validated } = validateConfig(parsed);
        if (valid && validated) {
          setConfig(validated);
        }
      }
    } catch {
      // ignore parse errors, fall back to defaults
    }
  }, []);

  // Persist config to localStorage whenever it changes.
  const persistConfig = useCallback((next: DashboardConfigData) => {
    setConfig(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  /** Export the current configuration as a downloadable JSON file. */
  const handleExport = useCallback(() => {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-config-v${config.version}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage('Configuration exported as JSON.');
  }, [config]);

  /** Read an imported file and validate its contents, showing a preview. */
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result as string;
        const parsed = JSON.parse(raw);
        const { valid, errors, config: validated } = validateConfig(parsed);
        if (valid && validated) {
          setPreviewConfig(validated);
          setImportErrors([]);
          setStatusMessage(`Imported "${file.name}" — preview ready. Review and apply.`);
        } else {
          setPreviewConfig(null);
          setImportErrors(errors);
          setStatusMessage(`Import failed: ${errors.length} validation error(s).`);
        }
      } catch {
        setPreviewConfig(null);
        setImportErrors(['File is not valid JSON.']);
        setStatusMessage('Import failed: file is not valid JSON.');
      }
    };
    reader.readAsText(file);
  }, []);

  /** Apply the previewed (validated) configuration. */
  const handleApplyPreview = useCallback(() => {
    if (previewConfig) {
      persistConfig(previewConfig);
      setPreviewConfig(null);
      setImportedFileName('');
      setStatusMessage('Imported configuration applied successfully.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [previewConfig, persistConfig]);

  /** Cancel the pending import preview. */
  const handleCancelPreview = useCallback(() => {
    setPreviewConfig(null);
    setImportErrors([]);
    setImportedFileName('');
    setStatusMessage('Import cancelled.');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /** Generate a shareable link with the config encoded in the URL hash. */
  const handleShare = useCallback(() => {
    const encoded = encodeURIComponent(JSON.stringify(config));
    const link = `${window.location.origin}${window.location.pathname}#config=${encoded}`;
    setShareLink(link);
    setStatusMessage('Share link generated.');
  }, [config]);

  /** Load a config from a share link (URL hash). */
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#config=')) {
      try {
        const encoded = hash.slice('#config='.length);
        const parsed = JSON.parse(decodeURIComponent(encoded));
        const { valid, errors, config: validated } = validateConfig(parsed);
        if (valid && validated) {
          setPreviewConfig(validated);
          setImportErrors([]);
          setStatusMessage('Configuration loaded from share link — review and apply.');
        } else {
          setImportErrors(errors);
          setStatusMessage('Share link contained an invalid configuration.');
        }
      } catch {
        setImportErrors(['Share link contains invalid data.']);
        setStatusMessage('Share link contains invalid data.');
      }
    }
  }, []);

  const handleCopyLink = useCallback(() => {
    if (shareLink) {
      navigator.clipboard?.writeText(shareLink);
      setStatusMessage('Share link copied to clipboard.');
    }
  }, [shareLink]);

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
      <h1>Dashboard Configuration</h1>
      <p>
        Export, import, and share your dashboard settings. Configurations are versioned so they can
        be migrated across releases.
      </p>

      {statusMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: 8,
            background: 'var(--ifm-color-emphasis-100)',
            borderLeft: '4px solid var(--ifm-color-primary)',
          }}
        >
          {statusMessage}
        </div>
      )}

      <h2>Current Configuration (v{config.version})</h2>
      <pre
        style={{
          background: 'var(--ifm-color-emphasis-100)',
          padding: '1rem',
          borderRadius: 8,
          overflowX: 'auto',
          fontSize: '0.85rem',
        }}
      >
        {JSON.stringify(config, null, 2)}
      </pre>

      <h2>Export &amp; Share</h2>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button className="button button--primary" onClick={handleExport}>
          Export as JSON
        </button>
        <button className="button button--secondary" onClick={handleShare}>
          Generate Share Link
        </button>
      </div>

      {shareLink && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            Shareable Link
          </label>
          <textarea
            readOnly
            value={shareLink}
            rows={3}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
          />
          <button className="button button--secondary button--sm" onClick={handleCopyLink} style={{ marginTop: '0.5rem' }}>
            Copy Link
          </button>
        </div>
      )}

      <h2>Import Configuration</h2>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImport}
        style={{ marginBottom: '1rem' }}
      />

      {importErrors.length > 0 && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            borderRadius: 8,
            background: 'rgba(255,0,0,0.05)',
            borderLeft: '4px solid #e00',
          }}
        >
          <strong>Validation Errors:</strong>
          <ul style={{ margin: '0.5rem 0 0 1.5rem' }}>
            {importErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {previewConfig && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            borderRadius: 8,
            background: 'var(--ifm-color-emphasis-100)',
            borderLeft: '4px solid var(--ifm-color-primary)',
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Import Preview{importedFileName ? ` — ${importedFileName}` : ''}
          </h3>
          <p>Review the configuration below before applying it to your dashboard.</p>
          <pre
            style={{
              background: 'var(--ifm-color-emphasis-200)',
              padding: '1rem',
              borderRadius: 8,
              overflowX: 'auto',
              fontSize: '0.85rem',
            }}
          >
            {JSON.stringify(previewConfig, null, 2)}
          </pre>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="button button--primary" onClick={handleApplyPreview}>
              Apply Configuration
            </button>
            <button className="button button--secondary" onClick={handleCancelPreview}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <h2>Edit Current Configuration</h2>
      <DashboardConfigEditor config={config} onSave={persistConfig} />
    </div>
  );
}

/** Inline editor so users can tweak the active configuration directly. */
function DashboardConfigEditor({
  config,
  onSave,
}: {
  config: DashboardConfigData;
  onSave: (config: DashboardConfigData) => void;
}): React.JSX.Element {
  const [draft, setDraft] = useState<DashboardConfigData>(config);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 500 }}>
      <label>
        Theme
        <select
          value={draft.theme}
          onChange={(e) => setDraft({ ...draft, theme: e.target.value as DashboardConfigData['theme'] })}
          style={{ display: 'block', marginTop: '0.25rem' }}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto</option>
        </select>
      </label>

      <label>
        Default Transaction View
        <select
          value={draft.defaultTransactionView}
          onChange={(e) =>
            setDraft({ ...draft, defaultTransactionView: e.target.value as DashboardConfigData['defaultTransactionView'] })
          }
          style={{ display: 'block', marginTop: '0.25rem' }}
        >
          <option value="list">List</option>
          <option value="table">Table</option>
          <option value="cards">Cards</option>
        </select>
      </label>

      <label>
        Refresh Interval (seconds)
        <input
          type="number"
          value={draft.refreshIntervalSeconds}
          min={0}
          onChange={(e) => setDraft({ ...draft, refreshIntervalSeconds: Number(e.target.value) })}
          style={{ display: 'block', marginTop: '0.25rem' }}
        />
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          checked={draft.showNotifications}
          onChange={(e) => setDraft({ ...draft, showNotifications: e.target.checked })}
        />
        Show Notifications
      </label>

      <label>
        Currency
        <input
          type="text"
          value={draft.currency}
          onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
          style={{ display: 'block', marginTop: '0.25rem' }}
        />
      </label>

      <button
        className="button button--primary"
        onClick={() => onSave({ ...draft, version: CONFIG_VERSION })}
      >
        Save Configuration
      </button>
    </div>
  );
}
