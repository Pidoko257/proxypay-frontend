import React, { useState, useEffect, useCallback } from 'react';

interface SpecVersion {
  id: string;
  timestamp: number;
  label: string;
  source: string;
  spec: string;
  size: number;
}

interface ConflictEntry {
  path: string;
  method: string;
  issue: string;
}

const VERSIONS_KEY = 'proxypay-spec-versions';
const CURRENT_SPEC_KEY = 'proxypay-current-spec';
const AUTO_SYNC_KEY = 'proxypay-auto-sync';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function loadVersions(): SpecVersion[] {
  try {
    const raw = localStorage.getItem(VERSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveVersions(versions: SpecVersion[]): void {
  localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions));
}

function loadCurrentSpec(): SpecVersion | null {
  try {
    const raw = localStorage.getItem(CURRENT_SPEC_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCurrentSpec(spec: SpecVersion): void {
  localStorage.setItem(CURRENT_SPEC_KEY, JSON.stringify(spec));
}

function validateSpec(yaml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  try {
    if (!yaml.trim()) {
      errors.push('Spec is empty');
      return { valid: false, errors };
    }
    const hasOpenApi = /openapi\s*:\s*["']?3\./i.test(yaml);
    const hasInfo = /info\s*:/i.test(yaml);
    const hasPaths = /paths\s*:/i.test(yaml);

    if (!hasOpenApi) errors.push('Missing or invalid OpenAPI version (requires 3.x)');
    if (!hasInfo) errors.push('Missing "info" section');
    if (!hasPaths) errors.push('Missing "paths" section');

    // Basic YAML structure check
    const lines = yaml.split('\n');
    let indentLevel = 0;
    lines.forEach((line, i) => {
      if (line.trim() === '') return;
      const indent = line.search(/\S/);
      if (indent % 2 !== 0 && indent > 0) {
        errors.push(`Line ${i + 1}: Inconsistent indentation (use 2 spaces)`);
      }
    });

    return { valid: errors.length === 0, errors };
  } catch (e: any) {
    return { valid: false, errors: [e.message || 'Unknown validation error'] };
  }
}

function detectConflicts(existing: string, incoming: string): ConflictEntry[] {
  const conflicts: ConflictEntry[] = [];
  const existingPaths = extractPaths(existing);
  const incomingPaths = extractPaths(incoming);

  for (const [path, methods] of Object.entries(incomingPaths)) {
    if (existingPaths[path]) {
      for (const method of methods) {
        if (existingPaths[path].includes(method)) {
          conflicts.push({
            path,
            method: method.toUpperCase(),
            issue: `Endpoint ${method.toUpperCase()} ${path} exists in both specs`,
          });
        }
      }
      const newMethods = methods.filter((m) => !existingPaths[path].includes(m));
      if (newMethods.length === 0 && methods.length === existingPaths[path].length) {
        // All methods conflict
      } else if (newMethods.length > 0) {
        // Partial conflict - new methods are fine
      }
    }
  }
  return conflicts;
}

function extractPaths(yaml: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const pathRegex = /^\s{2}(\/[^\s:]+):/gm;
  const methodRegex = /^\s{4}(get|post|put|patch|delete|options|head):/gm;
  let match;
  let currentPath = '';

  const lines = yaml.split('\n');
  for (const line of lines) {
    const pathMatch = line.match(/^\s{2}(\/[^\s:]+):/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      result[currentPath] = [];
    }
    const methodMatch = line.match(/^\s{4}(get|post|put|patch|delete|options|head):/i);
    if (methodMatch && currentPath) {
      result[currentPath].push(methodMatch[1].toLowerCase());
    }
  }
  return result;
}

function mergeSpecs(base: string, overlay: string): string {
  // Simple merge: append paths from overlay that don't exist in base
  const basePaths = extractPaths(base);
  const overlayPaths = extractPaths(overlay);
  const newPathsOnly: string[] = [];

  for (const path of Object.keys(overlayPaths)) {
    if (!basePaths[path]) {
      // Extract the full path block from overlay
      const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(  ${escaped}:\\n(?:    [\\s\\S]*?))(?=\\n  /|\\n[a-z]|$)`, 'g');
      const match = regex.exec(overlay);
      if (match) {
        newPathsOnly.push(match[1]);
      }
    }
  }

  if (newPathsOnly.length === 0) return base;

  // Insert before the last line or at end
  const trimmedBase = base.trimEnd();
  return trimmedBase + '\n' + newPathsOnly.join('\n');
}

function downloadSpec(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/x-yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SpecManager(): React.JSX.Element {
  const [versions, setVersions] = useState<SpecVersion[]>([]);
  const [currentSpec, setCurrentSpec] = useState<SpecVersion | null>(null);
  const [activeView, setActiveView] = useState<'import' | 'versions' | 'preview' | 'merge'>('import');
  const [toast, setToast] = useState('');

  // Import state
  const [importUrl, setImportUrl] = useState('');
  const [importLabel, setImportLabel] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  // Merge state
  const [mergeBaseId, setMergeBaseId] = useState('');
  const [mergeOverlayId, setMergeOverlayId] = useState('');
  const [mergeConflicts, setMergeConflicts] = useState<ConflictEntry[]>([]);
  const [mergePreview, setMergePreview] = useState('');

  // Preview state
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);

  // Auto-sync state
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState(3600);
  const [autoSyncUrl, setAutoSyncUrl] = useState('');
  const [autoSyncLastRun, setAutoSyncLastRun] = useState<number | null>(null);

  // Validation
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);

  useEffect(() => {
    const v = loadVersions();
    setVersions(v);
    setCurrentSpec(loadCurrentSpec());

    const autoSync = localStorage.getItem(AUTO_SYNC_KEY);
    if (autoSync) {
      try {
        const parsed = JSON.parse(autoSync);
        setAutoSyncEnabled(parsed.enabled || false);
        setAutoSyncInterval(parsed.interval || 3600);
        setAutoSyncUrl(parsed.url || '');
        setAutoSyncLastRun(parsed.lastRun || null);
      } catch {}
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }, []);

  const addVersion = useCallback(
    (label: string, source: string, spec: string) => {
      const newVersion: SpecVersion = {
        id: generateId(),
        timestamp: Date.now(),
        label,
        source,
        spec,
        size: new Blob([spec]).size,
      };
      const updated = [newVersion, ...versions];
      setVersions(updated);
      saveVersions(updated);
      setCurrentSpec(newVersion);
      saveCurrentSpec(newVersion);
      return newVersion;
    },
    [versions]
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        const validation = validateSpec(content);
        setValidationResult(validation);
        const label = importLabel || file.name.replace(/\.[^/.]+$/, '');
        addVersion(label, `File: ${file.name}`, content);
        showToast(`Imported "${label}" successfully`);
        setImportLabel('');
        setValidationResult(validation);
      };
      reader.readAsText(file);
    },
    [importLabel, addVersion, showToast]
  );

  const handleUrlImport = useCallback(async () => {
    if (!importUrl.trim()) {
      setImportError('Please enter a URL');
      return;
    }
    setImporting(true);
    setImportError('');
    try {
      const res = await fetch(importUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const content = await res.text();
      const validation = validateSpec(content);
      setValidationResult(validation);
      const label = importLabel || new URL(importUrl).pathname.split('/').pop() || 'Imported Spec';
      addVersion(label, `URL: ${importUrl}`, content);
      showToast(`Imported from URL successfully`);
      setImportUrl('');
      setImportLabel('');
    } catch (err: any) {
      setImportError(err.message || 'Failed to import');
    } finally {
      setImporting(false);
    }
  }, [importUrl, importLabel, addVersion, showToast]);

  const handleGitImport = useCallback(() => {
    // Simulated Git import — in production would clone the repo
    const repoUrl = importUrl.trim();
    if (!repoUrl) {
      setImportError('Please enter a Git repository URL');
      return;
    }
    setImporting(true);
    setImportError('');
    // Simulate async git fetch
    setTimeout(() => {
      const simulatedSpec = `openapi: 3.0.3\ninfo:\n  title: Imported from Git\n  version: 1.0.0\n  description: Spec imported from ${repoUrl}\npaths: {}\n`;
      const validation = validateSpec(simulatedSpec);
      setValidationResult(validation);
      const label = importLabel || repoUrl.split('/').pop()?.replace('.git', '') || 'Git Import';
      addVersion(label, `Git: ${repoUrl}`, simulatedSpec);
      showToast(`Imported from Git repository (simulated)`);
      setImportUrl('');
      setImportLabel('');
      setImporting(false);
    }, 1500);
  }, [importUrl, importLabel, addVersion, showToast]);

  const handleMerge = useCallback(() => {
    const base = versions.find((v) => v.id === mergeBaseId);
    const overlay = versions.find((v) => v.id === mergeOverlayId);
    if (!base || !overlay) return;

    const conflicts = detectConflicts(base.spec, overlay.spec);
    setMergeConflicts(conflicts);
    const merged = mergeSpecs(base.spec, overlay.spec);
    setMergePreview(merged);
    setActiveView('merge');
    setValidationResult(validateSpec(merged));
  }, [versions, mergeBaseId, mergeOverlayId]);

  const applyMerged = useCallback(() => {
    const base = versions.find((v) => v.id === mergeBaseId);
    const overlay = versions.find((v) => v.id === mergeOverlayId);
    if (!base || !overlay) return;

    addVersion(
      `Merged: ${base.label} + ${overlay.label}`,
      `Merge`,
      mergePreview
    );
    showToast('Merged spec applied!');
    setMergePreview('');
    setMergeConflicts([]);
    setActiveView('versions');
  }, [versions, mergeBaseId, mergeOverlayId, mergePreview, addVersion, showToast]);

  const handleRollback = useCallback(
    (version: SpecVersion) => {
      setCurrentSpec(version);
      saveCurrentSpec(version);
      showToast(`Rolled back to "${version.label}"`);
    },
    [showToast]
  );

  const applyToSite = useCallback(
    (version: SpecVersion) => {
      // In production this would update the static file; here we save to localStorage
      setCurrentSpec(version);
      saveCurrentSpec(version);
      showToast(`Applied "${version.label}" as active spec`);
    },
    [showToast]
  );

  const saveAutoSync = useCallback(
    (enabled: boolean, interval: number, url: string) => {
      const config = { enabled, interval, url, lastRun: autoSyncLastRun };
      localStorage.setItem(AUTO_SYNC_KEY, JSON.stringify(config));
      setAutoSyncEnabled(enabled);
      setAutoSyncInterval(interval);
      setAutoSyncUrl(url);
      showToast(enabled ? 'Auto-sync enabled' : 'Auto-sync disabled');
    },
    [autoSyncLastRun, showToast]
  );

  const previewVersion = versions.find((v) => v.id === previewVersionId);

  return (
    <div className="spec-manager">
      <div className="spec-manager-header">
        <h2>🔄 API Spec Manager</h2>
        <p className="spec-subtitle">
          Import, merge, and version your OpenAPI specifications. All versions stored locally.
        </p>
      </div>

      {toast && <div className="mock-toast">{toast}</div>}

      <div className="mock-tabs">
        <button className={`mock-tab ${activeView === 'import' ? 'active' : ''}`} onClick={() => setActiveView('import')}>
          📥 Import
        </button>
        <button className={`mock-tab ${activeView === 'versions' ? 'active' : ''}`} onClick={() => setActiveView('versions')}>
          📚 Versions ({versions.length})
        </button>
        <button className={`mock-tab ${activeView === 'merge' ? 'active' : ''}`} onClick={() => setActiveView('merge')}>
          🔀 Merge
        </button>
        <button className={`mock-tab ${activeView === 'preview' ? 'active' : ''}`} onClick={() => setActiveView('preview')}>
          👁️ Preview
        </button>
      </div>

      {activeView === 'import' && (
        <div className="spec-import">
          <div className="spec-import-section">
            <h3>📁 File Upload</h3>
            <div className="mock-field">
              <label>Label (optional)</label>
              <input
                type="text"
                value={importLabel}
                onChange={(e) => setImportLabel(e.target.value)}
                placeholder="My API Spec v2"
                className="mock-input"
              />
            </div>
            <label className="spec-file-drop">
              <input type="file" accept=".yaml,.yml,.json" onChange={handleFileUpload} className="spec-file-input" />
              <div className="spec-file-drop-content">
                <span className="spec-file-icon">📂</span>
                <span>Click to upload OpenAPI spec (.yaml, .yml, .json)</span>
              </div>
            </label>
          </div>

          <div className="spec-import-section">
            <h3>🌐 Import from URL</h3>
            <div className="mock-field">
              <label>URL</label>
              <div className="spec-url-row">
                <input
                  type="text"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://example.com/openapi.yaml"
                  className="mock-input"
                />
                <button className="mock-btn mock-btn-primary" onClick={handleUrlImport} disabled={importing}>
                  {importing ? '⏳ Fetching...' : '📥 Fetch'}
                </button>
              </div>
            </div>
          </div>

          <div className="spec-import-section">
            <h3>🐙 Import from Git Repository</h3>
            <p className="spec-hint">Enter a Git repository URL to simulate importing its OpenAPI spec.</p>
            <div className="mock-field">
              <label>Git URL</label>
              <div className="spec-url-row">
                <input
                  type="text"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                  className="mock-input"
                />
                <button className="mock-btn mock-btn-secondary" onClick={handleGitImport} disabled={importing}>
                  {importing ? '⏳ Cloning...' : '🐙 Import'}
                </button>
              </div>
            </div>
          </div>

          {importError && <div className="spec-error">{importError}</div>}

          {validationResult && (
            <div className={`spec-validation ${validationResult.valid ? 'spec-valid' : 'spec-invalid'}`}>
              <h4>{validationResult.valid ? '✅ Spec is valid' : '❌ Validation errors'}</h4>
              {validationResult.errors.map((err, i) => (
                <p key={i} className="spec-validation-error">• {err}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'versions' && (
        <div className="spec-versions">
          <div className="spec-versions-header">
            <h3>Version History</h3>
            {currentSpec && (
              <span className="spec-current-badge">
                Active: <strong>{currentSpec.label}</strong>
              </span>
            )}
          </div>
          {versions.length === 0 ? (
            <div className="mock-empty"><p>No versions yet. Import a spec to get started.</p></div>
          ) : (
            <div className="spec-version-list">
              {versions
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((v) => (
                  <div key={v.id} className={`spec-version-card ${currentSpec?.id === v.id ? 'spec-version-active' : ''}`}>
                    <div className="spec-version-info">
                      <strong>{v.label}</strong>
                      <span className="spec-version-meta">
                        {new Date(v.timestamp).toLocaleString()} • {v.source} • {(v.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div className="spec-version-actions">
                      <button className="mock-btn mock-btn-sm" onClick={() => { setPreviewVersionId(v.id); setActiveView('preview'); }}>👁️</button>
                      <button className="mock-btn mock-btn-sm" onClick={() => applyToSite(v)}>✅ Apply</button>
                      <button className="mock-btn mock-btn-sm" onClick={() => handleRollback(v)}>⏪ Rollback</button>
                      <button className="mock-btn mock-btn-sm" onClick={() => downloadSpec(v.spec, `${v.label}.yaml`)}>📥 DL</button>
                      <button className="mock-btn mock-btn-sm mock-btn-danger" onClick={() => {
                        const updated = versions.filter((x) => x.id !== v.id);
                        setVersions(updated);
                        saveVersions(updated);
                      }}>🗑️</button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'merge' && (
        <div className="spec-merge">
          <h3>🔀 Merge Specifications</h3>
          <p className="spec-hint">Select a base spec and an overlay spec. New endpoints from the overlay will be merged into the base.</p>
          <div className="mock-grid">
            <div className="mock-field">
              <label>Base Spec</label>
              <select value={mergeBaseId} onChange={(e) => setMergeBaseId(e.target.value)} className="mock-select">
                <option value="">-- Select base --</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>{v.label} ({new Date(v.timestamp).toLocaleDateString()})</option>
                ))}
              </select>
            </div>
            <div className="mock-field">
              <label>Overlay Spec</label>
              <select value={mergeOverlayId} onChange={(e) => setMergeOverlayId(e.target.value)} className="mock-select">
                <option value="">-- Select overlay --</option>
                {versions.filter((v) => v.id !== mergeBaseId).map((v) => (
                  <option key={v.id} value={v.id}>{v.label} ({new Date(v.timestamp).toLocaleDateString()})</option>
                ))}
              </select>
            </div>
          </div>
          <button className="mock-btn mock-btn-primary" onClick={handleMerge} disabled={!mergeBaseId || !mergeOverlayId}>
            🔀 Preview Merge
          </button>

          {mergeConflicts.length > 0 && (
            <div className="spec-conflicts">
              <h4>⚠️ Conflicts Detected</h4>
              {mergeConflicts.map((c, i) => (
                <div key={i} className="spec-conflict-entry">
                  <span className="spec-conflict-method">{c.method}</span>
                  <code>{c.path}</code>
                  <span>— {c.issue}</span>
                </div>
              ))}
            </div>
          )}

          {mergePreview && (
            <div className="spec-merge-preview">
              <div className="mock-preview-header">
                <h4>Merge Preview</h4>
                <div className="spec-merge-actions">
                  <button className="mock-btn mock-btn-primary" onClick={applyMerged}>✅ Apply Merge</button>
                  <button className="mock-btn mock-btn-secondary" onClick={() => navigator.clipboard.writeText(mergePreview)}>📋 Copy</button>
                </div>
              </div>
              <pre className="mock-preview-code"><code>{mergePreview.substring(0, 5000)}{mergePreview.length > 5000 ? '\n... (truncated)' : ''}</code></pre>
            </div>
          )}
        </div>
      )}

      {activeView === 'preview' && (
        <div className="spec-preview">
          <h3>👁️ Spec Preview</h3>
          <div className="mock-field">
            <label>Select version to preview</label>
            <select
              value={previewVersionId || ''}
              onChange={(e) => setPreviewVersionId(e.target.value || null)}
              className="mock-select"
            >
              <option value="">-- Select spec --</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </div>
          {previewVersion && (
            <div className="spec-preview-content">
              <div className="spec-preview-meta">
                <span><strong>{previewVersion.label}</strong></span>
                <span>Source: {previewVersion.source}</span>
                <span>Size: {(previewVersion.size / 1024).toFixed(1)} KB</span>
                <span>{new Date(previewVersion.timestamp).toLocaleString()}</span>
              </div>
              <pre className="mock-preview-code"><code>{previewVersion.spec}</code></pre>
            </div>
          )}
        </div>
      )}

      <div className="spec-auto-sync">
        <h3>🕐 Scheduled Auto-Sync</h3>
        <div className="mock-grid">
          <div className="mock-field">
            <label className="mock-checkbox-label">
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(e) => saveAutoSync(e.target.checked, autoSyncInterval, autoSyncUrl)}
              />
              <span>Enable auto-sync</span>
            </label>
          </div>
          {autoSyncEnabled && (
            <>
              <div className="mock-field">
                <label>Sync URL</label>
                <input
                  type="text"
                  value={autoSyncUrl}
                  onChange={(e) => setAutoSyncUrl(e.target.value)}
                  onBlur={() => saveAutoSync(true, autoSyncInterval, autoSyncUrl)}
                  placeholder="https://api.example.com/openapi.yaml"
                  className="mock-input"
                />
              </div>
              <div className="mock-field">
                <label>Interval (seconds)</label>
                <select
                  value={autoSyncInterval}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setAutoSyncInterval(val);
                    saveAutoSync(true, val, autoSyncUrl);
                  }}
                  className="mock-select"
                >
                  <option value={300}>Every 5 minutes</option>
                  <option value={900}>Every 15 minutes</option>
                  <option value={3600}>Every hour</option>
                  <option value={86400}>Every day</option>
                </select>
              </div>
            </>
          )}
        </div>
        {autoSyncEnabled && autoSyncLastRun && (
          <p className="spec-sync-last">Last sync: {new Date(autoSyncLastRun).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}
