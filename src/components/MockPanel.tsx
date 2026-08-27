import React, { useState, useEffect, useCallback } from 'react';

interface MockConfig {
  id: string;
  name: string;
  method: string;
  path: string;
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  latency: number;
  simulateError: boolean;
  errorBody: string;
  createdAt: number;
}

const STORAGE_KEY = 'proxypay-mock-configs';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
const STATUS_CODES = [200, 201, 204, 301, 302, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503];
const TEMPLATE_VARIABLES = [
  { key: '{{timestamp}}', label: 'Current timestamp' },
  { key: '{{randomId}}', label: 'Random UUID' },
  { key: '{{isoDate}}', label: 'ISO date string' },
  { key: '{{randomInt:1,100}}', label: 'Random integer (range)' },
  { key: '{{path}}', label: 'Request path' },
  { key: '{{method}}', label: 'HTTP method' },
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Configuration constants for template resolution
 */
const TEMPLATE_CONFIG = {
  MAX_RANGE_SIZE: 1_000_000, // Maximum allowed range for randomInt
  MAX_VALUE: 2_147_483_647, // Max safe integer for random generation
  MIN_VALUE: -2_147_483_648, // Min safe integer for random generation
  MAX_RECURSION_DEPTH: 10,
  EXECUTION_TIMEOUT_MS: 1000,
};

/**
 * Validates randomInt min/max parameters
 * @throws Error if validation fails
 */
function validateRandomIntParams(min: number, max: number): void {
  // Validate that min <= max
  if (min > max) {
    throw new Error(`Invalid randomInt range: min (${min}) cannot be greater than max (${max})`);
  }

  // Validate that values are within safe integer range
  if (min < TEMPLATE_CONFIG.MIN_VALUE || min > TEMPLATE_CONFIG.MAX_VALUE) {
    throw new Error(`Min value ${min} is outside safe integer range [${TEMPLATE_CONFIG.MIN_VALUE}, ${TEMPLATE_CONFIG.MAX_VALUE}]`);
  }

  if (max < TEMPLATE_CONFIG.MIN_VALUE || max > TEMPLATE_CONFIG.MAX_VALUE) {
    throw new Error(`Max value ${max} is outside safe integer range [${TEMPLATE_CONFIG.MIN_VALUE}, ${TEMPLATE_CONFIG.MAX_VALUE}]`);
  }

  // Validate that range size does not exceed maximum
  const rangeSize = max - min + 1;
  if (rangeSize > TEMPLATE_CONFIG.MAX_RANGE_SIZE) {
    throw new Error(`Range size (${rangeSize}) exceeds maximum allowed size (${TEMPLATE_CONFIG.MAX_RANGE_SIZE})`);
  }
}

/**
 * Generates a random integer within the specified range
 * @throws Error if parameters are invalid
 */
function generateRandomInt(min: number, max: number): number {
  validateRandomIntParams(min, max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Resolves template variables in a string with validation and recursion safety
 * Supported templates:
 * - {{timestamp}} → current Unix timestamp
 * - {{randomId}} → random UUID
 * - {{isoDate}} → ISO date string
 * - {{randomInt:min,max}} → random integer in range [min, max]
 * - {{path}} → request path
 * - {{method}} → HTTP method
 * 
 * @throws Error if template resolution fails or contains invalid parameters
 */
function resolveTemplate(template: string, path: string, method: string, depth = 0): string {
  // Recursion depth protection
  if (depth > TEMPLATE_CONFIG.MAX_RECURSION_DEPTH) {
    throw new Error(`Template resolution exceeded maximum recursion depth (${TEMPLATE_CONFIG.MAX_RECURSION_DEPTH})`);
  }

  let resolved = template;

  // Static replacements (no validation needed)
  resolved = resolved.replace(/\{\{timestamp\}\}/g, String(Date.now()));
  resolved = resolved.replace(/\{\{randomId\}\}/g, crypto.randomUUID?.() ?? generateId() + '-' + generateId());
  resolved = resolved.replace(/\{\{isoDate\}\}/g, new Date().toISOString());
  resolved = resolved.replace(/\{\{path\}\}/g, path);
  resolved = resolved.replace(/\{\{method\}\}/g, method);

  // randomInt replacement with validation
  // Regex captures optional minus signs for negative numbers
  let lastResolved = '';
  let iterations = 0;
  const maxIterations = 100; // Prevent infinite loops from malformed templates

  while (resolved !== lastResolved && iterations < maxIterations) {
    lastResolved = resolved;
    resolved = resolved.replace(/\{\{randomInt:(-?\d+),(-?\d+)\}\}/g, (match, minStr, maxStr) => {
      try {
        const min = parseInt(minStr, 10);
        const max = parseInt(maxStr, 10);

        // Validate parameters before generation
        validateRandomIntParams(min, max);

        return String(generateRandomInt(min, max));
      } catch (error) {
        // Return the original match if validation fails to preserve the template for debugging
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to resolve randomInt template "${match}": ${errorMessage}`);
      }
    });
    iterations++;
  }

  if (iterations >= maxIterations) {
    throw new Error('Template resolution exceeded maximum iterations (possible infinite loop)');
  }

  return resolved;
}

function loadConfigs(): MockConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConfigs(configs: MockConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export default function MockPanel(): React.JSX.Element {
  const [configs, setConfigs] = useState<MockConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'saved'>('editor');

  // Editor state
  const [name, setName] = useState('');
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/api/v1/');
  const [statusCode, setStatusCode] = useState(200);
  const [headers, setHeaders] = useState('{"Content-Type":"application/json"}');
  const [body, setBody] = useState('{\n  "success": true,\n  "data": {},\n  "timestamp": "{{isoDate}}"\n}');
  const [latency, setLatency] = useState(200);
  const [simulateError, setSimulateError] = useState(false);
  const [errorBody, setErrorBody] = useState('{\n  "error": "Internal Server Error",\n  "code": 500\n}');
  const [previewOutput, setPreviewOutput] = useState('');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    setConfigs(loadConfigs());
  }, []);

  const resetEditor = useCallback(() => {
    setName('');
    setMethod('GET');
    setPath('/api/v1/');
    setStatusCode(200);
    setHeaders('{"Content-Type":"application/json"}');
    setBody('{\n  "success": true,\n  "data": {},\n  "timestamp": "{{isoDate}}"\n}');
    setLatency(200);
    setSimulateError(false);
    setErrorBody('{\n  "error": "Internal Server Error",\n  "code": 500\n}');
    setSelectedConfigId(null);
  }, []);

  const loadConfig = useCallback((config: MockConfig) => {
    setName(config.name);
    setMethod(config.method);
    setPath(config.path);
    setStatusCode(config.statusCode);
    setHeaders(JSON.stringify(config.headers, null, 2));
    setBody(config.body);
    setLatency(config.latency);
    setSimulateError(config.simulateError);
    setErrorBody(config.errorBody);
    setSelectedConfigId(config.id);
    setActiveTab('editor');
  }, []);

  const generatePreview = useCallback(() => {
    try {
      let parsedHeaders: Record<string, string> = {};
      try {
        parsedHeaders = JSON.parse(headers);
      } catch {
        parsedHeaders = { 'Content-Type': 'application/json' };
      }

      const resolvedBody = resolveTemplate(body, path, method);
      const resolvedErrorBody = simulateError ? resolveTemplate(errorBody, path, method) : '';

      const response = {
        status: statusCode,
        headers: parsedHeaders,
        body: simulateError ? resolvedErrorBody : resolvedBody,
        latency_ms: latency,
        url: path,
        method,
      };

      setPreviewOutput(JSON.stringify(response, null, 2));
      setPreviewError(null);
      setActiveTab('preview');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during template resolution';
      setPreviewError(`Template Error: ${errorMessage}`);
      setPreviewOutput('');
      setActiveTab('preview');
    }
  }, [headers, body, statusCode, simulateError, errorBody, latency, path, method]);

  const saveConfig = useCallback(() => {
    let parsedHeaders: Record<string, string> = {};
    try {
      parsedHeaders = JSON.parse(headers);
    } catch {
      parsedHeaders = { 'Content-Type': 'application/json' };
    }

    const newConfig: MockConfig = {
      id: selectedConfigId || generateId(),
      name: name || `Mock ${method} ${path}`,
      method,
      path,
      statusCode,
      headers: parsedHeaders,
      body,
      latency,
      simulateError,
      errorBody,
      createdAt: Date.now(),
    };

    const updated = selectedConfigId
      ? configs.map((c) => (c.id === selectedConfigId ? newConfig : c))
      : [...configs, newConfig];

    setConfigs(updated);
    saveConfigs(updated);
    setSelectedConfigId(newConfig.id);
    setCopyFeedback('Saved!');
    setTimeout(() => setCopyFeedback(''), 1500);
  }, [configs, selectedConfigId, name, method, path, statusCode, headers, body, latency, simulateError, errorBody]);

  const deleteConfig = useCallback(
    (id: string) => {
      const updated = configs.filter((c) => c.id !== id);
      setConfigs(updated);
      saveConfigs(updated);
      if (selectedConfigId === id) resetEditor();
    },
    [configs, selectedConfigId, resetEditor]
  );

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(`Copied ${label}!`);
      setTimeout(() => setCopyFeedback(''), 1500);
    });
  }, []);

  const insertTemplate = useCallback((variable: string) => {
    setBody((prev) => prev + ' ' + variable);
  }, []);

  return (
    <div className="mock-panel">
      <div className="mock-panel-header">
        <h2>🧪 Mock Response Generator</h2>
        <p className="mock-subtitle">
          Simulate API responses for testing without hitting real endpoints. Configurations are saved locally.
        </p>
      </div>

      {copyFeedback && <div className="mock-toast">{copyFeedback}</div>}

      <div className="mock-tabs">
        <button className={`mock-tab ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => setActiveTab('editor')}>
          ✏️ Editor
        </button>
        <button className={`mock-tab ${activeTab === 'preview' ? 'active' : ''}`} onClick={generatePreview}>
          👁️ Preview
        </button>
        <button className={`mock-tab ${activeTab === 'saved' ? 'active' : ''}`} onClick={() => setActiveTab('saved')}>
          💾 Saved ({configs.length})
        </button>
      </div>

      {activeTab === 'editor' && (
        <div className="mock-editor">
          <div className="mock-grid">
            <div className="mock-field">
              <label>Configuration Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Get Users Success"
                className="mock-input"
              />
            </div>
            <div className="mock-field">
              <label>Endpoint Path</label>
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/api/v1/users"
                className="mock-input"
              />
            </div>
          </div>

          <div className="mock-grid mock-grid-3">
            <div className="mock-field">
              <label>HTTP Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="mock-select">
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="mock-field">
              <label>Status Code</label>
              <select value={statusCode} onChange={(e) => setStatusCode(Number(e.target.value))} className="mock-select">
                {STATUS_CODES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="mock-field">
              <label>Latency (ms)</label>
              <div className="mock-latency-row">
                <input
                  type="range"
                  min={0}
                  max={5000}
                  step={50}
                  value={latency}
                  onChange={(e) => setLatency(Number(e.target.value))}
                  className="mock-slider"
                />
                <span className="mock-latency-value">{latency}ms</span>
              </div>
            </div>
          </div>

          <div className="mock-field">
            <label>Response Headers (JSON)</label>
            <textarea
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              rows={3}
              className="mock-textarea mock-code"
              placeholder='{"Content-Type":"application/json"}'
            />
          </div>

          <div className="mock-field">
            <label>
              Response Body (JSON){' '}
              <span className="mock-label-hint">— supports template variables</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="mock-textarea mock-code"
              placeholder='{"success":true}'
            />
          </div>

          <div className="mock-template-bar">
            <span className="mock-template-label">Insert variable:</span>
            {TEMPLATE_VARIABLES.map((v) => (
              <button key={v.key} className="mock-template-chip" onClick={() => insertTemplate(v.key)} title={v.label}>
                {v.key}
              </button>
            ))}
          </div>

          <div className="mock-error-section">
            <label className="mock-checkbox-label">
              <input
                type="checkbox"
                checked={simulateError}
                onChange={(e) => setSimulateError(e.target.checked)}
              />
              <span>Simulate Error Response</span>
            </label>
            {simulateError && (
              <textarea
                value={errorBody}
                onChange={(e) => setErrorBody(e.target.value)}
                rows={4}
                className="mock-textarea mock-code mock-error-textarea"
                placeholder="Error response body"
              />
            )}
          </div>

          <div className="mock-actions">
            <button className="mock-btn mock-btn-primary" onClick={saveConfig}>
              💾 {selectedConfigId ? 'Update' : 'Save'} Configuration
            </button>
            <button className="mock-btn mock-btn-secondary" onClick={generatePreview}>
              👁️ Preview Response
            </button>
            <button className="mock-btn mock-btn-ghost" onClick={resetEditor}>
              🗑️ Clear
            </button>
          </div>
        </div>
      )}

      {activeTab === 'preview' && (
        <div className="mock-preview">
          <div className="mock-preview-header">
            <h3>Response Preview</h3>
            <button 
              className="mock-btn mock-btn-ghost" 
              onClick={() => copyToClipboard(previewOutput, 'preview')}
              disabled={!!previewError}
            >
              📋 Copy
            </button>
          </div>
          {previewError && (
            <div className="mock-error-display">
              <div className="mock-error-icon">⚠️</div>
              <div className="mock-error-message">{previewError}</div>
            </div>
          )}
          {!previewError && (
            <pre className="mock-preview-code"><code>{previewOutput || 'Click "Preview Response" to generate a preview'}</code></pre>
          )}
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="mock-saved">
          {configs.length === 0 ? (
            <div className="mock-empty">
              <p>No saved configurations yet. Create one in the Editor tab.</p>
            </div>
          ) : (
            <div className="mock-config-list">
              {configs
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((config) => (
                  <div key={config.id} className="mock-config-card">
                    <div className="mock-config-info">
                      <div className="mock-config-header">
                        <span className={`mock-method-badge method-${config.method.toLowerCase()}`}>{config.method}</span>
                        <strong>{config.name}</strong>
                      </div>
                      <div className="mock-config-meta">
                        <code>{config.path}</code>
                        <span className="mock-status-badge">Status: {config.statusCode}</span>
                        <span>Latency: {config.latency}ms</span>
                        {config.simulateError && <span className="mock-error-badge">Error mode</span>}
                      </div>
                    </div>
                    <div className="mock-config-actions">
                      <button className="mock-btn mock-btn-sm" onClick={() => loadConfig(config)}>✏️ Edit</button>
                      <button className="mock-btn mock-btn-sm mock-btn-danger" onClick={() => deleteConfig(config.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
