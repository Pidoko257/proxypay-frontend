import React, { useEffect, useState } from 'react';
import { RedocStandalone } from 'redoc';
import { handleCircularRefs } from '../utils/circularRefHandler';

const SPEC_URL = '/openapi.yaml';

async function fetchAndProcessSpec() {
  const response = await fetch(SPEC_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec: ${response.statusText}`);
  }
  const text = await response.text();

  let spec: any;
  if (text.trimStart().startsWith('{')) {
    spec = JSON.parse(text);
  } else {
    const yaml = await import('yaml');
    spec = yaml.parse(text);
  }

  return handleCircularRefs(spec, { maxDepth: 5 });
}

export default function ApiReference(): React.JSX.Element {
  const [spec, setSpec] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAndProcessSpec()
      .then((processed) => {
        if (!cancelled) setSpec(processed);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        const overlay = document.querySelector(
          '.redoc-wrap .menu-overlay, .redoc-wrap .dropdown-overlay',
        ) as HTMLElement | null;
        if (overlay) {
          overlay.click();
        }
      }
    }

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (
        target.classList.contains('menu-overlay') ||
        target.classList.contains('dropdown-overlay')
      ) {
        target.click();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, []);

  if (error) {
    return (
      <div style={{ padding: '2rem', color: '#d32f2f' }}>
        <p>Failed to load API reference: {error}</p>
        <p>
          Please check that <code>openapi.yaml</code> exists in the <code>static/</code> directory.
        </p>
      </div>
    );
  }

  if (!spec) {
    return <p style={{ padding: '2rem' }}>Loading API reference...</p>;
  }

  return (
    <RedocStandalone
      spec={spec}
      options={{
        hideHostname: false,
        disableSearch: false,
        expandResponses: '200,201',
        requiredPropsFirst: true,
        sortPropsAlphabetically: true,
        generatedSamplesMaxDepth: 3,
        jsonSampleExpandLevel: 2,
        schemaExpansionLevel: 1,
      }}
    />
  );
}
