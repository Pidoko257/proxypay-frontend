import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import jsYaml from 'js-yaml';
import {
  PaginationParams,
  parsePaginationParams,
  readPaginationFromLocation,
  syncPaginationToLocation,
} from './apiReferencePagination';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Endpoint {
  id: string;
  method: string;
  path: string;
  summary: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: RequestBodySpec;
  responses?: Record<string, ResponseSpec>;
  tags?: string[];
}

interface Parameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: { type?: string; example?: unknown };
  example?: unknown;
}

interface RequestBodySpec {
  description?: string;
  required?: boolean;
  content?: Record<string, { schema?: SchemaObject; example?: unknown }>;
}

interface ResponseSpec {
  description?: string;
  content?: Record<string, { schema?: SchemaObject; example?: unknown }>;
}

interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject>;
  example?: unknown;
}

interface Template {
  id: string;
  name: string;
  params: Record<string, string>;
  body: string;
  isCustom?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 300;
const METHOD_COLORS: Record<string, string> = {
  get: '#61affe',
  post: '#49cc90',
  put: '#fca130',
  patch: '#50e3c2',
  delete: '#f93e3e',
  options: '#0d5aa7',
  head: '#9012fe',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractEndpoints(spec: Record<string, unknown>): Endpoint[] {
  const paths = (spec.paths ?? {}) as Record<string, Record<string, unknown>>;
  const endpoints: Endpoint[] = [];
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of methods) {
      const op = pathItem[method] as Record<string, unknown> | undefined;
      if (!op) continue;
      endpoints.push({
        id: `${method}:${path}`,
        method,
        path,
        summary: (op.summary as string) ?? `${method.toUpperCase()} ${path}`,
        description: op.description as string | undefined,
        parameters: op.parameters as Parameter[] | undefined,
        requestBody: op.requestBody as RequestBodySpec | undefined,
        responses: op.responses as Record<string, ResponseSpec> | undefined,
        tags: op.tags as string[] | undefined,
      });
    }
  }
  return endpoints;
}

function buildDefaultTemplates(ep: Endpoint): Template[] {
  const templates: Template[] = [];

  const defaultParams: Record<string, string> = {};
  for (const p of ep.parameters ?? []) {
    const ex = p.example ?? p.schema?.example;
    defaultParams[p.name] = ex !== undefined ? String(ex) : '';
  }

  // Template 1 — minimal (required params only)
  const minimalParams: Record<string, string> = {};
  for (const p of ep.parameters ?? []) {
    if (p.required) {
      const ex = p.example ?? p.schema?.example;
      minimalParams[p.name] = ex !== undefined ? String(ex) : '';
    }
  }
  templates.push({
    id: 'minimal',
    name: 'Minimal (required only)',
    params: minimalParams,
    body: buildDefaultBody(ep, 'minimal'),
  });

  // Template 2 — full example
  templates.push({
    id: 'full',
    name: 'Full example',
    params: defaultParams,
    body: buildDefaultBody(ep, 'full'),
  });

  // Template 3 — empty (blank slate)
  const emptyParams: Record<string, string> = {};
  for (const p of ep.parameters ?? []) emptyParams[p.name] = '';
  templates.push({
    id: 'empty',
    name: 'Empty (blank slate)',
    params: emptyParams,
    body: '',
  });

  return templates;
}

function buildDefaultBody(ep: Endpoint, variant: 'minimal' | 'full'): string {
  const content = ep.requestBody?.content;
  if (!content) return '';
  const mediaType = Object.values(content)[0];
  if (!mediaType) return '';

  if (mediaType.example) return JSON.stringify(mediaType.example, null, 2);

  const schema = mediaType.schema;
  if (!schema?.properties) return '';

  const obj: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (variant === 'minimal' && ep.requestBody?.required === false) continue;
    obj[key] = prop.example ?? (prop.type === 'string' ? '' : prop.type === 'number' ? 0 : null);
  }
  return JSON.stringify(obj, null, 2);
}

function matchesSearch(ep: Endpoint, query: string): boolean {
  const q = query.toLowerCase();
  return (
    ep.path.toLowerCase().includes(q) ||
    ep.method.toLowerCase().includes(q) ||
    ep.summary.toLowerCase().includes(q) ||
    (ep.description?.toLowerCase().includes(q) ?? false) ||
    (ep.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function useSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  sensitivity = 50,
) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const [swiping, setSwiping] = useState<'left' | 'right' | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (startX.current === null || startY.current === null) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      // Only treat as horizontal swipe if horizontal movement dominates
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >= sensitivity) {
        const dir = dx < 0 ? 'left' : 'right';
        setSwiping(dir);
        setTimeout(() => setSwiping(null), 300);
        if (dir === 'left') onSwipeLeft();
        else onSwipeRight();
      }
      startX.current = null;
      startY.current = null;
    },
    [onSwipeLeft, onSwipeRight, sensitivity],
  );

  return { onTouchStart, onTouchEnd, swiping };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className="api-method-badge"
      style={{ backgroundColor: METHOD_COLORS[method] ?? '#999' }}
    >
      {method.toUpperCase()}
    </span>
  );
}

function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Build page window: always show first, last, current ±1
  const pages = new Set([1, totalPages, page, page - 1, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = Array.from(pages).sort((a, b) => a - b);

  return (
    <div className="api-pagination">
      <button onClick={onPrev} disabled={page === 1} aria-label="Previous page">
        ‹
      </button>
      {sorted.map((p, i) => {
        const prev = sorted[i - 1];
        return (
          <React.Fragment key={p}>
            {prev && p - prev > 1 && <span className="api-pagination-ellipsis">…</span>}
            <button
              onClick={() => onPage(p)}
              className={p === page ? 'active' : ''}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          </React.Fragment>
        );
      })}
      <button onClick={onNext} disabled={page === totalPages} aria-label="Next page">
        ›
      </button>
    </div>
  );
}

function RequestTemplates({
  endpoint,
  customTemplates,
  onSaveCustom,
}: {
  endpoint: Endpoint;
  customTemplates: Record<string, Template[]>;
  onSaveCustom: (endpointId: string, tpl: Template) => void;
}) {
  const builtIn = useMemo(() => buildDefaultTemplates(endpoint), [endpoint]);
  const custom = customTemplates[endpoint.id] ?? [];
  const allTemplates = [...builtIn, ...custom];

  const [selectedId, setSelectedId] = useState(builtIn[0]?.id ?? '');
  const [params, setParams] = useState<Record<string, string>>(builtIn[0]?.params ?? {});
  const [body, setBody] = useState(builtIn[0]?.body ?? '');
  const [saveName, setSaveName] = useState('');
  const [showSave, setShowSave] = useState(false);

  const selected = allTemplates.find((t) => t.id === selectedId);

  function applyTemplate(tpl: Template) {
    setSelectedId(tpl.id);
    setParams({ ...tpl.params });
    setBody(tpl.body);
  }

  function handleSave() {
    if (!saveName.trim()) return;
    const tpl: Template = {
      id: `custom-${Date.now()}`,
      name: saveName.trim(),
      params: { ...params },
      body,
      isCustom: true,
    };
    onSaveCustom(endpoint.id, tpl);
    setSaveName('');
    setShowSave(false);
  }

  const hasParams = (endpoint.parameters?.length ?? 0) > 0;
  const hasBody = !!endpoint.requestBody;

  return (
    <div className="api-templates">
      <div className="api-templates-header">
        <span>Request Templates</span>
        <select
          value={selectedId}
          onChange={(e) => {
            const tpl = allTemplates.find((t) => t.id === e.target.value);
            if (tpl) applyTemplate(tpl);
          }}
        >
          {allTemplates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.isCustom ? `★ ${t.name}` : t.name}
            </option>
          ))}
        </select>
      </div>

      {hasParams && (
        <div className="api-templates-params">
          {endpoint.parameters?.map((p) => (
            <label key={p.name} className="api-param-row">
              <span className="api-param-name">
                {p.name}
                {p.required && <sup>*</sup>}
                <small> ({p.in})</small>
              </span>
              <input
                type="text"
                value={params[p.name] ?? ''}
                placeholder={p.description ?? p.name}
                onChange={(e) => setParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      )}

      {hasBody && (
        <div className="api-templates-body">
          <label>Request Body</label>
          <textarea
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder='{"key": "value"}'
          />
        </div>
      )}

      <div className="api-templates-actions">
        <button onClick={() => setShowSave((v) => !v)}>Save as template</button>
        {showSave && (
          <>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Template name"
            />
            <button onClick={handleSave} disabled={!saveName.trim()}>
              Save
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function EndpointDetail({
  endpoint,
  customTemplates,
  onSaveCustom,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  endpoint: Endpoint;
  customTemplates: Record<string, Template[]>;
  onSaveCustom: (id: string, tpl: Template) => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const { onTouchStart, onTouchEnd, swiping } = useSwipe(onNext, onPrev);

  return (
    <div
      className={`api-endpoint-detail${swiping ? ` swipe-${swiping}` : ''}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="api-endpoint-detail-header">
        <MethodBadge method={endpoint.method} />
        <code className="api-endpoint-path">{endpoint.path}</code>
        <div className="api-endpoint-nav">
          <button onClick={onPrev} disabled={!hasPrev} aria-label="Previous endpoint">
            ← Prev
          </button>
          <button onClick={onNext} disabled={!hasNext} aria-label="Next endpoint">
            Next →
          </button>
        </div>
      </div>

      <h2>{endpoint.summary}</h2>
      {endpoint.description && <p className="api-endpoint-desc">{endpoint.description}</p>}

      {endpoint.tags && endpoint.tags.length > 0 && (
        <div className="api-endpoint-tags">
          {endpoint.tags.map((t) => (
            <span key={t} className="api-tag">{t}</span>
          ))}
        </div>
      )}

      <RequestTemplates
        endpoint={endpoint}
        customTemplates={customTemplates}
        onSaveCustom={onSaveCustom}
      />

      {endpoint.responses && (
        <div className="api-responses">
          <h3>Responses</h3>
          {Object.entries(endpoint.responses).map(([code, res]) => (
            <div key={code} className="api-response-row">
              <span className={`api-status-code status-${code[0]}xx`}>{code}</span>
              <span>{res.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type RateLimit = {
  per_minute?: number;
  per_hour?: number;
  concurrent?: number;
  tiers?: Record<string, { per_minute?: number; per_hour?: number; concurrent?: number }>;
  strict?: boolean;
};

const LANGS = [
  'JavaScript',
  'Python',
  'Go',
  'Java',
  'Ruby',
  'PHP',
  'cURL',
];

function buildExample(lang: string, baseUrl: string, endpoint: string) {
  const url = `${baseUrl}${endpoint}`;
  switch (lang) {
    case 'Python':
      return `import requests\n\nurl = "${url}"\nheaders = {"Authorization": "Bearer {API_KEY}"}\nresp = requests.get(url, headers=headers)\nprint(resp.status_code, resp.text)`;
    case 'JavaScript':
      return `const fetch = require('node-fetch')\n\nconst url = '${url}'\nconst res = await fetch(url, { headers: { 'Authorization': 'Bearer {API_KEY}' } })\nconst body = await res.text()\nconsole.log(res.status, body)`;
    case 'Go':
      return `package main\n\nimport (\n  \"fmt\"\n  \"net/http\"\n)\n\nfunc main() {\n  req, _ := http.NewRequest(\"GET\", \"${url}\", nil)\n  req.Header.Set(\"Authorization\", \"Bearer {API_KEY}\")\n  resp, _ := http.DefaultClient.Do(req)\n  defer resp.Body.Close()\n  fmt.Println(resp.Status)\n}`;
    case 'Java':
      return `import java.net.*;\nimport java.io.*;\n\nclass Example {\n  public static void main(String[] args) throws Exception {\n    URL url = new URL(\"${url}\");\n    HttpURLConnection con = (HttpURLConnection) url.openConnection();\n    con.setRequestProperty(\"Authorization\", \"Bearer {API_KEY}\");\n    System.out.println(con.getResponseCode());\n  }\n}`;
    case 'Ruby':
      return `require 'net/http'\n\nuri = URI('${url}')\nreq = Net::HTTP::Get.new(uri)\nreq['Authorization'] = 'Bearer {API_KEY}'\nres = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme==\"https\") { |http| http.request(req) }\nputs res.code`;
    case 'PHP':
      return `<?php\n$ch = curl_init();\ncurl_setopt($ch, CURLOPT_URL, '${url}');\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer {API_KEY}']);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n$res = curl_exec($ch);\necho curl_getinfo($ch, CURLINFO_HTTP_CODE);\n?>`;
    case 'cURL':
    default:
      return `curl -X GET '${url}' -H 'Authorization: Bearer {API_KEY}'`;
  }
}

/**
 * ApiReference
 *
 * Renders the OpenAPI spec via RedocStandalone.
 *
 * Notes on #229 (console warnings):
 * - `nativeScrollbars` avoids Redoc injecting its own scroll-position listeners
 *   that can fire React setState-after-unmount warnings.
 * - `lazyRendering` defers off-screen panels, reducing initial render depth and
 *   suppressing React warnings about large subtrees.
 * - `untrustedSpec: false` silences the "untrusted spec" console warning that
 *   Redoc emits when the option is absent.
 * - `suppressWarnings: true` silences Redoc's own internal console.warn calls
 *   for non-critical schema issues in the placeholder spec.
 */
export default function ApiReference(): React.JSX.Element {
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null);
  const [specVersion, setSpecVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  // #361: pagination state is seeded from — and mirrored back to — the URL
  // query string (?page=2&pageSize=50) so a page is bookmarkable/shareable.
  const initialPagination = useRef<PaginationParams>(readPaginationFromLocation());
  const [page, setPage] = useState(initialPagination.current.page);
  const [pageSize, setPageSize] = useState(initialPagination.current.pageSize);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customTemplates, setCustomTemplates] = useState<Record<string, Template[]>>({});

  // Search cache: key = `${specVersion}:${query}` → Endpoint[]
  const searchCache = useRef<Map<string, Endpoint[]>>(new Map());

  // Fetch + parse spec; bump specVersion to invalidate cache
  useEffect(() => {
    fetch('/openapi.yaml')
      .then((r) => r.text())
      .then((text) => {
        const parsed = jsYaml.load(text) as Record<string, unknown>;
        setSpec(parsed);
        setSpecVersion((v) => v + 1);
        searchCache.current.clear();
      })
      .catch((e) => setError(String(e)));
  }, []);

  const allEndpoints = useMemo(() => (spec ? extractEndpoints(spec) : []), [spec]);

  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  // Filtered endpoints with caching
  const filtered = useMemo(() => {
    const cacheKey = `${specVersion}:${debouncedQuery}`;
    if (searchCache.current.has(cacheKey)) {
      return searchCache.current.get(cacheKey)!;
    }
    const result = debouncedQuery.trim()
      ? allEndpoints.filter((ep) => matchesSearch(ep, debouncedQuery))
      : allEndpoints;
    searchCache.current.set(cacheKey, result);
    return result;
  }, [allEndpoints, debouncedQuery, specVersion]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
    setSelectedId(null);
  }, [debouncedQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  // Clamp page to valid range
  const safePage = Math.min(page, totalPages);

  // #361: keep the URL in sync with the effective pagination state.
  useEffect(() => {
    syncPaginationToLocation({ page: safePage, pageSize });
  }, [safePage, pageSize]);

  // #361: respond to browser back/forward navigation between pages.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = () => {
      const next = parsePaginationParams(window.location.search);
      setPage(next.page);
      setPageSize(next.pageSize);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Correct slice: (page-1)*pageSize … page*pageSize (no off-by-one)
  const pageEndpoints = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const selectedIndex = selectedId ? filtered.findIndex((e) => e.id === selectedId) : -1;
  const selectedEndpoint = selectedIndex >= 0 ? filtered[selectedIndex] : null;

  function selectEndpoint(ep: Endpoint) {
    setSelectedId(ep.id);
    // Navigate to the correct page for this endpoint
    const idx = filtered.findIndex((e) => e.id === ep.id);
    if (idx >= 0) setPage(Math.floor(idx / pageSize) + 1);
  }

  function navigateEndpoint(delta: number) {
    if (selectedIndex < 0) return;
    const next = filtered[selectedIndex + delta];
    if (!next) return;
    selectEndpoint(next);
  }

  function saveCustomTemplate(endpointId: string, tpl: Template) {
    setCustomTemplates((prev) => ({
      ...prev,
      [endpointId]: [...(prev[endpointId] ?? []), tpl],
    }));
  }

  if (error) return <div className="api-error">Failed to load spec: {error}</div>;
  if (!spec) return <div className="api-loading">Loading API reference…</div>;

  return (
    <div className="api-reference">
      {/* Search */}
      <div className="api-search-bar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search endpoints…"
          aria-label="Search endpoints"
        />
        <span className="api-search-count">
          {filtered.length} / {allEndpoints.length} endpoints
        </span>
      </div>

      <div className="api-layout">
        {/* Endpoint list + pagination */}
        <nav className="api-endpoint-list">
          {pageEndpoints.length === 0 ? (
            <p className="api-no-results">No endpoints match your search.</p>
          ) : (
            pageEndpoints.map((ep) => (
              <button
                key={ep.id}
                className={`api-endpoint-item${selectedId === ep.id ? ' selected' : ''}`}
                onClick={() => selectEndpoint(ep)}
              >
                <MethodBadge method={ep.method} />
                <span className="api-endpoint-item-path">{ep.path}</span>
              </button>
            ))
          )}

          <Pagination
            page={safePage}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            onPage={setPage}
          />

          <p className="api-page-info">
            Page {safePage} of {totalPages} · {filtered.length} endpoint{filtered.length !== 1 ? 's' : ''}
          </p>
        </nav>

        {/* Detail panel */}
        <main className="api-detail-panel">
          {selectedEndpoint ? (
            <EndpointDetail
              endpoint={selectedEndpoint}
              customTemplates={customTemplates}
              onSaveCustom={saveCustomTemplate}
              onPrev={() => navigateEndpoint(-1)}
              onNext={() => navigateEndpoint(1)}
              hasPrev={selectedIndex > 0}
              hasNext={selectedIndex < filtered.length - 1}
            />
          ) : (
            <div className="api-empty-state">
              <p>Select an endpoint from the list to view details.</p>
              {allEndpoints.length === 0 && (
                <p className="api-hint">
                  No endpoints found. Add paths to <code>static/openapi.yaml</code>.
                </p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
