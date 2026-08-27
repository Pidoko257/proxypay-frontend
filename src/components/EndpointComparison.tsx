/**
 * Endpoint Comparison View Component
 * Displays two endpoints side-by-side with differences highlighted
 */

import React, { useMemo } from 'react';
import { ParsedEndpoint, OpenAPIParameter, OpenAPIResponse } from '../utils/apiSpecParser';
import styles from './EndpointComparison.module.css';

export interface EndpointComparisonProps {
  endpoint1?: ParsedEndpoint;
  endpoint2?: ParsedEndpoint;
  onClose?: () => void;
  onSelect?: (endpoint: ParsedEndpoint) => void;
}

/**
 * Compare two values and return difference indicator
 */
function isDifferent(val1: any, val2: any): boolean {
  if (typeof val1 === 'object' && typeof val2 === 'object') {
    return JSON.stringify(val1) !== JSON.stringify(val2);
  }
  return val1 !== val2;
}

/**
 * Format parameter for display
 */
function formatParameter(param: OpenAPIParameter | undefined): React.ReactNode {
  if (!param) return <span className={styles.empty}>—</span>;

  const type = param.schema?.type || 'unknown';
  const required = param.required ? ' *' : '';
  const description = param.description ? `\n${param.description}` : '';

  return (
    <div className={styles.parameterItem}>
      <div className={styles.paramName}>{param.name}{required}</div>
      <div className={styles.paramLocation}>
        <span className={styles.badge}>{param.in}</span>
      </div>
      <div className={styles.paramType}>{type}</div>
      {description && <div className={styles.paramDesc}>{description}</div>}
    </div>
  );
}

/**
 * Get all parameters from both endpoints
 */
function getAllParameters(ep1: ParsedEndpoint | undefined, ep2: ParsedEndpoint | undefined): string[] {
  const names = new Set<string>();

  if (ep1?.parameters) {
    ep1.parameters.forEach(p => names.add(p.name));
  }
  if (ep2?.parameters) {
    ep2.parameters.forEach(p => names.add(p.name));
  }

  return Array.from(names).sort();
}

/**
 * Find parameter by name
 */
function findParameter(endpoint: ParsedEndpoint | undefined, name: string): OpenAPIParameter | undefined {
  if (!endpoint?.parameters) return undefined;
  return endpoint.parameters.find(p => p.name === name);
}

/**
 * Get all response codes from both endpoints
 */
function getAllResponseCodes(ep1: ParsedEndpoint | undefined, ep2: ParsedEndpoint | undefined): string[] {
  const codes = new Set<string>();

  if (ep1?.responses) {
    Object.keys(ep1.responses).forEach(code => codes.add(code));
  }
  if (ep2?.responses) {
    Object.keys(ep2.responses).forEach(code => codes.add(code));
  }

  return Array.from(codes).sort((a, b) => parseInt(a) - parseInt(b));
}

/**
 * Endpoint Comparison Component
 */
export const EndpointComparison: React.FC<EndpointComparisonProps> = ({
  endpoint1,
  endpoint2,
  onClose,
  onSelect,
}) => {
  const allParameters = useMemo(
    () => getAllParameters(endpoint1, endpoint2),
    [endpoint1, endpoint2],
  );

  const allResponseCodes = useMemo(
    () => getAllResponseCodes(endpoint1, endpoint2),
    [endpoint1, endpoint2],
  );

  if (!endpoint1 || !endpoint2) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>Select two endpoints to compare</p>
        </div>
      </div>
    );
  }

  const pathsDiffer = endpoint1.path !== endpoint2.path;
  const methodsDiffer = endpoint1.method !== endpoint2.method;
  const summaryDiffer = endpoint1.summary !== endpoint2.summary;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Endpoint Comparison</h2>
        {onClose && (
          <button className={styles.closeButton} onClick={onClose} aria-label="Close comparison">
            ×
          </button>
        )}
      </div>

      {/* Comparison Grid */}
      <div className={styles.comparisonGrid}>
        {/* Column Headers */}
        <div className={styles.columnHeader} />
        <div className={`${styles.columnHeader} ${styles.column1}`}>
          <div className={styles.endpointBadge}>
            <span className={`${styles.methodBadge} ${styles[endpoint1.method.toLowerCase()]}`}>
              {endpoint1.method.toUpperCase()}
            </span>
            {onSelect && (
              <button
                className={styles.selectButton}
                onClick={() => onSelect(endpoint1)}
                title="Select this endpoint"
                aria-label={`Select ${endpoint1.method} ${endpoint1.path}`}
              >
                →
              </button>
            )}
          </div>
        </div>
        <div className={`${styles.columnHeader} ${styles.column2}`}>
          <div className={styles.endpointBadge}>
            <span className={`${styles.methodBadge} ${styles[endpoint2.method.toLowerCase()]}`}>
              {endpoint2.method.toUpperCase()}
            </span>
            {onSelect && (
              <button
                className={styles.selectButton}
                onClick={() => onSelect(endpoint2)}
                title="Select this endpoint"
                aria-label={`Select ${endpoint2.method} ${endpoint2.path}`}
              >
                →
              </button>
            )}
          </div>
        </div>

        {/* Path Row */}
        <div className={styles.rowLabel}>Path</div>
        <div className={`${styles.rowCell} ${pathsDiffer ? styles.different : ''}`}>
          <code>{endpoint1.path}</code>
        </div>
        <div className={`${styles.rowCell} ${pathsDiffer ? styles.different : ''}`}>
          <code>{endpoint2.path}</code>
        </div>

        {/* Summary Row */}
        <div className={styles.rowLabel}>Summary</div>
        <div className={`${styles.rowCell} ${summaryDiffer ? styles.different : ''}`}>
          {endpoint1.summary}
        </div>
        <div className={`${styles.rowCell} ${summaryDiffer ? styles.different : ''}`}>
          {endpoint2.summary}
        </div>

        {/* Description Row */}
        <div className={styles.rowLabel}>Description</div>
        <div className={styles.rowCell}>
          {endpoint1.description || <span className={styles.empty}>No description</span>}
        </div>
        <div className={styles.rowCell}>
          {endpoint2.description || <span className={styles.empty}>No description</span>}
        </div>

        {/* Parameters Section */}
        {allParameters.length > 0 && (
          <>
            <div className={`${styles.rowLabel} ${styles.sectionHeader}`}>Parameters ({allParameters.length})</div>
            <div className={styles.sectionHeader} />
            <div className={styles.sectionHeader} />

            {allParameters.map(paramName => {
              const param1 = findParameter(endpoint1, paramName);
              const param2 = findParameter(endpoint2, paramName);
              const paramsDiffer = isDifferent(param1, param2);

              return (
                <React.Fragment key={paramName}>
                  <div className={styles.rowLabel}>{paramName}</div>
                  <div className={`${styles.rowCell} ${paramsDiffer ? styles.different : ''}`}>
                    {formatParameter(param1)}
                  </div>
                  <div className={`${styles.rowCell} ${paramsDiffer ? styles.different : ''}`}>
                    {formatParameter(param2)}
                  </div>
                </React.Fragment>
              );
            })}
          </>
        )}

        {/* Response Codes Section */}
        {allResponseCodes.length > 0 && (
          <>
            <div className={`${styles.rowLabel} ${styles.sectionHeader}`}>Responses ({allResponseCodes.length})</div>
            <div className={styles.sectionHeader} />
            <div className={styles.sectionHeader} />

            {allResponseCodes.map(code => {
              const response1 = endpoint1.responses?.[code];
              const response2 = endpoint2.responses?.[code];
              const responsesDiffer = isDifferent(response1, response2);
              const codeNum = parseInt(code);
              const codeClass =
                codeNum >= 200 && codeNum < 300
                  ? styles.success
                  : codeNum >= 400 && codeNum < 500
                    ? styles.clientError
                    : codeNum >= 500
                      ? styles.serverError
                      : styles.info;

              return (
                <React.Fragment key={code}>
                  <div className={styles.rowLabel}>
                    <span className={`${styles.statusBadge} ${codeClass}`}>{code}</span>
                  </div>
                  <div className={`${styles.rowCell} ${responsesDiffer ? styles.different : ''}`}>
                    {response1?.description || <span className={styles.empty}>—</span>}
                  </div>
                  <div className={`${styles.rowCell} ${responsesDiffer ? styles.different : ''}`}>
                    {response2?.description || <span className={styles.empty}>—</span>}
                  </div>
                </React.Fragment>
              );
            })}
          </>
        )}

        {/* Deprecated Row */}
        <div className={styles.rowLabel}>Deprecated</div>
        <div className={styles.rowCell}>
          {endpoint1.deprecated ? <span className={styles.deprecated}>Yes</span> : 'No'}
        </div>
        <div className={styles.rowCell}>
          {endpoint2.deprecated ? <span className={styles.deprecated}>Yes</span> : 'No'}
        </div>
      </div>
    </div>
  );
};

export default EndpointComparison;
