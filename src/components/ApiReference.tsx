import React, { useState, useCallback } from 'react';
import { RedocStandalone } from 'redoc';

// ---------------------------------------------------------------------------
// CORS / network error helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when an error looks like a CORS block or a network failure
 * caused by the browser refusing to connect to a cross-origin host.
 *
 * A CORS rejection in the browser appears as a TypeError with no useful body
 * (the browser swallows the details for security reasons). We detect it by
 * checking the error type and whether the spec URL targets a different origin
 * than the current page.
 */
function isCorsLikeError(err: unknown, specUrl: string): boolean {
  if (!(err instanceof TypeError)) return false;
  // In Firefox/Chrome a blocked CORS fetch produces: "Failed to fetch" / "NetworkError"
  const msg = (err as TypeError).message.toLowerCase();
  const corsKeywords = ['failed to fetch', 'networkerror', 'network request failed', 'cors'];
  const looksLikeCors = corsKeywords.some((kw) => msg.includes(kw));

  // Only treat it as a CORS error when the URL is cross-origin
  try {
    const url = new URL(specUrl, window.location.href);
    const isCrossOrigin = url.origin !== window.location.origin;
    return looksLikeCors && isCrossOrigin;
  } catch {
    return looksLikeCors;
  }
}

// ---------------------------------------------------------------------------
// Error-state UI
// ---------------------------------------------------------------------------

interface CorsErrorBannerProps {
  specUrl: string;
  onRetry: () => void;
}

function CorsErrorBanner({ specUrl, onRetry }: CorsErrorBannerProps): React.JSX.Element {
  const proxyUrl = `${window.location.protocol}//${window.location.host}/api-proxy`;
  const isLocalhost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  return (
    <div
      role="alert"
      style={{
        margin: '2rem auto',
        maxWidth: 820,
        border: '1px solid #f5a623',
        borderRadius: 8,
        backgroundColor: '#fffbf2',
        padding: '1.5rem 2rem',
        fontFamily: 'sans-serif',
        lineHeight: 1.6,
        color: '#333',
      }}
    >
      <h2 style={{ color: '#c0392b', marginTop: 0 }}>⚠️ CORS Error — Cannot Load API Spec</h2>

      <p>
        The browser blocked the request to <code>{specUrl}</code> because of a{' '}
        <strong>Cross-Origin Resource Sharing (CORS)</strong> restriction. This happens when the
        documentation site and the backend run on different ports (or domains) and the backend has
        not been configured to allow the request.
      </p>

      <h3 style={{ marginBottom: '0.4rem' }}>Why does this happen?</h3>
      <p>
        Browsers enforce the same-origin policy: a page on{' '}
        <code>http://localhost:3001</code> cannot directly fetch resources from{' '}
        <code>http://localhost:3000</code> unless the server explicitly permits it via{' '}
        <code>Access-Control-Allow-Origin</code> headers.
      </p>

      <h3 style={{ marginBottom: '0.4rem' }}>Recommended workarounds</h3>
      <ol style={{ paddingLeft: '1.25rem' }}>
        <li style={{ marginBottom: '0.75rem' }}>
          <strong>Use the built-in dev-server proxy (easiest)</strong>
          <br />
          {isLocalhost ? (
            <>
              The dev server is already running. Point Redoc at the proxy instead of the backend
              directly:
              <br />
              <code style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem', backgroundColor: '#f4f4f4', borderRadius: 4 }}>
                http://localhost:3001/api-proxy/docs/openapi.json
              </code>
              Or set the <code>SPEC_URL</code> env variable and restart:
              <br />
              <code style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem', backgroundColor: '#f4f4f4', borderRadius: 4 }}>
                SPEC_URL=/api-proxy/docs/openapi.json npm start
              </code>
            </>
          ) : (
            <>
              Start the dev server locally and use the bundled proxy at{' '}
              <code>{proxyUrl}</code>.
            </>
          )}
        </li>
        <li style={{ marginBottom: '0.75rem' }}>
          <strong>Copy the spec file locally</strong>
          <br />
          <code style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem', backgroundColor: '#f4f4f4', borderRadius: 4 }}>
            cp ../proxypay/openapi.yaml ./static/openapi.yaml
          </code>
          Then the reference page reads <code>/openapi.yaml</code> directly — no cross-origin
          request at all.
        </li>
        <li style={{ marginBottom: '0.75rem' }}>
          <strong>Fetch and save the spec from the running backend</strong>
          <br />
          <code style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem', backgroundColor: '#f4f4f4', borderRadius: 4 }}>
            curl http://localhost:3000/docs/openapi.json -o static/openapi.yaml
          </code>
        </li>
        <li>
          <strong>Enable CORS on the backend (development only)</strong>
          <br />
          Add <code>Access-Control-Allow-Origin: *</code> to the backend's response headers, or
          configure the NestJS / Express CORS middleware for <code>http://localhost:3001</code>.
          Do <em>not</em> use <code>*</code> in production.
        </li>
      </ol>

      <p style={{ marginTop: '1.25rem' }}>
        <button
          onClick={onRetry}
          style={{
            cursor: 'pointer',
            padding: '0.5rem 1.25rem',
            backgroundColor: '#2e86de',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: '0.95rem',
          }}
        >
          Retry
        </button>
        &nbsp;&nbsp;
        <a
          href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#2e86de' }}
        >
          Learn more about CORS →
        </a>
      </p>
    </div>
  );
}

interface GenericErrorBannerProps {
  message: string;
  onRetry: () => void;
}

function GenericErrorBanner({ message, onRetry }: GenericErrorBannerProps): React.JSX.Element {
  return (
    <div
      role="alert"
      style={{
        margin: '2rem auto',
        maxWidth: 820,
        border: '1px solid #e74c3c',
        borderRadius: 8,
        backgroundColor: '#fff5f5',
        padding: '1.5rem 2rem',
        fontFamily: 'sans-serif',
        lineHeight: 1.6,
        color: '#333',
      }}
    >
      <h2 style={{ color: '#c0392b', marginTop: 0 }}>❌ Failed to Load API Reference</h2>
      <p>
        The OpenAPI spec could not be fetched. Details: <code>{message}</code>
      </p>
      <p>
        If you are trying to load a spec from a running local backend, see the{' '}
        <strong>CORS &amp; local backend</strong> section in the{' '}
        <a href="https://github.com/sublime247/proxypay" target="_blank" rel="noopener noreferrer">
          README
        </a>{' '}
        for setup instructions.
      </p>
      <button
        onClick={onRetry}
        style={{
          cursor: 'pointer',
          padding: '0.5rem 1.25rem',
          backgroundColor: '#2e86de',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          fontSize: '0.95rem',
        }}
      >
        Retry
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

// Allow the spec URL to be overridden via the SPEC_URL environment variable
// (injected at build time by Webpack DefinePlugin / Docusaurus customFields).
const DEFAULT_SPEC_URL = '/openapi.yaml';

type ErrorKind = 'cors' | 'generic' | null;

interface ErrorState {
  kind: ErrorKind;
  message: string;
  specUrl: string;
}

export default function ApiReference(): React.JSX.Element {
  const [specKey, setSpecKey] = useState(0); // bump to remount Redoc (retry)
  const [error, setError] = useState<ErrorState | null>(null);

  // Resolve spec URL — support runtime override via hash param ?spec=<url>
  const specUrl = (() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const override = params.get('spec');
      if (override) return override;
    }
    return DEFAULT_SPEC_URL;
  })();

  const handleLoadError = useCallback(
    (err: Error) => {
      const isCors = isCorsLikeError(err, specUrl);
      setError({
        kind: isCors ? 'cors' : 'generic',
        message: err.message,
        specUrl,
      });
      // Log to console with actionable guidance
      if (isCors) {
        console.error(
          '[ProxyPay docs] CORS error loading OpenAPI spec from',
          specUrl,
          '\n\nWorkaround: use the dev-server proxy by starting with:\n' +
            '  SPEC_URL=/api-proxy/docs/openapi.json npm start\n\n' +
            'Or copy the spec locally:\n' +
            '  cp ../proxypay/openapi.yaml ./static/openapi.yaml',
        );
      } else {
        console.error('[ProxyPay docs] Failed to load OpenAPI spec from', specUrl, err);
      }
    },
    [specUrl],
  );

  const handleRetry = useCallback(() => {
    setError(null);
    setSpecKey((k) => k + 1);
  }, []);

  if (error?.kind === 'cors') {
    return <CorsErrorBanner specUrl={error.specUrl} onRetry={handleRetry} />;
  }

  if (error?.kind === 'generic') {
    return <GenericErrorBanner message={error.message} onRetry={handleRetry} />;
  }

  return (
    <RedocStandalone
      key={specKey}
      specUrl={specUrl}
      options={{
        hideHostname: false,
        disableSearch: false,
        expandResponses: '200,201',
        requiredPropsFirst: true,
        sortPropsAlphabetically: true,
      }}
      onLoaded={(err) => {
        if (err) handleLoadError(err as unknown as Error);
      }}
    />
  );
}
