/**
 * API Sidebar Navigation Component
 * Shows API tag structure and endpoints for navigation
 * Integrates with Redoc for synchronized navigation
 */

import React, { useMemo, useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
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
 * API Sidebar Navigation Component
 */
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
   * Handle endpoint click
   */
  const handleEndpointClick = (endpoint: ParsedEndpoint) => {
    setSelectedEndpointId(endpoint.id);
    if (onEndpointClick) {
      onEndpointClick(endpoint);
    }
    if (enableDeepLinking) {
      window.location.hash = toEndpointLink(endpoint.id);
    }
  };

  /**
   * Handle tag click
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
              data-tag-name={group.name}
            >
              <span className={styles.tagToggle}>
                {localExpandedTags.has(group.name) ? '▼' : '▶'}
              </span>
              <span className={styles.tagName}>{group.name}</span>
              <span className={styles.tagCount}>{group.endpoints.length}</span>
            </button>

            {/* Endpoints List */}
            {localExpandedTags.has(group.name) && (
              <div className={styles.endpointsList}>
                {group.endpoints.map((endpoint) => (
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
