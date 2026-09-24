/**
 * API Sidebar Navigation Component
 * Shows API tag structure and endpoints for navigation
 * Integrates with Redoc for synchronized navigation
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  toEndpointLink,
  toTagLink,
  onHashChange,
} from '../utils/redocDeepLink';
import type { ParsedEndpoint, TagGroup } from '../utils/apiSpecParser';
import styles from './APISidebarNav.module.css';

export interface APISidebarNavProps {
  endpoints: ParsedEndpoint[];
  tagGroups?: TagGroup[];
  searchQuery?: string;
  onEndpointClick?: (endpoint: ParsedEndpoint) => void;
  onTagClick?: (tagName: string) => void;
  selectedEndpointId?: string;
  expandedTags?: string[];
  onTagToggle?: (tag: string) => void;
  enableDeepLinking?: boolean;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const safeQuery = query.trim();
  const regex = new RegExp(`(${escapeRegExp(safeQuery)})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.toLowerCase() === safeQuery.toLowerCase()) {
      return <mark key={`${part}-${index}`}>{part}</mark>;
    }
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
 * API Sidebar Navigation Component
 */
export default function APISidebarNav({
  endpoints,
  tagGroups: providedTagGroups,
  searchQuery = '',
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
  const endpointRefs = useRef<Array<HTMLButtonElement | null>>([]);

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
    if (onTagToggle) {
      onTagToggle(tag);
    }
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
    if (onEndpointClick) {
      onEndpointClick(endpoint);
    }
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
    if (onTagClick) {
      onTagClick(tag);
    }
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

  const handleEndpointKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    endpoint: ParsedEndpoint,
    index: number,
  ) => {
    const visibleEndpoints = tagGroups.flatMap((group) =>
      localExpandedTags.has(group.name) ? group.endpoints : [],
    );
    const currentIndex = visibleEndpoints.findIndex((item) => item.id === endpoint.id);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = visibleEndpoints[currentIndex + 1] ?? visibleEndpoints[0];
      if (next) {
        const nextRef = endpointRefs.current.find((ref) => ref?.dataset.endpointId === next.id);
        nextRef?.focus();
        handleEndpointClick(next);
      }
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const previous = visibleEndpoints[currentIndex - 1] ?? visibleEndpoints[visibleEndpoints.length - 1];
      if (previous) {
        const previousRef = endpointRefs.current.find((ref) => ref?.dataset.endpointId === previous.id);
        previousRef?.focus();
        handleEndpointClick(previous);
      }
    }

    if (event.key === 'Home') {
      event.preventDefault();
      const first = visibleEndpoints[0];
      if (first) {
        const firstRef = endpointRefs.current.find((ref) => ref?.dataset.endpointId === first.id);
        firstRef?.focus();
        handleEndpointClick(first);
      }
    }

    if (event.key === 'End') {
      event.preventDefault();
      const last = visibleEndpoints[visibleEndpoints.length - 1];
      if (last) {
        const lastRef = endpointRefs.current.find((ref) => ref?.dataset.endpointId === last.id);
        lastRef?.focus();
        handleEndpointClick(last);
      }
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleEndpointClick(endpoint);
    }

    if (event.key === 'Tab') {
      endpointRefs.current[index] = event.currentTarget;
    }
  };

  return (
    <nav className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>API Endpoints</h3>
        <span className={styles.count}>{endpoints.length}</span>
      </div>

      <div className={styles.tagGroups}>
        {tagGroups.map((group) => (
          <div key={group.name} className={styles.tagGroup}>
            {/* Tag Header */}
            <button
              className={styles.tagHeader}
              onClick={() => handleTagClick(group.name)}
              aria-expanded={localExpandedTags.has(group.name)}
              aria-label={`Toggle ${group.name} endpoints`}
              data-tag-name={group.name}
            >
              <span className={styles.tagToggle}>
                {localExpandedTags.has(group.name) ? '▼' : '▶'}
              </span>
              <span className={styles.tagName}>{highlightMatch(group.name, searchQuery)}</span>
              <span className={styles.tagCount}>{group.endpoints.length}</span>
            </button>

            {/* Endpoints List */}
            {localExpandedTags.has(group.name) && (
              <div className={styles.endpointsList} role="list" aria-label={`${group.name} endpoints`}>
                {group.endpoints.map((endpoint, listIndex) => (
                  <button
                    key={endpoint.id}
                    ref={(node) => {
                      endpointRefs.current[listIndex] = node;
                    }}
                    className={`${styles.endpointItem} ${
                      selectedEndpointId === endpoint.id ? styles.selected : ''
                    }`}
                    onClick={() => handleEndpointClick(endpoint)}
                    onKeyDown={(event) => handleEndpointKeyDown(event, endpoint, listIndex)}
                    title={endpoint.summary}
                    data-endpoint-id={endpoint.id}
                    aria-current={selectedEndpointId === endpoint.id ? 'true' : undefined}
                    aria-label={`${endpoint.method.toUpperCase()} ${endpoint.path}`}
                  >
                    <MethodBadge method={endpoint.method} />
                    <span className={styles.endpointPath}>{highlightMatch(endpoint.path, searchQuery)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
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
