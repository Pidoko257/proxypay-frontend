/**
 * Integrated API Reference Page with Redoc and Sidebar
 * Combines Redoc viewer with sidebar navigation for enhanced UX
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import jsYaml from 'js-yaml';
import RedocViewer from './RedocViewer';
import APISidebarNav from './APISidebarNav';
import { parseEndpoints, groupByTag, type OpenAPISpec, type ParsedEndpoint, type TagGroup } from '../utils/apiSpecParser';
import { parseDeepLink, toEndpointLink } from '../utils/redocDeepLink';
import styles from './ApiReference.module.css';

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
  const [loadedSpec, setLoadedSpec] = useState<OpenAPISpec | null>(spec || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | undefined>();
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    // Collapse the sidebar by default on mobile; always show it on desktop.
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }
    return !window.matchMedia('(max-width: 1024px)').matches;
  });

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
   * Handle spec loaded
   */
  const handleSpecLoaded = useCallback(
    (loadedSpec: OpenAPISpec) => {
      setLoadedSpec(loadedSpec);
      if (onSpecLoaded) {
        onSpecLoaded(loadedSpec);
      }

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
   * Keep the sidebar state in sync with the viewport: collapse it when
   * crossing onto a small screen, expand it when returning to desktop.
   */
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mql = window.matchMedia('(max-width: 1024px)');
    const syncWithViewport = () => {
      setSidebarOpen(!mql.matches);
    };

    syncWithViewport();
    mql.addEventListener('change', syncWithViewport);
    return () => mql.removeEventListener('change', syncWithViewport);
  }, []);

  return (
    <div className={styles.container}>
      {/* Search bar */}
      <div className={styles.searchBar}>
        {showSidebar && (
          <button
            type="button"
            className={styles.toggleButton}
            onClick={() => setSidebarOpen((open) => !open)}
            aria-expanded={sidebarOpen}
            aria-controls="api-sidebar"
          >
            {sidebarOpen ? 'Hide endpoints' : 'Show endpoints'}
          </button>
        )}
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search endpoints by path, method, or tag..."
          aria-label="Search API endpoints"
          className={styles.searchInput}
        />
        <span className={styles.searchCount}>
          {filteredEndpoints.length} / {endpoints.length} endpoints
        </span>
      </div>

      <div className={styles.layout}>
        {/* Sidebar */}
        {showSidebar && (
          <aside
            id="api-sidebar"
            className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}
          >
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
            spec={loadedSpec ?? undefined}
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
