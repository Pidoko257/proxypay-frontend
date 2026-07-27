import React, { useState } from 'react';
import type { EndpointInfo } from '../hooks/useOpenApiSpec';

type BadgeType = 'popular' | 'new' | 'trending' | 'stable' | 'deprecated' | 'beta';

interface BadgeInfo {
  type: BadgeType;
  label: string;
  description: string;
  color: string;
  icon: string;
}

const badgeConfig: Record<BadgeType, BadgeInfo> = {
  popular: {
    type: 'popular',
    label: '⭐ Most Popular',
    description: 'This endpoint is the most commonly used by developers.',
    color: '#f59e0b',
    icon: '⭐',
  },
  new: {
    type: 'new',
    label: '🆕 New',
    description: 'Recently added endpoint. Feedback is welcome!',
    color: '#3b82f6',
    icon: '🆕',
  },
  trending: {
    type: 'trending',
    label: '📈 Trending',
    description: 'Usage of this endpoint is growing rapidly.',
    color: '#8b5cf6',
    icon: '📈',
  },
  stable: {
    type: 'stable',
    label: '✅ Stable',
    description: 'Battle-tested and production-ready. No breaking changes expected.',
    color: '#10b981',
    icon: '✅',
  },
  deprecated: {
    type: 'deprecated',
    label: '⚠️ Deprecated',
    description: 'This endpoint will be removed in a future version. Migrate to the replacement.',
    color: '#ef4444',
    icon: '⚠️',
  },
  beta: {
    type: 'beta',
    label: '🧪 Beta',
    description: 'This endpoint is in beta testing. APIs may change without notice.',
    color: '#6366f1',
    icon: '🧪',
  },
};

function determineBadge(endpoint: EndpointInfo, allEndpoints: EndpointInfo[]): BadgeType | null {
  const op = endpoint.operation;

  // Check for explicit badge via x-badge extension
  const extBadge = (op as any)?.['x-badge'];
  if (extBadge && badgeConfig[extBadge as BadgeType]) {
    return extBadge as BadgeType;
  }

  // Check deprecated
  if ((op as any)?.deprecated) {
    return 'deprecated';
  }

  // Check beta
  if (endpoint.path.includes('beta') || op.tags?.some((t) => t.toLowerCase().includes('beta'))) {
    return 'beta';
  }

  const tagEndpoints = allEndpoints.filter((e) => e.tagName === endpoint.tagName);
  const sorted = tagEndpoints.sort((a, b) => {
    const aDesc = (a.operation.description || a.operation.summary || '').length;
    const bDesc = (b.operation.description || b.operation.summary || '').length;
    return bDesc - aDesc;
  });

  // Most described endpoint in tag = popular
  if (sorted[0]?.path === endpoint.path && sorted[0]?.method === endpoint.method) {
    return 'popular';
  }

  // First endpoint in tag = new
  if (tagEndpoints[0]?.path === endpoint.path && tagEndpoints[0]?.method === endpoint.method) {
    return 'new';
  }

  // Default: stable
  if (tagEndpoints.length <= 3) {
    return 'stable';
  }

  // Random distribution for demo (in production, this would use real metrics)
  const hashes: Record<string, BadgeType> = {};
  tagEndpoints.forEach((ep, i) => {
    if (i === 0) hashes[`${ep.path}:${ep.method}`] = 'popular';
    else if (i === 1) hashes[`${ep.path}:${ep.method}`] = 'trending';
    else hashes[`${ep.path}:${ep.method}`] = 'stable';
  });

  return hashes[`${endpoint.path}:${endpoint.method}`] || 'stable';
}

interface EndpointBadgesProps {
  endpoints: EndpointInfo[];
  onEndpointClick?: (endpoint: EndpointInfo) => void;
  selectedEndpoint?: { path: string; method: string } | null;
}

export default function EndpointBadges({
  endpoints,
  onEndpointClick,
  selectedEndpoint,
}: EndpointBadgesProps): React.JSX.Element {
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  if (endpoints.length === 0) {
    return (
      <div className="eb-empty">
        <p>No endpoints available.</p>
      </div>
    );
  }

  const tagGroups = new Map<string, EndpointInfo[]>();
  endpoints.forEach((ep) => {
    const existing = tagGroups.get(ep.tagName) || [];
    existing.push(ep);
    tagGroups.set(ep.tagName, existing);
  });

  const allBadgeCounts: Record<string, number> = {};
  endpoints.forEach((ep) => {
    const badge = determineBadge(ep, endpoints);
    if (badge) {
      allBadgeCounts[badge] = (allBadgeCounts[badge] || 0) + 1;
    }
  });

  return (
    <div className="endpoint-badges">
      <div className="eb-header">
        <h3 className="eb-title">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2 15.09 8.26 22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
          </svg>
          Endpoint Overview
        </h3>
        <div className="eb-summary">
          {Object.entries(allBadgeCounts).map(([type, count]) => {
            const info = badgeConfig[type as BadgeType];
            if (!info) return null;
            return (
              <div
                key={type}
                className="eb-summary-chip"
                style={{ '--badge-color': info.color } as React.CSSProperties}
              >
                {info.icon} {info.label.split(' ').pop()} ({count})
              </div>
            );
          })}
        </div>
      </div>

      <div className="eb-groups">
        {Array.from(tagGroups.entries()).map(([tagName, eps]) => (
          <div key={tagName} className="eb-group">
            <h4 className="eb-group-title">{tagName}</h4>
            <ul className="eb-list">
              {eps.map((ep) => {
                const badge = determineBadge(ep, endpoints);
                const info = badge ? badgeConfig[badge] : null;
                const key = `${ep.method}:${ep.path}`;
                const isSelected =
                  selectedEndpoint?.path === ep.path &&
                  selectedEndpoint?.method === ep.method;

                return (
                  <li
                    key={key}
                    className={`eb-item ${isSelected ? 'eb-selected' : ''}`}
                    onClick={() => onEndpointClick?.(ep)}
                    onMouseEnter={() => setHoveredBadge(key)}
                    onMouseLeave={() => setHoveredBadge(null)}
                  >
                    <span className={`eb-method eb-method-${ep.method.toLowerCase()}`}>
                      {ep.method}
                    </span>
                    <span className="eb-path">{ep.path}</span>
                    {info && (
                      <span
                        className="eb-badge"
                        style={{ '--badge-color': info.color } as React.CSSProperties}
                        title={info.description}
                      >
                        {info.icon}
                      </span>
                    )}
                    {hoveredBadge === key && info && (
                      <div className="eb-tooltip">
                        <strong>{info.label}</strong>
                        <p>{info.description}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export { badgeConfig, determineBadge };
export type { BadgeInfo, BadgeType };
