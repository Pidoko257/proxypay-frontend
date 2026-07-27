import React, { useEffect, useState } from 'react';
import { RedocStandalone } from 'redoc';
import BrowserOnly from '@docusaurus/BrowserOnly';
import CardView from './CardView';
import { fetchOpenAPISpec, extractEndpoints } from '../utils/openapi';
import { useViewPreference } from '../hooks/useViewPreference';
import type { Endpoint } from '../utils/openapi';
import styles from './ApiReference.module.css';

export default function ApiReference(): React.JSX.Element {
  const [viewMode, setViewMode] = useViewPreference('detailed');
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load and parse OpenAPI spec
  useEffect(() => {
    async function loadSpec() {
      try {
        setLoading(true);
        const spec = await fetchOpenAPISpec('/openapi.yaml');
        const extractedEndpoints = extractEndpoints(spec);
        setEndpoints(extractedEndpoints);
        setError(null);
      } catch (err) {
        console.error('Failed to load OpenAPI spec:', err);
        setError('Failed to load API specification');
        setEndpoints([]);
      } finally {
        setLoading(false);
      }
    }

    loadSpec();
  }, []);

  const handleCardClick = (endpoint: Endpoint) => {
    // Switch to detailed view and scroll to the endpoint
    setViewMode('detailed');
    
    // Use hash navigation to jump to the endpoint in Redoc
    // Redoc generates IDs based on operationId or path. We use a combination approach:
    // Format: "operation/{method}/{path}" or just the path as fallback
    const pathSegments = endpoint.path.split('/').filter(Boolean);
    const redocAnchor = endpoint.id.toLowerCase().replace(/\s+/g, '-');
    
    // Navigate to the detailed view with the hash
    setTimeout(() => {
      window.location.hash = `operation/${endpoint.method}/${endpoint.path}`;
      // Fallback: try scrolling to element if it exists
      const element = document.querySelector(`[data-operation-id="${redocAnchor}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading API reference...</p>}>
      {() => (
        <div className={styles.container}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'detailed' ? styles.active : ''}`}
              onClick={() => setViewMode('detailed')}
              title="Show detailed API reference"
            >
              📖 Detailed View
            </button>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'card' ? styles.active : ''}`}
              onClick={() => setViewMode('card')}
              title="Show card view with filtering and search"
              disabled={loading || error !== null}
            >
              🎴 Card View
            </button>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <strong>Error:</strong> {error}
              <p>Ensure <code>static/openapi.yaml</code> is properly configured.</p>
            </div>
          )}

          {viewMode === 'detailed' ? (
            <RedocStandalone
              specUrl="/openapi.yaml"
              options={{
                hideHostname: false,
                disableSearch: false,
                expandResponses: '200,201',
                requiredPropsFirst: true,
                sortPropsAlphabetically: true,
              }}
            />
          ) : (
            <>
              {loading ? (
                <div className={styles.loadingMessage}>
                  <p>Loading endpoints...</p>
                </div>
              ) : (
                <CardView endpoints={endpoints} onCardClick={handleCardClick} />
              )}
            </>
          )}
        </div>
      )}
    </BrowserOnly>
  );
}
