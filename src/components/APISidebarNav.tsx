/**
 * API Sidebar Navigation Component
 * Shows API tag structure and endpoints for navigation
 * Integrates with Redoc for synchronized navigation
 * Supports per-tag search and HTTP method filtering
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
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
 * Attempts to find a Redoc-rendered DOM element by trying a list of candidate
 * selector strings in order, returning the first match or null.
 *
 * Selector compatibility notes:
 *  - `[id="<id>"]`              — generic; works for most Redoc versions.
 *  - `[data-section-id="<id>"]` — Redoc 2.x uses data-section-id attributes
 *                                  on operation and tag section wrappers.
 *  - `document.getElementById`  — plain fallback for simple id values.
 *
 * If no selector matches, a console.warn is emitted in development mode so
 * developers can diagnose DOM structure differences between Redoc versions.
 *
 * @param candidates - Ordered list of id strings to try. Each id is tried
 *   with three query strategies before moving to the next candidate.
 * @returns The first matching Element, or null if nothing matched.
 */
export function resolveRedocElement(candidates: string[]): Element | null {
  for (const candidateId of candidates) {
    try {
      const escaped = CSS.escape(candidateId);
      const el =
        document.querySelector(`[id="${escaped}"]`) ??
        document.querySelector(`[data-section-id="${escaped}"]`) ??
        document.getElementById(candidateId);
      if (el) return el;
    } catch {
      // CSS.escape threw on a malformed value — skip this candidate.
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[APISidebarNav] resolveRedocElement: none of the following selectors matched the DOM.',
      '\nTried candidates:', candidates,
      '\nThis usually means the Redoc version has changed its internal id/attribute scheme.',
      '\nCheck the Redoc changelog and update the selector arrays in handleEndpointClick / handleTagClick.',
    );
  }

  return null;
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
  /** Non-null when a scroll navigation failed; auto-clears after 3 s. */
  const [navError, setNavError] = useState<string | null>(null);

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
   * Show an auto-dismissing error toast when navigation fails.
   */
  const showNavError = useCallback((message: string) => {
    setNavError(message);
    setTimeout(() => setNavError(null), 3000);
  }, []);

  /**
   * Handle endpoint click — select, update hash, and scroll target into view.
   *
   * Fix #319: Uses resolveRedocElement() to attempt scrolling the Redoc-
   * rendered section. When no element is found, logs a warning in dev mode,
   * falls back to scrolling window to top, and shows a user-visible toast.
   *
   * Selector compatibility:
   *  - endpoint.id            — direct id match (all Redoc versions)
   *  - lowercased slug        — Redoc may normalise ids to lowercase
   *  - tag/<Tag>/<method><Path> — Redoc ≤ 2.x internal id pattern
   */
  const handleEndpointClick = (endpoint: ParsedEndpoint) => {
    setSelectedEndpointId(endpoint.id);
    onEndpointClick?.(endpoint);
    if (enableDeepLinking) {
      window.location.hash = toEndpointLink(endpoint.id);
    }

    requestAnimationFrame(() => {
      // Selector candidates ordered from most specific to most generic.
      // See resolveRedocElement() JSDoc for Redoc version compatibility notes.
      const candidates = [
        endpoint.id,
        endpoint.id.toLowerCase().replace(/\s+/g, '-'),
        // Redoc <= 2.x uses "tag/<Tag>/<method><Path>" patterns
        `tag/${endpoint.tag ?? 'default'}/${endpoint.method.toLowerCase()}${endpoint.path}`,
      ];

      const el = resolveRedocElement(candidates);
      if (el) {
        setNavError(null);
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Fallback: scroll to top so the user at least sees the page start.
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showNavError('Navigation target not found — scrolled to top.');
      }
    });
  };

  /**
   * Handle tag click — expand, update hash, and scroll tag heading into view.
   *
   * Fix #319: Uses resolveRedocElement() for robust selector resolution.
   * Falls back to window.scrollTo(top) and shows a toast when not found.
   *
   * Selector candidates:
   *  - tag           — raw tag name as id
   *  - slugTag       — lowercased, hyphenated tag name
   *  - tag/<tag>     — Redoc ≤ 2.x group section id pattern
   *  - tag/<slugTag> — slugged variant of the above
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

    requestAnimationFrame(() => {
      const slugTag = tag.toLowerCase().replace(/\s+/g, '-');
      // Selector candidates ordered from most specific to most generic.
      // See resolveRedocElement() JSDoc for Redoc version compatibility notes.
      const candidates = [
        tag,
        slugTag,
        `tag/${tag}`,
        `tag/${slugTag}`,
      ];

      const el = resolveRedocElement(candidates);
      if (el) {
        setNavError(null);
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showNavError('Navigation target not found — scrolled to top.');
      }
    });
  };

  return (
    <nav className={styles.container}>
      {/* Navigation error toast — auto-dismisses after 3 s */}
      {navError && (
        <div
          className={styles.navErrorToast}
          role="alert"
          aria-live="polite"
          data-testid="nav-error-toast"
        >
          ⚠️ {navError}
        </div>
      )}
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
