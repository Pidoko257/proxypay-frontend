import React, { useMemo, useState } from 'react';
import type { Endpoint } from '../utils/openapi';
import { filterByMethod, getUniqueMethods, searchEndpoints, sortByPopularity } from '../utils/openapi';
import EndpointCard from './EndpointCard';
import styles from './CardView.module.css';

interface CardViewProps {
  endpoints: Endpoint[];
  onCardClick?: (endpoint: Endpoint) => void;
}

export default function CardView({ endpoints, onCardClick }: CardViewProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const uniqueMethods = useMemo(() => getUniqueMethods(endpoints), [endpoints]);

  const filteredEndpoints = useMemo(() => {
    let result = endpoints;
    result = filterByMethod(result, selectedMethod);
    result = searchEndpoints(result, searchQuery);
    result = sortByPopularity(result);
    return result;
  }, [endpoints, selectedMethod, searchQuery]);

  return (
    <div className={styles.cardView}>
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search endpoints (path, summary, description)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            aria-label="Search endpoints"
          />
          {searchQuery && (
            <button
              className={styles.clearBtn}
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className={styles.methodFilter}>
          <button
            className={`${styles.methodBtn} ${selectedMethod === null ? styles.active : ''}`}
            onClick={() => setSelectedMethod(null)}
          >
            All Methods
          </button>
          {uniqueMethods.map((method) => (
            <button
              key={method}
              className={`${styles.methodBtn} ${selectedMethod === method ? styles.active : ''}`}
              onClick={() => setSelectedMethod(method)}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.resultCount}>
        Showing {filteredEndpoints.length} of {endpoints.length} endpoints
      </div>

      <div className={styles.grid}>
        {filteredEndpoints.length > 0 ? (
          filteredEndpoints.map((endpoint) => (
            <EndpointCard key={endpoint.id} endpoint={endpoint} onCardClick={onCardClick} />
          ))
        ) : (
          <div className={styles.emptyState}>
            <p>No endpoints found</p>
            <p className={styles.emptyText}>
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
