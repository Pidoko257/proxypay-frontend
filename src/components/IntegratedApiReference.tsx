/**
 * Integrated API Reference Page with Redoc and Sidebar
 * Combines Redoc viewer with sidebar navigation, comparison view, and enhanced UX
 * Includes spec version detection and update notifications
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import jsYaml from 'js-yaml';
import RedocViewer from './RedocViewer';
import APISidebarNav from './APISidebarNav';
import EndpointComparison from './EndpointComparison';
import SpecUpdateNotifier from './SpecUpdateNotifier';
import { parseEndpoints, groupByTag, type OpenAPISpec, type ParsedEndpoint, type TagGroup } from '../utils/apiSpecParser';
import { parseDeepLink, toEndpointLink } from '../utils/redocDeepLink';
import {
  addSearchTerm,
  getSearchSuggestions,
  loadSearchHistory,
} from '../utils/searchHistory';
import styles from './ApiReference.module.css';

const SEARCH_HISTORY_DATALIST_ID = 'api-reference-search-history';

export interface IntegratedApiReferenceProps {
  specUrl?: string;
  spec?: OpenAPISpec;
  title?: string;
  showSidebar?: boolean;
  enableDeepLinking?: boolean;
  expandTagsByDefault?: boolean;
  onSpecLoaded?: (spec: OpenAPISpec) => void;
  onError?: (error: Error) => void;
}

/**
 * Search filter for endpoints
 */
function filterEndpointsBySearch(
  endpoints: ParsedEndpoint[],
  query: string,
): ParsedEndpoint[] {
  if (!query.trim()) return endpoints;

  const q = query.toLowerCase();
  return endpoints.filter((endpoint) => {
    return (
      endpoint.path.toLowerCase().includes(q) ||
      endpoint.method.toLowerCase().includes(q) ||
      endpoint.summary.toLowerCase().includes(q) ||
      (endpoint.description?.toLowerCase().includes(q) ?? false) ||
      (endpoint.tags?.some((tag) => tag.toLowerCase().includes(q)) ?? false) ||
      (endpoint.operationId?.toLowerCase().includes(q) ?? false)
    );
  });
}

/**
 * Integrated API Reference Component
 */
export default function IntegratedApiReference({
  specUrl = '/openapi.yaml',
  spec,
  title = 'API Reference',
  showSidebar = true,
  enableDeepLinking = true,
  expandTagsByDefault = true,
  onSpecLoaded,
  onError,
}: IntegratedApiReferenceProps): React.JSX.Element {
  const [loadedSpec, setLoadedSpec] = useState<OpenAPISpec | undefined>(spec);
  const [searchQuery, setSearchQuery] = useState('');
  // Fix #358: persisted recent searches, shown as autocomplete suggestions.
  const [searchHistory, setSearchHistory] = useState<string[]>(() =>
    loadSearchHistory(),
  );
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | undefined>();
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonEndpoint1, setComparisonEndpoint1] = useState<ParsedEndpoint | undefined>();
  const [comparisonEndpoint2, setComparisonEndpoint2] = useState<ParsedEndpoint | undefined>();

  /**
   * Parse endpoints from spec
   */
  const endpoints = useMemo(() => {
    if (!loadedSpec) return [];
    return parseEndpoints(loadedSpec);
  }, [loadedSpec]);

  /**
   * Group endpoints by tag
   */
  const tagGroups = useMemo(() => {
    if (!loadedSpec) return [];
    return groupByTag(endpoints);
  }, [endpoints, loadedSpec]);

  /**
   * Filter endpoints by search query
   */
  const filteredEndpoints = useMemo(() => {
    return filterEndpointsBySearch(endpoints, searchQuery);
  }, [endpoints, searchQuery]);

  /**
   * Autocomplete suggestions drawn from persisted search history.
   */
  const searchSuggestions = useMemo(
    () => getSearchSuggestions(searchQuery, searchHistory),
    [searchQuery, searchHistory],
  );

  /**
   * Commit the current query to history (on Enter or blur).
   */
  const commitSearchTerm = useCallback((term: string) => {
    if (!term.trim()) return;
    setSearchHistory(addSearchTerm(term));
  }, []);

  /**
   * Handle spec loaded
   */
  const handleSpecLoaded = useCallback(
    (loadedSpec: OpenAPISpec) => {
      setLoadedSpec(loadedSpec);
      onSpecLoaded?.(loadedSpec);

      // Initialize expanded tags from deep-link if present
      if (enableDeepLinking && window.location.hash) {
        const deepLink = parseDeepLink(window.location.hash);
        if (deepLink && deepLink.type === 'tag') {
          setExpandedTags(new Set([deepLink.target]));
        }
      }
    },
    [enableDeepLinking, onSpecLoaded],
  );

  /**
   * Handle endpoint click
   */
  const handleEndpointClick = useCallback(
    (endpoint: ParsedEndpoint) => {
      setSelectedEndpointId(endpoint.id);
      if (enableDeepLinking) {
        window.location.hash = toEndpointLink(endpoint.id);
      }
    },
    [enableDeepLinking],
  );

  /**
   * Handle tag click
   */
  const handleTagClick = useCallback((tagName: string) => {
    // Tag clicking is handled by sidebar, just update state
    // Deep linking is handled there
  }, []);

  /**
   * Handle tag toggle
   */
  const handleTagToggle = useCallback((tag: string) => {
    setExpandedTags((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  }, []);

  /**
   * Handle deep-link navigation
   */
  const handleDeepLinkNavigate = useCallback((elementId: string) => {
    setSelectedEndpointId(elementId);
  }, []);

  /**
   * Handle endpoint selection for comparison
   */
  const handleComparisonSelect = useCallback((endpoint: ParsedEndpoint) => {
    if (!comparisonMode) {
      setComparisonMode(true);
      setComparisonEndpoint1(endpoint);
      return;
    }

    if (!comparisonEndpoint1) {
      setComparisonEndpoint1(endpoint);
      return;
    }

    if (endpoint.id === comparisonEndpoint1.id) {
      return;
    }

    if (!comparisonEndpoint2) {
      setComparisonEndpoint2(endpoint);
    } else {
      // If both are selected, replace the second one
      setComparisonEndpoint2(endpoint);
    }
  }, [comparisonMode, comparisonEndpoint1]);

  /**
   * Close comparison view
   */
  const handleCloseComparison = useCallback(() => {
    setComparisonMode(false);
    setComparisonEndpoint1(undefined);
    setComparisonEndpoint2(undefined);
  }, []);

  /**
   * Start fresh comparison with selected endpoint
   */
  const handleComparisonEndpointSelect = useCallback((endpoint: ParsedEndpoint) => {
    if (endpoint.id === comparisonEndpoint1?.id) {
      setComparisonEndpoint2(endpoint);
    } else if (endpoint.id === comparisonEndpoint2?.id) {
      setComparisonEndpoint1(endpoint);
    } else {
      setComparisonEndpoint1(endpoint);
      setComparisonEndpoint2(undefined);
    }
  }, [comparisonEndpoint1, comparisonEndpoint2]);

  return (
    <div className={styles.container}>
      {/* Spec update notifier */}
      <SpecUpdateNotifier
        onUpdate={() => {
          // Reload the page to fetch the latest spec
          window.location.reload();
        }}
      />

      {/* Comparison Modal */}
      {comparisonMode && (
        <div className={styles.comparisonModal}>
          <EndpointComparison
            endpoint1={comparisonEndpoint1}
            endpoint2={comparisonEndpoint2}
            onClose={handleCloseComparison}
            onSelect={handleComparisonEndpointSelect}
          />
        </div>
      )}

      {/* Search bar */}
      <div className={styles.searchBar} role="search" aria-label="Search API endpoints">
        <label htmlFor="api-endpoint-search" className="visually-hidden">
          Search API endpoints
        </label>
        <input
          id="api-endpoint-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitSearchTerm(searchQuery);
          }}
          onBlur={() => commitSearchTerm(searchQuery)}
          list={SEARCH_HISTORY_DATALIST_ID}
          placeholder="Search endpoints by path, method, or tag..."
          aria-label="Search API endpoints"
          aria-describedby="api-search-count"
          className={styles.searchInput}
        />
        <datalist id={SEARCH_HISTORY_DATALIST_ID}>
          {searchSuggestions.map((term) => (
            <option key={term} value={term} />
          ))}
        </datalist>
        <span id="api-search-count" className={styles.searchCount} aria-live="polite" aria-atomic="true">
          {filteredEndpoints.length} / {endpoints.length} endpoints
        </span>
        <button
          type="button"
          className={`${styles.comparisonToggle} ${comparisonMode ? styles.active : ''}`}
          onClick={() => (comparisonMode ? handleCloseComparison() : setComparisonMode(true))}
          aria-label={comparisonMode ? 'Close endpoint comparison view' : 'Open endpoint comparison view'}
          aria-pressed={comparisonMode}
        >
          ⇄ Compare
        </button>
      </div>

      <div className={styles.layout}>
        {/* Sidebar */}
        {showSidebar && (
          <aside className={styles.sidebar}>
            <APISidebarNav
              endpoints={filteredEndpoints}
              tagGroups={tagGroups}
              onEndpointClick={handleEndpointClick}
              onTagClick={handleTagClick}
              selectedEndpointId={selectedEndpointId}
              expandedTags={Array.from(expandedTags)}
              onTagToggle={handleTagToggle}
              enableDeepLinking={enableDeepLinking}
            />
          </aside>
        )}

        {/* Main Redoc viewer */}
        <main className={styles.main}>
          <RedocViewer
            specUrl={specUrl}
            spec={loadedSpec}
            title={title}
            disableSidebar={!showSidebar}
            expandTagsByDefault={expandTagsByDefault}
            enableDeepLinking={enableDeepLinking}
            onSpecLoaded={handleSpecLoaded}
            onError={onError}
            onDeepLinkNavigate={handleDeepLinkNavigate}
          />
        </main>
      </div>
    </div>
  );
}
