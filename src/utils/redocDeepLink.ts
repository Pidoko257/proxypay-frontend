/**
 * Deep-Link Helper Utility for Redoc Navigation
 * Manages URL hash-based navigation for API reference pages
 */

/**
 * Deep-link types
 */
export type DeepLinkType = 'endpoint' | 'tag' | 'schema' | 'response';

/**
 * Deep-link structure
 */
export interface DeepLink {
  type: DeepLinkType;
  target: string; // endpoint ID, tag name, schema name, etc.
  subTarget?: string; // optional sub-target (e.g., response code)
  query?: string; // optional search query
}

/**
 * Parse URL hash into deep-link structure
 * Format: #/endpoint?id=<id> or #/tag/<tagName> or #/schema/<schemaName>?query=<query>
 * @param hash URL hash string (with or without leading #)
 * @returns Parsed deep-link or null if invalid
 */
export function parseDeepLink(hash: string): DeepLink | null {
  // Remove leading #
  let cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!cleanHash) return null;

  // Split by ? to separate path from query
  const [pathPart, queryPart] = cleanHash.split('?');

  // Parse query parameters
  const queryParams = new URLSearchParams(queryPart || '');
  const query = queryParams.get('query') ?? undefined;

  // Parse path: /endpoint, /tag/tagName, /schema/schemaName, etc.
  const pathSegments = pathPart.split('/').filter((s) => s);

  if (pathSegments.length === 0) return null;

  const type = pathSegments[0] as DeepLinkType;

  if (!['endpoint', 'tag', 'schema', 'response'].includes(type)) {
    return null;
  }

  // For endpoint type, check for id query parameter
  if (type === 'endpoint') {
    const id = queryParams.get('id');
    if (!id) return null;
    return { type, target: id, query };
  }

  // For other types, target is the second path segment
  const target = pathSegments[1] || queryParams.get('id');
  if (!target) return null;

  const subTarget = pathSegments[2] ?? queryParams.get('subId') ?? undefined;

  return { type, target, subTarget, query };
}

/**
 * Generate URL hash from deep-link structure
 * @param deepLink Deep-link structure
 * @returns URL hash string (with leading #)
 */
export function generateDeepLink(deepLink: DeepLink): string {
  let hash = `#/${deepLink.type}`;

  if (deepLink.type === 'endpoint') {
    hash += `?id=${encodeURIComponent(deepLink.target)}`;
  } else {
    hash += `/${encodeURIComponent(deepLink.target)}`;
    if (deepLink.subTarget) {
      hash += `/${encodeURIComponent(deepLink.subTarget)}`;
    }
  }

  if (deepLink.query) {
    hash += `${deepLink.type === 'endpoint' ? '&' : '?'}query=${encodeURIComponent(deepLink.query)}`;
  }

  return hash;
}

/**
 * Navigate to endpoint deep-link
 * @param endpointId Endpoint ID or operationId
 * @param query Optional search query
 * @returns URL hash string
 */
export function toEndpointLink(endpointId: string, query?: string): string {
  return generateDeepLink({
    type: 'endpoint',
    target: endpointId,
    query,
  });
}

/**
 * Navigate to tag deep-link
 * @param tagName Tag name
 * @param query Optional search query
 * @returns URL hash string
 */
export function toTagLink(tagName: string, query?: string): string {
  return generateDeepLink({
    type: 'tag',
    target: tagName,
    query,
  });
}

/**
 * Navigate to schema deep-link
 * @param schemaName Schema name
 * @param query Optional search query
 * @returns URL hash string
 */
export function toSchemaLink(schemaName: string, query?: string): string {
  return generateDeepLink({
    type: 'schema',
    target: schemaName,
    query,
  });
}

/**
 * Navigate to response deep-link
 * @param endpointId Endpoint ID
 * @param responseCode Response code (e.g., "200", "404")
 * @returns URL hash string
 */
export function toResponseLink(endpointId: string, responseCode: string): string {
  return generateDeepLink({
    type: 'response',
    target: endpointId,
    subTarget: responseCode,
  });
}

/**
 * Scroll element into view smoothly
 * @param element Element to scroll into view
 * @param options Scroll options
 */
export function scrollIntoView(
  element: HTMLElement | null,
  options?: ScrollIntoViewOptions,
): void {
  if (!element) return;

  const defaultOptions: ScrollIntoViewOptions = {
    behavior: 'smooth',
    block: 'start',
    inline: 'nearest',
  };

  element.scrollIntoView({ ...defaultOptions, ...options });
}

/**
 * Find element by data attribute
 * @param attr Attribute name (e.g., "endpoint-id")
 * @param value Attribute value
 * @returns Element or null
 */
export function findElementByDataAttr(
  attr: string,
  value: string,
): HTMLElement | null {
  return document.querySelector(`[data-${attr}="${CSS.escape(value)}"]`) as HTMLElement | null;
}

/**
 * Listen for hash changes and trigger callback
 * @param callback Callback function with deep-link parameter
 * @returns Unsubscribe function
 */
export function onHashChange(callback: (deepLink: DeepLink | null) => void): () => void {
  const handleHashChange = () => {
    const deepLink = parseDeepLink(window.location.hash);
    callback(deepLink);
  };

  window.addEventListener('hashchange', handleHashChange);

  // Call immediately with current hash
  handleHashChange();

  // Return unsubscribe function
  return () => {
    window.removeEventListener('hashchange', handleHashChange);
  };
}

/**
 * Update browser history with deep-link
 * @param deepLink Deep-link structure
 */
export function updateHistory(deepLink: DeepLink): void {
  const hash = generateDeepLink(deepLink);
  window.history.replaceState(null, '', hash);
}

/**
 * Normalize endpoint ID for comparison (case-insensitive, trim whitespace)
 * @param id Endpoint ID or operationId
 * @returns Normalized ID
 */
export function normalizeEndpointId(id: string): string {
  return id.toLowerCase().trim();
}

/**
 * Compare two endpoint IDs (handles operationId and method:path formats)
 * @param id1 First endpoint ID
 * @param id2 Second endpoint ID
 * @returns True if IDs match
 */
export function endpointIdsMatch(id1: string, id2: string): boolean {
  return normalizeEndpointId(id1) === normalizeEndpointId(id2);
}

/**
 * Extract method and path from endpoint ID in format "method:path"
 * @param id Endpoint ID
 * @returns Object with method and path, or null if not in expected format
 */
export function parseMethodPath(id: string): { method: string; path: string } | null {
  const match = id.match(/^([a-z]+):(.+)$/i);
  if (!match) return null;
  return {
    method: match[1].toUpperCase(),
    path: match[2],
  };
}

/**
 * Generate Redoc selector ID from endpoint information
 * Redoc uses IDs like "get-/users" for endpoints
 * @param method HTTP method
 * @param path API path
 * @returns Redoc selector ID
 */
export function generateRedocSelectorId(method: string, path: string): string {
  return `${method.toLowerCase()}-${path}`;
}

/**
 * Create a hash observer that executes callbacks on deep-link changes
 */
export class DeepLinkObserver {
  private unsubscribe: (() => void) | null = null;
  private lastDeepLink: DeepLink | null = null;
  private callbacks: Map<string, (deepLink: DeepLink | null) => void> = new Map();

  /**
   * Start observing hash changes
   */
  start(): void {
    this.unsubscribe = onHashChange((deepLink) => {
      this.lastDeepLink = deepLink;
      this.callbacks.forEach((callback) => {
        callback(deepLink);
      });
    });
  }

  /**
   * Stop observing hash changes
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Subscribe to deep-link changes
   * @param id Subscription ID
   * @param callback Callback function
   */
  subscribe(id: string, callback: (deepLink: DeepLink | null) => void): void {
    this.callbacks.set(id, callback);
    // Call immediately with current deep-link
    callback(this.lastDeepLink);
  }

  /**
   * Get current deep-link
   */
  getCurrent(): DeepLink | null {
    return this.lastDeepLink;
  }
}
