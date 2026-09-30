import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import * as yaml from 'js-yaml';
import type { OpenAPISpec } from '../utils/apiSpecParser';
import {
  countOpenApiOperations,
  generateOpenApiTestManifest,
  generateOpenApiTestSuite,
  type TestFramework,
  type TestOutputFormat,
} from '../utils/openApiTestGenerator';
import styles from './test-generator.module.css';

function parseSpec(text: string): OpenAPISpec {
  const parsed = yaml.load(text) as OpenAPISpec | undefined;
  if (!parsed || typeof parsed !== 'object' || !parsed.paths || typeof parsed.paths !== 'object') {
    throw new Error('The file is not a valid OpenAPI document with a paths object.');
  }
  return parsed;
}

function downloadFile(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function TestGeneratorPage(): React.JSX.Element {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [framework, setFramework] = useState<TestFramework>('jest');
  const [format, setFormat] = useState<TestOutputFormat>('ts');
  const [error, setError] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState('static/openapi.yaml');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/openapi.yaml')
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load OpenAPI spec (${response.status}).`);
        return response.text();
      })
      .then((text) => setSpec(parseSpec(text)))
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'Could not load OpenAPI spec.');
      })
      .finally(() => setLoading(false));
  }, []);

  const operationCount = spec ? countOpenApiOperations(spec) : 0;
  const generatedSuite = spec ? generateOpenApiTestSuite(spec, framework, format) : '';

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setSpec(parseSpec(await file.text()));
      setSourceName(file.name);
      setError(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not parse the selected spec.');
    }
    event.target.value = '';
  };

  return (
    <Layout title="OpenAPI Test Generator" description="Generate mocked API test suites from OpenAPI specifications">
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>API TOOLING</p>
            <h1>OpenAPI Test Generator</h1>
            <p>Generate a mock-based test suite and case manifest from an OpenAPI document.</p>
          </div>
          <a href="/api">API reference</a>
        </header>

        <section className={styles.toolbar} aria-label="Generator settings">
          <div className={styles.source}>
            <label htmlFor="openapi-upload">OpenAPI file</label>
            <input id="openapi-upload" type="file" accept=".yaml,.yml,.json,application/json" onChange={handleUpload} />
            <span>{sourceName}</span>
          </div>
          <label>
            Framework
            <select value={framework} onChange={(event) => setFramework(event.target.value as TestFramework)}>
              <option value="jest">Jest</option>
              <option value="vitest">Vitest</option>
            </select>
          </label>
          <label>
            Source format
            <select value={format} onChange={(event) => setFormat(event.target.value as TestOutputFormat)}>
              <option value="ts">TypeScript</option>
              <option value="js">JavaScript</option>
            </select>
          </label>
          <div className={styles.actions}>
            <button type="button" disabled={!generatedSuite} onClick={() => downloadFile(`openapi.generated.test.${format}`, generatedSuite, 'text/plain')}>
              Download suite
            </button>
            <button type="button" className={styles.secondaryAction} disabled={!spec || operationCount === 0} onClick={() => downloadFile('openapi.test-cases.json', generateOpenApiTestManifest(spec!), 'application/json')}>
              Export JSON manifest
            </button>
          </div>
        </section>

        {error && <p className={styles.error} role="alert">{error}</p>}
        {loading ? <p className={styles.status}>Loading OpenAPI document…</p> : spec && operationCount === 0 && (
          <p className={styles.status}>This document has no API operations. Upload an OpenAPI spec with paths to generate cases.</p>
        )}

        {operationCount > 0 && (
          <section className={styles.output}>
            <div className={styles.outputHeading}>
              <h2>Generated suite</h2>
              <span>{operationCount} operations · {operationCount * 2} cases · {framework}</span>
            </div>
            <pre><code>{generatedSuite}</code></pre>
          </section>
        )}
      </main>
    </Layout>
  );
}