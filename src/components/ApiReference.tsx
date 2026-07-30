import React, { useState, useCallback } from 'react';
import { RedocStandalone } from 'redoc';
import { useOpenApiSpec } from '../hooks/useOpenApiSpec';
import type { EndpointInfo } from '../hooks/useOpenApiSpec';
import EndpointBadges from './EndpointBadges';
import ParameterValidator from './ParameterValidator';
import DebugConsole from './DebugConsole';

export default function ApiReference(): React.JSX.Element {
  const { endpoints, loading } = useOpenApiSpec();
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointInfo | null>(null);
  const [showBadges, setShowBadges] = useState(false);
  const [showValidator, setShowValidator] = useState(false);

  const handleEndpointClick = useCallback((endpoint: EndpointInfo) => {
    setSelectedEndpoint(endpoint);
    setShowValidator(true);

    // Scroll Redoc to the endpoint
    const encodedPath = endpoint.path.replace(/\//g, '~1');
    const method = endpoint.method.toLowerCase();
    const targetId = `operation/${encodedPath}-${method}`;
    // Try scrolling Redoc's internal scroll container
    const redocWrap = document.querySelector('.redoc-wrap');
    if (redocWrap) {
      const target = document.querySelector(`[data-section-id="${targetId}"]`) || document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, []);

  return (
    <div className="api-reference-wrapper">
      {/* Sidebar toggle buttons */}
      <div className="api-toolbar">
        <button
          className={`api-toolbar-btn ${showBadges ? 'active' : ''}`}
          onClick={() => setShowBadges(!showBadges)}
          title="Endpoint Overview & Badges"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2 15.09 8.26 22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
          </svg>
          <span>Badges</span>
        </button>
        <button
          className={`api-toolbar-btn ${showValidator ? 'active' : ''}`}
          onClick={() => setShowValidator(!showValidator)}
          disabled={!selectedEndpoint}
          title="Parameter Validator"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11 12 14l7-7" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <span>Validate</span>
        </button>
      </div>

      {/* Main content area */}
      <div className="api-content">
        {/* Redoc: main API reference */}
        <div className={`api-redoc-area ${showBadges || showValidator ? 'with-panel' : ''}`}>
          {loading ? (
            <div className="api-loading">
              <div className="api-spinner" />
              <p>Loading API reference...</p>
            </div>
          ) : (
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
          )}
        </div>

        {/* Side panels */}
        {(showBadges || showValidator) && (
          <div className="api-panels">
            {showBadges && (
              <div className="api-panel">
                <div className="api-panel-header">
                  <h3>Endpoint Overview</h3>
                  <button
                    className="api-panel-close"
                    onClick={() => setShowBadges(false)}
                    aria-label="Close badges panel"
                  >
                    ✕
                  </button>
                </div>
                <EndpointBadges
                  endpoints={endpoints}
                  onEndpointClick={handleEndpointClick}
                  selectedEndpoint={selectedEndpoint}
                />
              </div>
            )}

            {showValidator && (
              <div className="api-panel">
                <div className="api-panel-header">
                  <h3>Parameter Validation</h3>
                  <button
                    className="api-panel-close"
                    onClick={() => setShowValidator(false)}
                    aria-label="Close validator panel"
                  >
                    ✕
                  </button>
                </div>
                {selectedEndpoint ? (
                  <ParameterValidator endpoint={selectedEndpoint} />
                ) : (
                  <div className="api-panel-empty">
                    <p>Select an endpoint from the Badges panel to validate its parameters.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Debug Console (floating) */}
      <DebugConsole endpoints={endpoints} selectedEndpoint={selectedEndpoint} />
    </div>
  );
}
