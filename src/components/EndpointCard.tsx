import React from 'react';
import type { Endpoint } from '../utils/openapi';
import styles from './EndpointCard.module.css';

interface EndpointCardProps {
  endpoint: Endpoint;
  onCardClick?: (endpoint: Endpoint) => void;
}

const methodColors: Record<string, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  PATCH: '#50e3c2',
  DELETE: '#f93e3e',
  HEAD: '#9012fe',
  OPTIONS: '#0ed7b7',
};

export default function EndpointCard({ endpoint, onCardClick }: EndpointCardProps): React.JSX.Element {
  const methodColor = methodColors[endpoint.method] || '#999';
  const popularityStars = '★'.repeat(Math.min(endpoint.popularity || 0, 5));

  return (
    <div
      className={styles.card}
      onClick={() => onCardClick?.(endpoint)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick?.(endpoint);
        }
      }}
      role="button"
      tabIndex={0}
      title="Click to view details"
    >
      <div className={styles.header}>
        <span
          className={styles.methodBadge}
          style={{ backgroundColor: methodColor }}
        >
          {endpoint.method}
        </span>
        {endpoint.popularity !== undefined && endpoint.popularity > 0 && (
          <span className={styles.popularity} title={`Popularity: ${endpoint.popularity}`}>
            {popularityStars}
          </span>
        )}
      </div>

      <div className={styles.path} title={endpoint.path}>
        {endpoint.path}
      </div>

      {endpoint.summary && <div className={styles.summary}>{endpoint.summary}</div>}

      {endpoint.description && (
        <div className={styles.description}>{endpoint.description.substring(0, 100)}...</div>
      )}

      {endpoint.tags && endpoint.tags.length > 0 && (
        <div className={styles.tags}>
          {endpoint.tags.slice(0, 3).map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
          {endpoint.tags.length > 3 && <span className={styles.tag}>+{endpoint.tags.length - 3}</span>}
        </div>
      )}
    </div>
  );
}
