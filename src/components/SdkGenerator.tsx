import React, { useMemo, useState } from 'react';
import jsYaml from 'js-yaml';
import JSZip from 'jszip';
import { OpenAPISpec, ParsedEndpoint, parseEndpoints } from '../utils/apiSpecParser';
import styles from './SdkGenerator.module.css';

type Language = 'javascript' | 'python' | 'java' | 'go';
type Style = 'oop' | 'functional';
interface LoadedApi {
  name: string;
  spec: OpenAPISpec;
  endpoints: ParsedEndpoint[];
}

const languageLabels: Record<Language, string> = {
  javascript: 'JavaScript', python: 'Python', java: 'Java', go: 'Go',
};

function camelCase(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+(.)?/g, (_match, next: string | undefined) => next ? next.toUpperCase() : '').replace(/^[A-Z]/, (first) => first.toLowerCase()) || 'callApi';
}

function snakeCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase() || 'call_api';
}

function operationName(endpoint: ParsedEndpoint, language: Language): string {
  const source = endpoint.operationId || `${endpoint.method}_${endpoint.path.replace(/[{}]/g, '')}`;
  const clean = source.replace(/[^a-zA-Z0-9]+/g, '_');
  return language === 'python' ? snakeCase(clean) : camelCase(clean);
}

function schemaName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^[^a-zA-Z_$]/, '_$&') || 'ApiModel';
}

function schemaType(schema: Record<string, unknown> | undefined, language: Language): string {
  if (!schema) return language === 'javascript' ? 'unknown' : 'object';
  if (typeof schema.$ref === 'string') return schemaName(schema.$ref.split('/').pop() || 'ApiModel');
  const type = schema.type;
  if (type === 'array') return language === 'go' ? `[]${schemaType(schema.items as Record<string, unknown>, language)}` : language === 'java' ? `List<${schemaType(schema.items as Record<string, unknown>, language)}>` : language === 'python' ? `list[${schemaType(schema.items as Record<string, unknown>, language)}]` : `${schemaType(schema.items as Record<string, unknown>, language)}[]`;
  if (type === 'object' || schema.properties) return language === 'go' ? 'map[string]any' : language === 'java' ? 'Map<String, Object>' : language === 'python' ? 'dict[str, object]' : 'Record<string, unknown>';
  if (type === 'integer') return language === 'go' ? 'int64' : language === 'java' ? 'Long' : language === 'python' ? 'int' : 'number';
  if (type === 'number') return language === 'go' ? 'float64' : language === 'java' ? 'Double' : language === 'python' ? 'float' : 'number';
  if (type === 'boolean') return language === 'go' ? 'bool' : language === 'java' ? 'Boolean' : language === 'python' ? 'bool' : 'boolean';
  if (type === 'string') return language === 'go' ? 'string' : language === 'java' ? 'String' : language === 'python' ? 'str' : 'string';
  return language === 'go' ? 'any' : language === 'java' ? 'Object' : language === 'python' ? 'object' : 'unknown';
}

function modelDefinitions(spec: OpenAPISpec, language: Language): string {
  const schemas = spec.components?.schemas as Record<string, Record<string, unknown>> | undefined;
  if (!schemas || !Object.keys(schemas).length) return '';
  if (language === 'javascript') {
    return Object.entries(schemas).map(([name, schema]) => {
      const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
      const required = new Set((schema.required as string[] | undefined) ?? []);
      return `export interface ${schemaName(name)} {\n${Object.entries(properties).map(([key, value]) => `  ${JSON.stringify(key)}${required.has(key) ? '' : '?'}: ${schemaType(value, language)};`).join('\n')}\n}`;
    }).join('\n\n');
  }
  if (language === 'python') {
    return `from typing import TypedDict, NotRequired\n\n` + Object.entries(schemas).map(([name, schema]) => {
      const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
      const required = new Set((schema.required as string[] | undefined) ?? []);
      return `class ${schemaName(name)}(TypedDict):\n${Object.entries(properties).map(([key, value]) => `    ${key}: ${required.has(key) ? schemaType(value, language) : `NotRequired[${schemaType(value, language)}]`}`).join('\n') || '    pass'}`;
    }).join('\n\n');
  }
  if (language === 'go') {
    return Object.entries(schemas).map(([name, schema]) => {
      const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
      return `type ${schemaName(name)} struct {\n${Object.entries(properties).map(([key, value]) => `\t${key.slice(0, 1).toUpperCase()}${key.slice(1)} ${schemaType(value, language)} \`json:${JSON.stringify(key)}\``).join('\n')}\n}`;
    }).join('\n\n');
  }
  return Object.entries(schemas).map(([name, schema]) => {
    const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
    return `public static class ${schemaName(name)} {\n${Object.entries(properties).map(([key, value]) => `  public ${schemaType(value, language)} ${key};`).join('\n')}\n}`;
  }).join('\n\n');
}

function generateJavaScript(endpoints: ParsedEndpoint[], style: Style): string {
  const methods = endpoints.map((endpoint) => {
    const name = operationName(endpoint, 'javascript');
    const doc = (endpoint.summary || `${endpoint.method.toUpperCase()} ${endpoint.path}`).replace(/\*\//g, '* /');
    const call = `this.request(${JSON.stringify(endpoint.method.toUpperCase())}, ${JSON.stringify(endpoint.path)}, params, body)`;
    return `  /** ${doc} */\n  async ${name}(params = {}, body) { return ${call}; }`;
  });
  const request = `  async request(method, path, params = {}, body) {\n    const resolved = path.replace(/\\{([^}]+)\\}/g, (_match, key) => encodeURIComponent(params[key] ?? ''));\n    const url = new URL(resolved, this.baseUrl);\n    for (const [key, value] of Object.entries(params)) if (!path.includes(\`{${'${key}'} }\`.replace(' }', '}'))) url.searchParams.set(key, String(value));\n    const response = await fetch(url, { method, headers: { ...(this.token ? { Authorization: \`Bearer ${'${this.token}'}\` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });\n    if (!response.ok) throw new Error(\`ProxyPay API error: ${'${response.status}'} ${'${response.statusText}'}\`);\n    return response.status === 204 ? null : response.json();\n  }`;
  if (style === 'oop') return `export class ProxyPayClient {\n  constructor(baseUrl, token) { this.baseUrl = baseUrl.replace(/\\/$/, ''); this.token = token; }\n${request}\n${methods.join('\n\n')}\n}`;
  const functionalMethods = methods.map((method) => method.replace(/this\.request/g, 'request').replace(/^  /gm, '  '));
  return `export function createProxyPayClient(baseUrl, token) {\n  const client = new ProxyPayClient(baseUrl, token);\n  const request = client.request.bind(client);\n  return {\n${functionalMethods.map((method) => method.trim().replace(/^async /, 'async ')).join(',\n')}\n  };\n}\n\nclass ProxyPayClient {\n  constructor(baseUrl, token) { this.baseUrl = baseUrl.replace(/\\/$/, ''); this.token = token; }\n${request}\n}`;
}

function generatePython(endpoints: ParsedEndpoint[], style: Style): string {
  const methods = endpoints.map((endpoint) => {
    const name = operationName(endpoint, 'python');
    const doc = (endpoint.summary || `${endpoint.method.toUpperCase()} ${endpoint.path}`).replace(/\"\"\"/g, "'''");
    if (style === 'oop') {
      return `    def ${name}(self, params=None, body=None):\n        \"\"\"${doc}\"\"\"\n        return _request(self.base_url, self.token, ${JSON.stringify(endpoint.method.toUpperCase())}, ${JSON.stringify(endpoint.path)}, params, body)`;
    }
    return `        # ${doc.replace(/\n/g, ' ')}\n        ${JSON.stringify(name)}: make_call(${JSON.stringify(endpoint.method.toUpperCase())}, ${JSON.stringify(endpoint.path)}),`;
  });
  const helper = `def _request(base_url, token, method, template, params=None, body=None):\n    from urllib.parse import quote, urlencode\n    params = params or {}\n    path = template\n    for key, value in params.items(): path = path.replace('{' + key + '}', quote(str(value), safe=''))\n    query = {key: value for key, value in params.items() if '{' + key + '}' not in template}\n    url = base_url.rstrip('/') + path + (('?' + urlencode(query)) if query else '')\n    headers = {'Accept': 'application/json'}\n    if token: headers['Authorization'] = 'Bearer ' + token\n    data = json.dumps(body).encode() if body is not None else None\n    if data is not None: headers['Content-Type'] = 'application/json'\n    request = urllib.request.Request(url, data=data, headers=headers, method=method)\n    with urllib.request.urlopen(request) as response:\n        return json.loads(response.read()) if response.status != 204 else None`;
  if (style === 'oop') return `import json\nimport urllib.request\n\n${helper}\n\nclass ProxyPayClient:\n    def __init__(self, base_url, token=None):\n        self.base_url = base_url.rstrip('/')\n        self.token = token\n\n${methods.join('\n\n')}\n`;
  return `import json\nimport urllib.request\n\n${helper}\n\ndef create_client(base_url, token=None):\n    def make_call(method, path):\n        def call(params=None, body=None):\n            return _request(base_url, token, method, path, params, body)\n        return call\n    return {\n${methods.join('\n')}\n    }\n`;
}

function generateJava(endpoints: ParsedEndpoint[], style: Style, models: string): string {
  const request = `  private String request(String method, String template, Map<String, String> params, String body) throws Exception {\n    String path = template;\n    for (var entry : params.entrySet()) {\n      String value = java.net.URLEncoder.encode(entry.getValue(), java.nio.charset.StandardCharsets.UTF_8);\n      path = path.replace("{" + entry.getKey() + "}", value);\n    }\n    var query = new StringBuilder();\n    for (var entry : params.entrySet()) if (!template.contains("{" + entry.getKey() + "}")) query.append(query.length() == 0 ? "?" : "&").append(java.net.URLEncoder.encode(entry.getKey(), java.nio.charset.StandardCharsets.UTF_8)).append("=").append(java.net.URLEncoder.encode(entry.getValue(), java.nio.charset.StandardCharsets.UTF_8));\n    var builder = HttpRequest.newBuilder(URI.create(baseUrl + path + query)).header("Accept", "application/json");\n    if (token != null && !token.isBlank()) builder.header("Authorization", "Bearer " + token);\n    if (body == null) builder.method(method, HttpRequest.BodyPublishers.noBody());\n    else builder.header("Content-Type", "application/json").method(method, HttpRequest.BodyPublishers.ofString(body));\n    var response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());\n    if (response.statusCode() >= 400) throw new IllegalStateException("ProxyPay API error: " + response.statusCode());\n    return response.body();\n  }`;
  const methods = endpoints.map((endpoint) => {
    const name = operationName(endpoint, 'java');
    const doc = (endpoint.summary || `${endpoint.method.toUpperCase()} ${endpoint.path}`).replace(/\*\//g, '* /');
    const prefix = style === 'oop' ? '' : 'static ';
    const client = style === 'oop' ? '' : 'ProxyPayClient client, ';
    return `  /** ${doc} */\n  public ${prefix}String ${name}(${client}Map<String, String> params, String body) throws Exception { return ${style === 'oop' ? '' : 'client.'}request(${JSON.stringify(endpoint.method.toUpperCase())}, ${JSON.stringify(endpoint.path)}, params, body); }`;
  });
  return `import java.net.URI;\nimport java.net.http.*;\nimport java.util.*;\n\npublic class ProxyPayClient {\n  private final HttpClient http = HttpClient.newHttpClient();\n  private final String baseUrl;\n  private final String token;\n  public ProxyPayClient(String baseUrl, String token) { this.baseUrl = baseUrl.replaceAll("/$", ""); this.token = token; }\n${request}\n${methods.join('\n\n')}\n\n${models}\n}`;
}

function generateGo(endpoints: ParsedEndpoint[], style: Style, models: string): string {
  const methods = endpoints.map((endpoint) => {
    const name = operationName(endpoint, 'go').replace(/^./, (first) => first.toUpperCase());
    const doc = (endpoint.summary || `${endpoint.method.toUpperCase()} ${endpoint.path}`).replace(/\n/g, ' ');
    const declaration = style === 'oop' ? `func (c *Client) ${name}` : `func ${name}`;
    const clientArgument = style === 'oop' ? '' : 'c *Client, ';
    return `// ${name} ${doc}.\n${declaration}(${clientArgument}params map[string]string, body any) (any, error) {\n  return c.request(${JSON.stringify(endpoint.method.toUpperCase())}, ${JSON.stringify(endpoint.path)}, params, body)\n}`;
  });
  return [
    'package proxypay',
    '',
    'import (',
    '  "bytes"',
    '  "encoding/json"',
    '  "fmt"',
    '  "net/http"',
    '  "net/url"',
    '  "strings"',
    ')',
    '',
    'type Client struct { BaseURL string; Token string; HTTPClient *http.Client }',
    'func NewClient(baseURL, token string) *Client { return &Client{BaseURL: strings.TrimRight(baseURL, "/"), Token: token, HTTPClient: http.DefaultClient} }',
    'func (c *Client) request(method, template string, params map[string]string, body any) (any, error) {',
    '  path := template',
    '  for key, value := range params { path = strings.ReplaceAll(path, "{"+key+"}", url.PathEscape(value)) }',
    '  target, err := url.Parse(c.BaseURL + path); if err != nil { return nil, err }',
    '  query := target.Query(); for key, value := range params { if !strings.Contains(template, "{"+key+"}") { query.Set(key, value) } }; target.RawQuery = query.Encode()',
    '  var data []byte; if body != nil { data, err = json.Marshal(body); if err != nil { return nil, err } }',
    '  req, err := http.NewRequest(method, target.String(), bytes.NewReader(data)); if err != nil { return nil, err }',
    '  req.Header.Set("Accept", "application/json"); if c.Token != "" { req.Header.Set("Authorization", "Bearer "+c.Token) }; if body != nil { req.Header.Set("Content-Type", "application/json") }',
    '  response, err := c.HTTPClient.Do(req); if err != nil { return nil, err }; defer response.Body.Close()',
    '  if response.StatusCode >= 400 { return nil, fmt.Errorf("ProxyPay API error: %s", response.Status) }; if response.StatusCode == http.StatusNoContent { return nil, nil }',
    '  var result any; if err := json.NewDecoder(response.Body).Decode(&result); err != nil { return nil, err }; return result, nil',
    '}',
    '',
    methods.join('\n\n'),
    '',
    models,
  ].join('\n');
}

function generateFiles(api: LoadedApi, language: Language, style: Style): Record<string, string> {
  const models = modelDefinitions(api.spec, language);
  if (language === 'javascript') {
    return {
      'client.js': generateJavaScript(api.endpoints, style),
      'types.d.ts': models || 'export type ApiModel = Record<string, unknown>;\n',
      'example.js': style === 'oop' ? `import { ProxyPayClient } from './client.js';\nconst client = new ProxyPayClient('https://api.example.com', process.env.PROXYPAY_TOKEN);\n${api.endpoints[0] ? `const result = await client.${operationName(api.endpoints[0], language)}({}, undefined);\nconsole.log(result);` : '// Add operations to the OpenAPI document to generate calls.'}\n` : `import { createProxyPayClient } from './client.js';\nconst api = createProxyPayClient('https://api.example.com', process.env.PROXYPAY_TOKEN);\n${api.endpoints[0] ? `const result = await api.${operationName(api.endpoints[0], language)}({}, undefined);\nconsole.log(result);` : '// Add operations to the OpenAPI document to generate calls.'}\n`,
    };
  }
  if (language === 'python') {
    const example = style === 'oop' ? `from client import ProxyPayClient\nclient = ProxyPayClient('https://api.example.com', token='YOUR_TOKEN')\n${api.endpoints[0] ? `print(client.${operationName(api.endpoints[0], language)}())` : 'print("Add operations to the OpenAPI document to generate calls.")'}\n` : `from client import create_client\napi = create_client('https://api.example.com', token='YOUR_TOKEN')\n${api.endpoints[0] ? `print(api['${operationName(api.endpoints[0], language)}']())` : 'print("Add operations to the OpenAPI document to generate calls.")'}\n`;
    return { 'client.py': generatePython(api.endpoints, style), 'models.py': models, 'example.py': example };
  }
  if (language === 'java') {
    return {
      'ProxyPayClient.java': generateJava(api.endpoints, style, models),
      'Example.java': `import java.util.Map;\nclass Example {\n  public static void main(String[] args) throws Exception {\n    var client = new ProxyPayClient("https://api.example.com", System.getenv("PROXYPAY_TOKEN"));\n${api.endpoints[0] ? `    System.out.println(${style === 'oop' ? `client.${operationName(api.endpoints[0], language)}` : `ProxyPayClient.${operationName(api.endpoints[0], language)}`}${style === 'oop' ? '(Map.of(), null)' : '(client, Map.of(), null)'});` : '    System.out.println("Add operations to the OpenAPI document to generate calls.");'}\n  }\n}\n`,
    };
  }
  const firstEndpoint = api.endpoints[0];
  const firstGoMethod = firstEndpoint ? operationName(firstEndpoint, 'go').replace(/^./, (first) => first.toUpperCase()) : '';
  const goCall = !firstEndpoint
    ? '  fmt.Println("Add operations to the OpenAPI document to generate calls.")'
    : style === 'oop'
      ? `  result, err := client.${firstGoMethod}(map[string]string{}, nil)`
      : `  result, err := proxypay.${firstGoMethod}(client, map[string]string{}, nil)`;
  return {
    'client.go': generateGo(api.endpoints, style, models),
    'go.mod': 'module github.com/your-org/proxypay-sdk\n\ngo 1.18\n',
    'example/main.go': `package main\n\nimport (\n  "fmt"\n  "os"\n  proxypay "github.com/your-org/proxypay-sdk"\n)\n\nfunc main() {\n  client := proxypay.NewClient("https://api.example.com", os.Getenv("PROXYPAY_TOKEN"))\n${goCall}\n${firstEndpoint ? '  if err != nil { panic(err) }; fmt.Println(result)' : ''}\n}\n`,
  };
}

export default function SdkGenerator(): React.JSX.Element {
  const [api, setApi] = useState<LoadedApi | null>(null);
  const [language, setLanguage] = useState<Language>('javascript');
  const [style, setStyle] = useState<Style>('oop');
  const [error, setError] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const files = useMemo(() => api ? generateFiles(api, language, style) : {}, [api, language, style]);
  const preview = Object.values(files)[0] ?? '';

  const loadSpec = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setDownloaded(false);
    try {
      const spec = jsYaml.load(await file.text()) as OpenAPISpec | undefined;
      if (!spec || typeof spec !== 'object' || !spec.info) throw new Error('This file is not a valid OpenAPI document.');
      setApi({ name: file.name, spec, endpoints: parseEndpoints(spec) });
    } catch (cause) {
      setApi(null);
      setError(cause instanceof Error ? cause.message : 'Unable to read this OpenAPI file.');
    }
    event.target.value = '';
  };

  const downloadSdk = async () => {
    if (!api) return;
    const zip = new JSZip();
    const folder = zip.folder(`proxypay-${language}-sdk`)!;
    Object.entries(files).forEach(([name, content]) => folder.file(name, content));
    folder.file('README.md', `# ProxyPay ${languageLabels[language]} SDK\n\nGenerated from ${api.name} using ${style} style.\n\n${api.endpoints.length} operations included.\n\n## Example\n\nSee the included example file. Set a valid API base URL and bearer token before making requests.\n`);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `proxypay-${language}-sdk.zip`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>CLIENT SDK BUILDER</p>
        <h1>Generate an SDK</h1>
        <p>Build a starter client from an OpenAPI definition, including operation methods, models, and a runnable example.</p>
      </header>
      <section className={styles.source}>
        <label htmlFor="sdk-spec">OpenAPI definition</label>
        <input id="sdk-spec" type="file" accept=".yaml,.yml,.json,application/json,text/yaml" onChange={loadSpec} />
        {api && <span>{api.name} · {api.endpoints.length} operations</span>}
      </section>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <section className={styles.controls} aria-label="SDK options">
        <fieldset>
          <legend>Language</legend>
          <div className={styles.segmented}>{(Object.keys(languageLabels) as Language[]).map((value) => <button type="button" key={value} aria-pressed={language === value} className={language === value ? styles.selected : ''} onClick={() => setLanguage(value)}>{languageLabels[value]}</button>)}</div>
        </fieldset>
        <fieldset>
          <legend>Style</legend>
          <div className={styles.segmented}>{(['oop', 'functional'] as const).map((value) => <button type="button" key={value} aria-pressed={style === value} className={style === value ? styles.selected : ''} onClick={() => setStyle(value)}>{value === 'oop' ? 'Object-oriented' : 'Functional'}</button>)}</div>
        </fieldset>
        <button type="button" className={styles.download} disabled={!api} onClick={downloadSdk}>{downloaded ? 'Download again' : 'Download SDK package'}</button>
      </section>
      <section className={styles.preview}>
        <div className={styles.previewHeader}><h2>Client preview</h2><span>{api ? `${languageLabels[language]} · ${style}` : 'Load an OpenAPI file to preview'}</span></div>
        <pre><code>{preview || 'Generated client source will appear here.'}</code></pre>
        {api && Object.keys(files).length > 1 && <p>Package includes {Object.keys(files).join(', ')}.</p>}
      </section>
    </main>
  );
}
