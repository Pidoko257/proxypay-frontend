import React, { useMemo, useState } from 'react';
import jsYaml from 'js-yaml';
import { OpenAPISpec, ParsedEndpoint, parseEndpoints } from '../utils/apiSpecParser';
import styles from './ApiVersionComparison.module.css';

type ChangeKind = 'added' | 'removed' | 'changed';
interface FieldChange {
  path: string;
  kind: ChangeKind;
}
interface OperationChange {
  key: string;
  kind: ChangeKind;
  breaking: boolean;
  details: FieldChange[];
}
interface LoadedSpec {
  name: string;
  version: string;
  endpoints: ParsedEndpoint[];
}

function endpointKey(endpoint: ParsedEndpoint): string {
  return `${endpoint.method.toUpperCase()} ${endpoint.path}`;
}

function comparableEndpoint(endpoint: ParsedEndpoint): Record<string, unknown> {
  return {
    summary: endpoint.summary,
    description: endpoint.description,
    deprecated: endpoint.deprecated,
    parameters: Object.fromEntries((endpoint.parameters ?? []).map((parameter) => [
      `${parameter.in}:${parameter.name}`,
      parameter,
    ])),
    requestBody: endpoint.requestBody,
    responses: endpoint.responses,
  };
}

function collectChanges(before: unknown, after: unknown, path = ''): FieldChange[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (before && after && typeof before === 'object' && typeof after === 'object'
    && !Array.isArray(before) && !Array.isArray(after)) {
    const left = before as Record<string, unknown>;
    const right = after as Record<string, unknown>;
    return [...new Set([...Object.keys(left), ...Object.keys(right)])]
      .sort()
      .flatMap((key) => collectChanges(left[key], right[key], path ? `${path}.${key}` : key));
  }
  const kind: ChangeKind = before === undefined ? 'added' : after === undefined ? 'removed' : 'changed';
  return [{ path: path || 'operation', kind }];
}

function isBreakingChange(change: OperationChange, previous: ParsedEndpoint | undefined, next: ParsedEndpoint | undefined): boolean {
  if (change.kind === 'removed') return true;
  if (!previous || !next) return false;
  return change.details.some((detail) => {
    if (detail.kind === 'removed' && (detail.path.startsWith('responses.') || detail.path.startsWith('requestBody.'))) return true;
    if (detail.path.startsWith('parameters.') && detail.path.endsWith('.required') && detail.kind !== 'removed') {
      const required = next.parameters?.some((parameter) => parameter.required && detail.path === `parameters.${parameter.in}:${parameter.name}.required`);
      return Boolean(required);
    }
    return detail.path === 'requestBody.required' && detail.kind !== 'removed' && next.requestBody?.required === true;
  });
}

function compareSpecs(previous: ParsedEndpoint[], next: ParsedEndpoint[]): OperationChange[] {
  const oldByKey = new Map(previous.map((endpoint) => [endpointKey(endpoint), endpoint]));
  const newByKey = new Map(next.map((endpoint) => [endpointKey(endpoint), endpoint]));
  const keys = [...new Set([...oldByKey.keys(), ...newByKey.keys()])].sort();
  return keys.flatMap((key) => {
    const before = oldByKey.get(key);
    const after = newByKey.get(key);
    if (!before) return [{ key, kind: 'added' as const, breaking: false, details: [] }];
    if (!after) return [{ key, kind: 'removed' as const, breaking: true, details: [] }];
    const details = collectChanges(comparableEndpoint(before), comparableEndpoint(after));
    if (!details.length) return [];
    const change = { key, kind: 'changed' as const, breaking: false, details };
    change.breaking = isBreakingChange(change, before, after);
    return [change];
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] as string);
}

async function readSpec(file: File): Promise<LoadedSpec> {
  const parsed = jsYaml.load(await file.text()) as OpenAPISpec | undefined;
  if (!parsed || typeof parsed !== 'object' || !parsed.info || typeof parsed.info.version !== 'string') {
    throw new Error('This file is not a valid OpenAPI document with an info.version field.');
  }
  return { name: file.name, version: parsed.info.version, endpoints: parseEndpoints(parsed) };
}

export default function ApiVersionComparison(): React.JSX.Element {
  const [older, setOlder] = useState<LoadedSpec | null>(null);
  const [newer, setNewer] = useState<LoadedSpec | null>(null);
  const [error, setError] = useState('');
  const changes = useMemo(() => older && newer ? compareSpecs(older.endpoints, newer.endpoints) : [], [older, newer]);
  const breaking = changes.filter((change) => change.breaking);

  const handleUpload = (side: 'older' | 'newer') => async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const loaded = await readSpec(file);
      (side === 'older' ? setOlder : setNewer)(loaded);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to read this OpenAPI file.');
    }
    event.target.value = '';
  };

  const downloadReport = () => {
    if (!older || !newer) return;
    const rows = changes.map((change) => `<tr><td>${escapeHtml(change.key)}</td><td>${change.kind}</td><td>${change.breaking ? 'Breaking' : 'Non-breaking'}</td><td>${escapeHtml(change.details.map((detail) => `${detail.kind}: ${detail.path}`).join('; ') || 'Endpoint availability changed')}</td></tr>`).join('');
    const report = `<!doctype html><html><head><meta charset="utf-8"><title>API migration report</title><style>body{font:14px system-ui,sans-serif;max-width:1100px;margin:40px auto;padding:0 20px;color:#17241f}h1{font-size:26px}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:10px;border:1px solid #cbd5d1}th{background:#edf3ef}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print / Save as PDF</button><h1>API migration report</h1><p>${escapeHtml(older.version)} (${escapeHtml(older.name)}) → ${escapeHtml(newer.version)} (${escapeHtml(newer.name)})</p><h2>Migration checklist</h2><ul>${breaking.map((change) => `<li>Review ${escapeHtml(change.key)}${change.details.length ? `: ${escapeHtml(change.details.map((detail) => detail.path).join(', '))}` : ''}</li>`).join('') || '<li>No breaking changes detected.</li>'}</ul><table><thead><tr><th>Endpoint</th><th>Change</th><th>Impact</th><th>Details</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No endpoint changes found.</td></tr>'}</tbody></table></body></html>`;
    const url = URL.createObjectURL(new Blob([report], { type: 'text/html' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `api-migration-${older.version}-to-${newer.version}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>API CHANGE ANALYSIS</p>
        <h1>Version comparison</h1>
        <p>Compare two OpenAPI snapshots to see endpoint, parameter, and response changes.</p>
      </header>
      <section className={styles.uploads} aria-label="API versions">
        <label className={styles.upload}>
          <span>Older version</span>
          <strong>{older ? `${older.version} · ${older.name}` : 'Choose an OpenAPI file'}</strong>
          <input type="file" accept=".yaml,.yml,.json,application/json,text/yaml" onChange={handleUpload('older')} />
        </label>
        <label className={styles.upload}>
          <span>Newer version</span>
          <strong>{newer ? `${newer.version} · ${newer.name}` : 'Choose an OpenAPI file'}</strong>
          <input type="file" accept=".yaml,.yml,.json,application/json,text/yaml" onChange={handleUpload('newer')} />
        </label>
      </section>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {older && newer && (
        <>
          <section className={styles.summary} aria-label="Comparison summary">
            <span><strong>{changes.filter((change) => change.kind === 'added').length}</strong> added</span>
            <span><strong>{changes.filter((change) => change.kind === 'removed').length}</strong> removed</span>
            <span><strong>{changes.filter((change) => change.kind === 'changed').length}</strong> changed</span>
            <span className={styles.breakingCount}><strong>{breaking.length}</strong> breaking</span>
            <div className={styles.actions}>
              <button type="button" onClick={downloadReport}>Download HTML report</button>
              <button type="button" onClick={() => window.print()}>Print / Save PDF</button>
            </div>
          </section>
          <section className={styles.checklist}>
            <h2>Migration checklist</h2>
            {breaking.length ? <ul>{breaking.map((change) => <li key={change.key}>Review <code>{change.key}</code>{change.details.length > 0 && `: ${change.details.map((detail) => `${detail.kind} ${detail.path}`).join(', ')}`}</li>)}</ul> : <p>No breaking changes detected.</p>}
          </section>
          <section className={styles.results} aria-label="Endpoint changes">
            <h2>Endpoint changes</h2>
            {changes.length ? changes.map((change) => (
              <article className={styles.change} key={change.key}>
                <div className={styles.changeTitle}><code>{change.key}</code><span data-kind={change.kind}>{change.kind}</span>{change.breaking && <strong>Breaking</strong>}</div>
                {change.details.length > 0 && <ul>{change.details.map((detail) => <li key={`${detail.path}:${detail.kind}`}><span>{detail.kind}</span> <code>{detail.path}</code></li>)}</ul>}
              </article>
            )) : <p>No endpoint changes found between these versions.</p>}
          </section>
        </>
      )}
    </main>
  );
}
