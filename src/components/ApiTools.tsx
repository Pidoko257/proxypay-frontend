import React, { useEffect, useMemo, useState } from 'react';
import jsYaml from 'js-yaml';
import { Highlight, themes } from 'prism-react-renderer';
import { useBaseUrl } from '@docusaurus/useBaseUrl';
import { useRequestHistory } from '../hooks/useRequestHistory';
import type { OpenAPISpec, ParsedEndpoint } from '../utils/apiSpecParser';
import {
  buildPostmanAssets,
  createSchemaExample,
  getApiEndpoints,
  getEndpointResponseExample,
  makeCurlCommand,
} from '../utils/apiTools';
import styles from './ApiTools.module.css';

type ToolTab = 'examples' | 'playground' | 'postman';
type ResponseState = {
  status: number;
  statusText: string;
  duration: number;
  headers: Record<string, string>;
  body: string;
};

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? 'null';
}

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([typeof data === 'string' ? data : formatJson(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getOperation(spec: OpenAPISpec, endpoint: ParsedEndpoint): Record<string, any> {
  return spec.paths?.[endpoint.path]?.[endpoint.method] || {};
}

function CodeBlock({ code, language = 'json' }: { code: string; language?: 'json' | 'bash' | 'text' }) {
  return (
    <Highlight theme={themes.github} code={code} language={language === 'text' ? 'json' : language}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre className={`${styles.codeBlock} ${className}`} style={style}>
          <code>
            {tokens.map((line, lineIndex) => (
              <span key={lineIndex} {...getLineProps({ line })}>
                {line.map((token, tokenIndex) => (
                  <span key={tokenIndex} {...getTokenProps({ token })} />
                ))}
                {'\n'}
              </span>
            ))}
          </code>
        </pre>
      )}
    </Highlight>
  );
}

export default function ApiTools(): React.JSX.Element {
  const specUrl = useBaseUrl('/openapi.yaml');
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<ToolTab>('examples');
  const [selectedId, setSelectedId] = useState('');
  const [responseCode, setResponseCode] = useState('');
  const [customResponse, setCustomResponse] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({});
  const [authorization, setAuthorization] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [requestContentType, setRequestContentType] = useState('application/json');
  const [response, setResponse] = useState<ResponseState | null>(null);
  const [requestError, setRequestError] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const { history, addEntry, clearHistory } = useRequestHistory();

  useEffect(() => {
    let active = true;
    fetch(specUrl)
      .then((result) => {
        if (!result.ok) throw new Error(`OpenAPI file returned ${result.status}`);
        return result.text();
      })
      .then((text) => {
        const loaded = jsYaml.load(text) as OpenAPISpec;
        if (!loaded || typeof loaded !== 'object') throw new Error('The OpenAPI file is empty or invalid.');
        if (active) {
          setSpec(loaded);
          setBaseUrl(loaded.servers?.[0]?.url || '');
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Unable to load the OpenAPI file.');
      });
    return () => {
      active = false;
    };
  }, [specUrl]);

  const endpoints = useMemo(() => (spec ? getApiEndpoints(spec) : []), [spec]);
  const selectedEndpoint = endpoints.find((endpoint) => endpoint.id === selectedId) || endpoints[0];
  const operation = selectedEndpoint && spec ? getOperation(spec, selectedEndpoint) : {};
  const pathItem = selectedEndpoint && spec ? spec.paths?.[selectedEndpoint.path] || {} : {};
  const parameters = [
    ...((pathItem as Record<string, any>).parameters || []),
    ...(operation.parameters || []),
  ];
  const responseCodes = selectedEndpoint ? Object.keys(selectedEndpoint.responses || {}).sort() : [];
  const exampleCode = responseCodes.includes(responseCode)
    ? responseCode
    : responseCodes.find((code) => /^2\d\d$/.test(code)) || responseCodes[0] || '';
  const generatedResponse = selectedEndpoint && spec
    ? getEndpointResponseExample(spec, selectedEndpoint, exampleCode || undefined)
    : null;
  const bodyOptions = Object.keys(operation.requestBody?.content || {});
  const exampleHeaders = Object.fromEntries(
    parameters
      .filter((parameter: any) => parameter.in === 'header')
      .map((parameter: any) => [parameter.name, parameterValues[`header:${parameter.name}`] ?? String(parameter.example ?? '')]),
  );
  const requestHeaders = {
    ...exampleHeaders,
    ...(authorization ? { Authorization: authorization } : {}),
    ...(requestBody.trim() && requestContentType ? { 'Content-Type': requestContentType } : {}),
  };
  const curlCommand = selectedEndpoint
    ? makeCurlCommand(selectedEndpoint, baseUrl, requestHeaders, parameterValues, requestBody)
    : '';

  useEffect(() => {
    if (!selectedEndpoint || !spec) return;
    const example = getEndpointResponseExample(spec, selectedEndpoint, exampleCode || undefined);
    setCustomResponse(formatJson(example.body));
  }, [selectedEndpoint?.id, exampleCode, spec]);

  useEffect(() => {
    if (!selectedEndpoint || !spec) return;
    const contents = operation.requestBody?.content || {};
    const contentType = contents['application/json'] ? 'application/json' : Object.keys(contents)[0];
    setRequestContentType(contentType || 'application/json');
    const requestExample = contentType ? contents[contentType] : undefined;
    const example = requestExample?.example ?? createSchemaExample(requestExample?.schema, spec);
    setRequestBody(requestExample ? formatJson(example) : '');
  }, [selectedEndpoint?.id, spec]);

  const setParameterValue = (key: string, value: string) => {
    setParameterValues((previous) => ({ ...previous, [key]: value }));
  };

  const runRequest = async () => {
    if (!selectedEndpoint) return;
    setSending(true);
    setRequestError('');
    setResponse(null);
    const path = selectedEndpoint.path.replace(/\{([^}]+)\}/g, (_match, name: string) => {
      const value = parameterValues[`path:${name}`];
      return value ? encodeURIComponent(value) : `{${name}}`;
    });
    const query = Object.fromEntries(
      Object.entries(parameterValues)
        .filter(([key, value]) => key.startsWith('query:') && value)
        .map(([key, value]) => [key.slice('query:'.length), value]),
    );
    const queryString = new URLSearchParams(query).toString();
    const targetUrl = `${baseUrl.replace(/\/$/, '')}${path}${queryString ? `?${queryString}` : ''}`;
    const startedAt = performance.now();
    try {
      let body: string | undefined;
      if (requestBody.trim() && !['get', 'head'].includes(selectedEndpoint.method.toLowerCase())) {
        if (requestContentType.includes('json')) JSON.parse(requestBody);
        body = requestBody;
      }
      const result = await fetch(targetUrl, {
        method: selectedEndpoint.method.toUpperCase(),
        headers: requestHeaders,
        body,
      });
      const text = await result.text();
      let formattedBody = text;
      try {
        formattedBody = formatJson(JSON.parse(text));
      } catch {
        // Preserve non-JSON response bodies as received.
      }
      const duration = Math.round(performance.now() - startedAt);
      const responseHeaders: Record<string, string> = {};
      result.headers.forEach((value, name) => {
        responseHeaders[name] = value;
      });
      setResponse({
        status: result.status,
        statusText: result.statusText,
        duration,
        headers: responseHeaders,
        body: formattedBody,
      });
      addEntry(selectedEndpoint.method.toUpperCase(), `${path}${queryString ? `?${queryString}` : ''}`, result.status, duration);
    } catch (error) {
      const duration = Math.round(performance.now() - startedAt);
      if (error instanceof SyntaxError) {
        setRequestError('Request body is not valid JSON.');
      } else {
        setRequestError(error instanceof Error ? error.message : 'The request could not be completed.');
        addEntry(selectedEndpoint.method.toUpperCase(), path, 0, duration);
      }
    } finally {
      setSending(false);
    }
  };

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlCommand);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setRequestError('Clipboard access is unavailable in this browser.');
    }
  };

  const chooseHistoryEntry = (method: string, path: string) => {
    const match = endpoints.find((endpoint) => endpoint.method.toUpperCase() === method && endpoint.path === path.split('?')[0]);
    if (match) {
      setSelectedId(match.id);
      setTab('playground');
    }
  };

  const postmanAssets = spec ? buildPostmanAssets(spec) : null;

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>ProxyPay developer tools</p>
          <h1>API workbench</h1>
        </div>
        <span className={styles.endpointCount}>{endpoints.length} endpoints</span>
      </header>

      <nav className={styles.tabs} aria-label="API tools">
        {([
          ['examples', 'Response examples'],
          ['playground', 'Playground'],
          ['postman', 'Postman export'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={tab === value ? styles.activeTab : styles.tab}
            onClick={() => setTab(value)}
            aria-current={tab === value ? 'page' : undefined}
          >
            {label}
          </button>
        ))}
      </nav>

      {loadError && <p className={styles.errorBanner} role="alert">{loadError}</p>}
      {!spec && !loadError && <p className={styles.notice}>Loading OpenAPI specification...</p>}
      {spec && endpoints.length === 0 && (
        <p className={styles.notice}>
          No API endpoints are defined in the OpenAPI specification yet. Add operations to <code>static/openapi.yaml</code> to populate these tools.
        </p>
      )}

      {spec && endpoints.length > 0 && (
        <>
          {tab !== 'postman' && (
            <div className={styles.endpointBar}>
              <label htmlFor="tool-endpoint">Endpoint</label>
              <select
                id="tool-endpoint"
                value={selectedEndpoint?.id || ''}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {endpoints.map((endpoint) => (
                  <option key={endpoint.id} value={endpoint.id}>
                    {endpoint.method.toUpperCase()} {endpoint.path} - {endpoint.summary}
                  </option>
                ))}
              </select>
              {selectedEndpoint && <span className={styles.endpointSummary}>{selectedEndpoint.summary}</span>}
            </div>
          )}

          {tab === 'examples' && selectedEndpoint && generatedResponse && (
            <section className={styles.toolPanel} aria-labelledby="examples-heading">
              <div className={styles.panelHeading}>
                <div>
                  <p className={styles.eyebrow}>Response catalog</p>
                  <h2 id="examples-heading">Example response</h2>
                </div>
                <label className={styles.inlineControl}>
                  Scenario
                  <select value={exampleCode} onChange={(event) => setResponseCode(event.target.value)}>
                    {responseCodes.length ? responseCodes.map((code) => <option key={code} value={code}>{code}</option>) : <option value="">Generated</option>}
                  </select>
                </label>
              </div>
              <div className={styles.exampleMeta}>
                <span className={`${styles.methodBadge} ${styles[`method_${selectedEndpoint.method}`] || ''}`}>{selectedEndpoint.method.toUpperCase()}</span>
                <code>{selectedEndpoint.path}</code>
                <span>HTTP {generatedResponse.status}</span>
                {selectedEndpoint.deprecated && <span className={styles.deprecated}>Deprecated</span>}
              </div>
              <div className={styles.exampleGrid}>
                <div>
                  <div className={styles.subheading}><h3>Response headers</h3></div>
                  {Object.entries(generatedResponse.headers).length ? (
                    <dl className={styles.headerList}>
                      {Object.entries(generatedResponse.headers).map(([name, value]) => (
                        <div key={name}><dt>{name}</dt><dd>{String(value)}</dd></div>
                      ))}
                    </dl>
                  ) : <p className={styles.muted}>No response headers are documented for this scenario.</p>}
                </div>
                <div>
                  <div className={styles.subheading}>
                    <h3>Example body</h3>
                    <button type="button" className={styles.textButton} onClick={() => setCustomResponse(formatJson(generatedResponse.body))}>Reset</button>
                    <button type="button" className={styles.textButton} onClick={() => downloadJson('response-example.json', customResponse || 'null')}>Download JSON</button>
                  </div>
                  <textarea
                    className={styles.editor}
                    aria-label="Customize response example JSON"
                    value={customResponse}
                    onChange={(event) => setCustomResponse(event.target.value)}
                    spellCheck={false}
                  />
                </div>
              </div>
              <details className={styles.details}>
                <summary>Request as cURL</summary>
                <CodeBlock code={curlCommand} language="bash" />
                <button type="button" className={styles.secondaryButton} onClick={copyCurl}>{copied ? 'Copied' : 'Copy cURL'}</button>
              </details>
            </section>
          )}

          {tab === 'playground' && selectedEndpoint && (
            <section className={styles.toolPanel} aria-labelledby="playground-heading">
              <div className={styles.panelHeading}>
                <div>
                  <p className={styles.eyebrow}>Live request</p>
                  <h2 id="playground-heading">Try an endpoint</h2>
                </div>
                <button type="button" className={styles.primaryButton} onClick={runRequest} disabled={sending}>
                  {sending ? 'Sending...' : 'Send request'}
                </button>
              </div>
              <div className={styles.urlRow}>
                <select aria-label="HTTP method" value={selectedEndpoint.id} onChange={(event) => setSelectedId(event.target.value)}>
                  {endpoints.map((endpoint) => <option key={endpoint.id} value={endpoint.id}>{endpoint.method.toUpperCase()}</option>)}
                </select>
                <input aria-label="API base URL" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.example.com" />
                <code>{selectedEndpoint.path}</code>
              </div>
              <div className={styles.playgroundGrid}>
                <div className={styles.fieldsColumn}>
                  <h3>Parameters</h3>
                  {parameters.filter((parameter: any) => ['path', 'query'].includes(parameter.in)).map((parameter: any) => {
                    const key = `${parameter.in}:${parameter.name}`;
                    return (
                      <label className={styles.field} key={key}>
                        <span>{parameter.name} <small>{parameter.in}{parameter.required ? ' - required' : ''}</small></span>
                        <input
                          value={parameterValues[key] ?? String(parameter.example ?? parameter.schema?.default ?? '')}
                          onChange={(event) => setParameterValue(key, event.target.value)}
                          placeholder={parameter.description || parameter.name}
                        />
                      </label>
                    );
                  })}
                  {!parameters.some((parameter: any) => ['path', 'query'].includes(parameter.in)) && <p className={styles.muted}>No path or query parameters.</p>}
                  <h3>Headers</h3>
                  <label className={styles.field}><span>Authorization <small>optional</small></span><input value={authorization} onChange={(event) => setAuthorization(event.target.value)} placeholder="Bearer token" /></label>
                  {parameters.filter((parameter: any) => parameter.in === 'header').map((parameter: any) => {
                    const key = `header:${parameter.name}`;
                    return (
                      <label className={styles.field} key={key}>
                        <span>{parameter.name}{parameter.required ? ' - required' : ''}</span>
                        <input
                          value={parameterValues[key] ?? String(parameter.example ?? '')}
                          onChange={(event) => setParameterValue(key, event.target.value)}
                          placeholder={parameter.description || parameter.name}
                        />
                      </label>
                    );
                  })}
                </div>
                <div className={styles.requestColumn}>
                  <div className={styles.subheading}>
                    <h3>Request body</h3>
                    {bodyOptions.length > 0 && (
                      <select aria-label="Request content type" value={requestContentType} onChange={(event) => setRequestContentType(event.target.value)}>
                        {bodyOptions.map((contentType) => <option key={contentType}>{contentType}</option>)}
                      </select>
                    )}
                  </div>
                  {bodyOptions.length ? (
                    <textarea className={styles.editor} aria-label="Request body" value={requestBody} onChange={(event) => setRequestBody(event.target.value)} spellCheck={false} />
                  ) : <p className={styles.muted}>This operation has no request body.</p>}
                  {requestError && <p className={styles.errorBanner} role="alert">{requestError}</p>}
                  {response && (
                    <div className={styles.responsePane}>
                      <div className={styles.responseHeading}>
                        <h3>Response</h3>
                        <span className={response.status >= 200 && response.status < 400 ? styles.statusGood : styles.statusBad}>{response.status || 'Network error'} {response.statusText}</span>
                        <span>{response.duration} ms</span>
                      </div>
                      <details className={styles.details}>
                        <summary>Response headers ({Object.keys(response.headers).length})</summary>
                        <CodeBlock code={formatJson(response.headers)} />
                      </details>
                      <CodeBlock code={response.body || '(empty response)'} language={response.body.trim().startsWith('{') || response.body.trim().startsWith('[') ? 'json' : 'text'} />
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.subheading}>
                <h3>Recent requests</h3>
                {history.length > 0 && <button type="button" className={styles.textButton} onClick={clearHistory}>Clear history</button>}
              </div>
              {history.length ? (
                <ul className={styles.historyList}>
                  {history.slice(0, 8).map((entry) => (
                    <li key={entry.id}>
                      <button type="button" onClick={() => chooseHistoryEntry(entry.method, entry.path)}>
                        <strong>{entry.method}</strong> <code>{entry.path}</code>
                      </button>
                      <span className={entry.statusCode >= 200 && entry.statusCode < 400 ? styles.statusGood : styles.statusBad}>{entry.statusCode || 'ERR'}</span>
                      <span>{entry.latency} ms</span>
                      <time>{new Date(entry.timestamp).toLocaleTimeString()}</time>
                    </li>
                  ))}
                </ul>
              ) : <p className={styles.muted}>Requests you send will appear here.</p>}
            </section>
          )}

          {tab === 'postman' && postmanAssets && (
            <section className={styles.toolPanel} aria-labelledby="postman-heading">
              <div className={styles.panelHeading}>
                <div>
                  <p className={styles.eyebrow}>Postman v2.1</p>
                  <h2 id="postman-heading">Export API collection</h2>
                </div>
                <div className={styles.actionGroup}>
                  <button type="button" className={styles.secondaryButton} onClick={() => downloadJson('proxypay-environment.postman_environment.json', postmanAssets.environment)}>Environment JSON</button>
                  <button type="button" className={styles.primaryButton} onClick={() => downloadJson('proxypay.postman_collection.json', postmanAssets.collection)}>Collection JSON</button>
                </div>
              </div>
              <p className={styles.postmanSummary}>{endpoints.length} operations will be included with their methods, paths, query parameters, headers, and generated request examples.</p>
              <ol className={styles.importSteps}>
                <li>In Postman, select <strong>Import</strong> and choose the collection JSON file.</li>
                <li>Import the environment JSON separately, then select it from the environment menu.</li>
                <li>Set <code>baseUrl</code> and add your credentials before sending requests.</li>
              </ol>
              <div className={styles.subheading}><h3>Included operations</h3></div>
              <ul className={styles.operationList}>
                {endpoints.map((endpoint) => <li key={endpoint.id}><span>{endpoint.method.toUpperCase()}</span><code>{endpoint.path}</code><small>{endpoint.summary}</small></li>)}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}