/**
 * API Sidebar Navigation Component
 * Shows API tag structure and endpoints for navigation
 * Integrates with Redoc for synchronized navigation
 * Supports per-tag search and HTTP method filtering
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  toEndpointLink,
  toTagLink,
  parseDeepLink,
  onHashChange,
} from '../utils/redocDeepLink';
import type { ParsedEndpoint, TagGroup } from '../utils/apiSpecParser';
import styles from './APISidebarNav.module.css';

export interface APISidebarNavProps {
  endpoints: ParsedEndpoint[];
  tagGroups?: TagGroup[];
  onEndpointClick?: (endpoint: ParsedEndpoint) => void;
  onTagClick?: (tagName: string) => void;
  selectedEndpointId?: string;
  expandedTags?: string[];
  onTagToggle?: (tag: string) => void;
  enableDeepLinking?: boolean;
}

/**
 * HTTP method color mapper
 */
function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    get: 'info',
    post: 'success',
    put: 'warning',
    patch: 'warning',
    delete: 'danger',
    options: 'secondary',
    head: 'secondary',
  };
  return colors[method.toLowerCase()] || 'secondary';
}

/**
 * HTTP method badge
 */
function MethodBadge({ method }: { method: string }): React.JSX.Element {
  const color = getMethodColor(method);
  return <span className={`${styles.methodBadge} ${styles[color]}`}>{method.toUpperCase()}</span>;
}

/**
 * Filter endpoints by method
 */
function filterEndpointsByMethod(endpoints: ParsedEndpoint[], methods: Set<string>): ParsedEndpoint[] {
  if (methods.size === 0) return endpoints;
  return endpoints.filter(ep => methods.has(ep.method.toLowerCase()));
}

/**
 * Filter endpoints by search query
 */
function filterEndpointsByQuery(endpoints: ParsedEndpoint[], query: string): ParsedEndpoint[] {
  if (!query.trim()) return endpoints;
  const q = query.toLowerCase();
  return endpoints.filter(ep =>
    ep.path.toLowerCase().includes(q) ||
    ep.method.toLowerCase().includes(q) ||
    ep.summary.toLowerCase().includes(q),
  );
}

export default function APISidebarNav({
  endpoints,
  tagGroups: providedTagGroups,
  onEndpointClick,
  onTagClick,
  selectedEndpointId: propSelectedEndpointId,
  expandedTags = [],
  onTagToggle,
  enableDeepLinking = true,
}: APISidebarNavProps): React.JSX.Element {
  const [localExpandedTags, setLocalExpandedTags] = useState<Set<string>>(
    new Set(expandedTags)
  );
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | undefined>(
    propSelectedEndpointId
  );
  const [tagSearchQueries, setTagSearchQueries] = useState<Record<string, string>>({});
  const [tagMethodFilters, setTagMethodFilters] = useState<Record<string, Set<string>>>({});
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [quickSearchIndex, setQuickSearchIndex] = useState(0);

  /**
   * Group endpoints by tag if not provided
   */
  const tagGroups = useMemo<TagGroup[]>(() => {
    if (providedTagGroups) {
      return providedTagGroups;
    }

    const groups: Record<string, ParsedEndpoint[]> = {};

    endpoints.forEach((endpoint) => {
      const tag = endpoint.tag || 'Other';
      if (!groups[tag]) {
        groups[tag] = [];
      }
      groups[tag].push(endpoint);
    });

    return Object.entries(groups)
      .map(([tag, eps]) => ({
        name: tag,
        endpoints: eps.sort((a, b) => a.path.localeCompare(b.path)),
      }))
      .sort((a, b) => {
        if (a.name === 'Other') return 1;
        if (b.name === 'Other') return -1;
        return a.name.localeCompare(b.name);
      });
  }, [endpoints, providedTagGroups]);

  /**
   * Sync with deep-link changes
   */
  useEffect(() => {
    if (!enableDeepLinking) return;

    const unsubscribe = onHashChange((deepLink) => {
      if (!deepLink) return;

      if (deepLink.type === 'endpoint') {
        setSelectedEndpointId(deepLink.target);
      } else if (deepLink.type === 'tag') {
        setLocalExpandedTags((prev) => new Set([...prev, deepLink.target]));
      }
    });

    return unsubscribe;
  }, [enableDeepLinking]);

  const quickSearchResults = useMemo(
    () => filterEndpointsByQuery(endpoints, quickSearch),
    [endpoints, quickSearch],
  );

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setQuickSearchOpen(true);
      }
      if (event.key === 'Escape') setQuickSearchOpen(false);
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => setQuickSearchIndex(0), [quickSearch]);

  const handleQuickSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!quickSearchResults.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setQuickSearchIndex((index) => (index + 1) % quickSearchResults.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setQuickSearchIndex((index) => (index - 1 + quickSearchResults.length) % quickSearchResults.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      handleEndpointClick(quickSearchResults[quickSearchIndex]);
      setQuickSearchOpen(false);
    }
  };

  /**
   * Handle tag expansion toggle
   */
  const handleTagToggle = (tag: string) => {
    const newSet = new Set(localExpandedTags);
    if (newSet.has(tag)) {
      newSet.delete(tag);
    } else {
      newSet.add(tag);
    }
    setLocalExpandedTags(newSet);
    onTagToggle?.(tag);
  };

  /**
   * Handle endpoint click — select, update hash, and scroll target into view.
   *
   * Fix #228: After updating the hash, scan the page for the Redoc-rendered
   * section element and scroll it into view so the TOC link actually
   * navigates to the corresponding section.
   */
  const handleEndpointClick = (endpoint: ParsedEndpoint) => {
    setSelectedEndpointId(endpoint.id);
    onEndpointClick?.(endpoint);
    if (enableDeepLinking) {
      window.location.hash = toEndpointLink(endpoint.id);
    }

    // Attempt a direct scroll to the Redoc-rendered section.
    // Redoc may use several ID patterns; try each in order.
    requestAnimationFrame(() => {
      const candidates = [
        endpoint.id,
        endpoint.id.toLowerCase().replace(/\s+/g, '-'),
        // Redoc <= 2.x uses "tag/<Tag>/<method><Path>" patterns
        `tag/${endpoint.tag || 'default'}/${endpoint.method.toLowerCase()}${endpoint.path}`,
      ];

      for (const candidateId of candidates) {
        try {
          const el =
            document.querySelector(`[id="${CSS.escape(candidateId)}"]`) ||
            document.querySelector(`[data-section-id="${CSS.escape(candidateId)}"]`) ||
            document.getElementById(candidateId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        } catch {
          // Malformed selector — skip.
        }
      }
    });
  };

  /**
   * Handle tag click — expand, update hash, and scroll tag heading into view.
   *
   * Fix #228: After expanding the tag group and updating the hash, scroll
   * the Redoc tag-section heading into view so the TOC link is functional.
   */
  const handleTagClick = (tag: string) => {
    // Expand the tag if not already expanded
    if (!localExpandedTags.has(tag)) {
      handleTagToggle(tag);
    }
    onTagClick?.(tag);
    if (enableDeepLinking) {
      window.location.hash = toTagLink(tag);
    }

    // Scroll to the Redoc-rendered tag section heading.
    requestAnimationFrame(() => {
      const slugTag = tag.toLowerCase().replace(/\s+/g, '-');
      const candidates = [
        tag,
        slugTag,
        `tag/${tag}`,
        `tag/${slugTag}`,
      ];
      for (const candidateId of candidates) {
        try {
          const el =
            document.querySelector(`[id="${CSS.escape(candidateId)}"]`) ||
            document.querySelector(`[data-section-id="${CSS.escape(candidateId)}"]`) ||
            document.getElementById(candidateId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        } catch {
          // Malformed selector — skip.
        }
      }
    });
  };

  return (
    <nav className={styles.container}>
      {quickSearchOpen && (
        <div className={styles.quickSearchOverlay} role="dialog" aria-label="Quick endpoint search">
          <div className={styles.quickSearch}>
            <input
              autoFocus
              type="search"
              placeholder="Search endpoints..."
              value={quickSearch}
              onChange={(event) => setQuickSearch(event.target.value)}
              onKeyDown={handleQuickSearchKeyDown}
              aria-label="Search endpoints"
            />
            <div role="listbox" aria-label="Search results">
              {quickSearchResults.slice(0, 8).map((endpoint, index) => (
                <button
                  key={endpoint.id}
                  type="button"
                  role="option"
                  aria-selected={index === quickSearchIndex}
                  className={styles.quickSearchResult}
                  onClick={() => { handleEndpointClick(endpoint); setQuickSearchOpen(false); }}
                >
                  <MethodBadge method={endpoint.method} /> {endpoint.path}
                </button>
              ))}
              {!quickSearchResults.length && <span className={styles.quickSearchEmpty}>No endpoints found</span>}
            </div>
          </div>
        </div>
      )}
      <div className={styles.header}>
        <h3 className={styles.title}>API Endpoints</h3>
        <span className={styles.count}>{endpoints.length}</span>
      </div>

      <div className={styles.tagGroups}>
        {tagGroups.map((group) => {
          const tagKey = group.name;
          const searchQuery = tagSearchQueries[tagKey] || '';
          const methodFilter = tagMethodFilters[tagKey] || new Set();
          
          // Apply filters
          let filteredEndpoints = group.endpoints;
          filteredEndpoints = filterEndpointsByQuery(filteredEndpoints, searchQuery);
          filteredEndpoints = filterEndpointsByMethod(filteredEndpoints, methodFilter);

          return (
            <div key={group.name} className={styles.tagGroup}>
              {/* Tag Header */}
              <button
                className={styles.tagHeader}
                onClick={() => handleTagClick(group.name)}
                aria-expanded={localExpandedTags.has(group.name)}
                data-tag-name={group.name}
              >
                <span className={styles.tagToggle}>
                  {localExpandedTags.has(group.name) ? '▼' : '▶'}
                </span>
                <span className={styles.tagName}>{group.name}</span>
                <span className={styles.tagCount}>
                  {filteredEndpoints.length > 0 && filteredEndpoints.length !== group.endpoints.length
                    ? `${filteredEndpoints.length}/${group.endpoints.length}`
                    : group.endpoints.length}
                </span>
              </button>

              {/* Tag Search and Filters */}
              {localExpandedTags.has(group.name) && (
                <div className={styles.tagFilterBar}>
                  <input
                    type="search"
                    className={styles.tagSearch}
                    placeholder="Filter endpoints..."
                    value={searchQuery}
                    onChange={(e) =>
                      setTagSearchQueries((prev) => ({
                        ...prev,
                        [tagKey]: e.target.value,
                      }))
                    }
                    aria-label={`Search endpoints in ${group.name}`}
                  />
                  
                  {/* Method Filter Buttons */}
                  <div className={styles.methodFilters}>
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
                      <button
                        key={method}
                        className={`${styles.methodFilter} ${
                          methodFilter.has(method.toLowerCase()) ? styles.active : ''
                        }`}
                        onClick={() => {
                          const newFilter = new Set(methodFilter);
                          if (newFilter.has(method.toLowerCase())) {
                            newFilter.delete(method.toLowerCase());
                          } else {
                            newFilter.add(method.toLowerCase());
                          }
                          setTagMethodFilters((prev) => ({
                            ...prev,
                            [tagKey]: newFilter,
                          }));
                        }}
                        title={`Filter by ${method}`}
                        aria-pressed={methodFilter.has(method.toLowerCase())}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Endpoints List */}
              {localExpandedTags.has(group.name) && (
                <div className={styles.endpointsList}>
                  {filteredEndpoints.length > 0 ? (
                    filteredEndpoints.map((endpoint) => (
                      <button
                        key={endpoint.id}
                        className={`${styles.endpointItem} ${
                          selectedEndpointId === endpoint.id ? styles.selected : ''
                        }`}
                        onClick={() => handleEndpointClick(endpoint)}
                        title={endpoint.summary}
                        data-endpoint-id={endpoint.id}
                      >
                        <MethodBadge method={endpoint.method} />
                        <span className={styles.endpointPath}>{endpoint.path}</span>
                      </button>
                    ))
                  ) : (
                    <div className={styles.noResults}>No endpoints match</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {endpoints.length === 0 && (
        <div className={styles.empty}>
          <p>No endpoints found</p>
        </div>
      )}
    </nav>
  );
}
