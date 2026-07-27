import React, { useEffect, useState, useRef } from 'react';
import { RedocStandalone } from 'redoc';

interface ApiReferenceState {
  loading: boolean;
  error: string | null;
  specExists: boolean;
}

export default function ApiReference(): React.JSX.Element {
  const [state, setState] = useState<ApiReferenceState>({
    loading: true,
    error: null,
    specExists: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Check if openapi.yaml exists by fetching it
    const checkSpecFile = async () => {
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch('/openapi.yaml', {
          method: 'HEAD',
          signal: abortControllerRef.current.signal,
        });
        if (response.ok) {
          setState({ loading: false, error: null, specExists: true });
        } else {
          setState({
            loading: false,
            error: 'OpenAPI specification file not found. Please ensure openapi.yaml is present in the static folder.',
            specExists: false,
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Component unmounted, ignore
        }
        setState({
          loading: false,
          error: 'Unable to load OpenAPI specification. Please check that openapi.yaml is available.',
          specExists: false,
        });
      }
    };

    checkSpecFile();

    // Cleanup function to abort requests and prevent memory leaks
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Clean up Redoc DOM and event listeners on unmount
  useEffect(() => {
    return () => {
      // Force cleanup of Redoc listeners and DOM nodes
      if (containerRef.current) {
        // Remove all event listeners from the container
        const clone = containerRef.current.cloneNode(true);
        if (containerRef.current.parentNode) {
          containerRef.current.parentNode.replaceChild(clone, containerRef.current);
        }
      }
    };
  }, []);

  if (state.loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading API reference...</p>
      </div>
    );
  }

  if (state.error || !state.specExists) {
    return (
      <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
        <div
          style={{
            padding: '1.5rem',
            borderLeft: '4px solid #d32f2f',
            backgroundColor: '#ffebee',
            borderRadius: '4px',
          }}
        >
          <h2 style={{ color: '#d32f2f', marginTop: 0 }}>Unable to Load API Reference</h2>
          <p style={{ marginBottom: 0, color: '#555' }}>
            {state.error || 'The OpenAPI specification file could not be found.'}
          </p>
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #ffcccc' }}>
            <h3 style={{ fontSize: '1rem', color: '#555' }}>Setup Instructions:</h3>
            <p style={{ fontSize: '0.95rem', color: '#555' }}>
              To populate the spec, use one of these options:
            </p>
            <ol style={{ fontSize: '0.95rem', color: '#555', paddingLeft: '1.5rem' }}>
              <li>
                <strong>Option A (Manual):</strong> Copy your OpenAPI spec:
                <pre
                  style={{
                    backgroundColor: '#fff',
                    padding: '0.5rem',
                    borderRadius: '3px',
                    overflow: 'auto',
                    marginTop: '0.5rem',
                  }}
                >
                  <code>cp ../proxypay/openapi.yaml ./static/openapi.yaml</code>
                </pre>
              </li>
              <li>
                <strong>Option B (From Backend):</strong> Fetch from your running backend:
                <pre
                  style={{
                    backgroundColor: '#fff',
                    padding: '0.5rem',
                    borderRadius: '3px',
                    overflow: 'auto',
                    marginTop: '0.5rem',
                  }}
                >
                  <code>curl http://localhost:3000/docs/openapi.json -o static/openapi.yaml</code>
                </pre>
              </li>
            </ol>
            <p style={{ fontSize: '0.95rem', color: '#555', marginTop: '1rem' }}>
              After adding the spec, rebuild and refresh the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <RedocStandalone
        specUrl="/openapi.yaml"
        options={{
          hideHostname: false,
          disableSearch: false,
          expandResponses: '200,201',
          requiredPropsFirst: true,
          sortPropsAlphabetically: true,
          // Memory leak fixes
          onlyRequiredInSamples: true,
          scrollYOffset: 0,
        }}
      />
    </div>
  );
}
