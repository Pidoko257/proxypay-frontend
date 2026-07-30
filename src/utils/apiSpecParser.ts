/**
 * API Specification Parser Utility
 * Extracts tags, endpoints, and metadata from OpenAPI 3.0 specification
 */

/**
 * Endpoint information extracted from OpenAPI spec
 */
export interface ParsedEndpoint {
  id: string; // operationId or method:path
  operationId?: string;
  method: string;
  path: string;
  summary: string;
  description?: string;
  tag?: string;
  tags?: string[];
  deprecated?: boolean;
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
}

/**
 * Tag group with endpoints
 */
export interface TagGroup {
  name: string;
  description?: string;
  endpoints: ParsedEndpoint[];
}

/**
 * OpenAPI parameter
 */
export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: Record<string, any>;
  example?: any;
}

/**
 * OpenAPI request body
 */
export interface OpenAPIRequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, { schema?: Record<string, any>; example?: any }>;
}

/**
 * OpenAPI response
 */
export interface OpenAPIResponse {
  description?: string;
  content?: Record<string, { schema?: Record<string, any>; example?: any }>;
}

/**
 * OpenAPI specification document
 */
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{ url: string; description?: string; variables?: Record<string, any> }>;
  paths?: Record<string, Record<string, any>>;
  tags?: Array<{ name: string; description?: string }>;
  components?: Record<string, any>;
  [key: string]: any;
}

/**
 * HTTP methods supported by OpenAPI
 */
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

/**
 * Parse OpenAPI specification and extract endpoints
 * @param spec OpenAPI specification document
 * @returns Array of parsed endpoints
 */
export function parseEndpoints(spec: OpenAPISpec): ParsedEndpoint[] {
  const endpoints: ParsedEndpoint[] = [];
  const paths = spec.paths || {};

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, any>)[method];
      if (!operation || typeof operation !== 'object') continue;

      const operationId = operation.operationId as string | undefined;
      const tags = operation.tags as string[] | undefined;
      const primaryTag = tags && tags.length > 0 ? tags[0] : undefined;

      const endpoint: ParsedEndpoint = {
        id: operationId || `${method}:${path}`,
        operationId,
        method,
        path,
        summary: operation.summary || `${method.toUpperCase()} ${path}`,
        description: operation.description,
        tag: primaryTag,
        tags,
        deprecated: operation.deprecated || false,
        parameters: operation.parameters || undefined,
        requestBody: operation.requestBody || undefined,
        responses: operation.responses || undefined,
      };

      endpoints.push(endpoint);
    }
  }

  return endpoints;
}

/**
 * Group endpoints by their primary tag
 * @param endpoints Array of parsed endpoints
 * @returns Array of tag groups with endpoints
 */
export function groupByTag(endpoints: ParsedEndpoint[]): TagGroup[] {
  const groups: Record<string, ParsedEndpoint[]> = {};
  const tagDescriptions: Record<string, string | undefined> = {};

  // Group endpoints by tag
  for (const endpoint of endpoints) {
    const tag = endpoint.tag || 'Other';
    if (!groups[tag]) {
      groups[tag] = [];
    }
    groups[tag].push(endpoint);
  }

  // Sort endpoints within each group by path
  for (const tag in groups) {
    groups[tag].sort((a, b) => {
      // Sort by method first, then by path
      const methodOrder = { get: 0, post: 1, put: 2, patch: 3, delete: 4, other: 5 };
      const methodA = (methodOrder as Record<string, number>)[a.method] ?? 5;
      const methodB = (methodOrder as Record<string, number>)[b.method] ?? 5;
      if (methodA !== methodB) return methodA - methodB;
      return a.path.localeCompare(b.path);
    });
  }

  // Convert to array and sort by tag name
  const result: TagGroup[] = Object.entries(groups)
    .map(([name, endpoints]) => ({
      name,
      description: tagDescriptions[name],
      endpoints,
    }))
    .sort((a, b) => {
      // Put "Other" at the end
      if (a.name === 'Other') return 1;
      if (b.name === 'Other') return -1;
      return a.name.localeCompare(b.name);
    });

  return result;
}

/**
 * Extract tag descriptions from OpenAPI spec
 * @param spec OpenAPI specification document
 * @returns Map of tag names to descriptions
 */
export function extractTagDescriptions(
  spec: OpenAPISpec,
): Record<string, string | undefined> {
  const descriptions: Record<string, string | undefined> = {};

  if (spec.tags && Array.isArray(spec.tags)) {
    for (const tag of spec.tags) {
      if (tag.name) {
        descriptions[tag.name] = tag.description;
      }
    }
  }

  return descriptions;
}

/**
 * Find endpoint by ID or operationId
 * @param endpoints Array of parsed endpoints
 * @param id Endpoint ID or operationId
 * @returns Parsed endpoint or undefined
 */
export function findEndpoint(
  endpoints: ParsedEndpoint[],
  id: string,
): ParsedEndpoint | undefined {
  return endpoints.find((ep) => ep.id === id || ep.operationId === id);
}

/**
 * Search endpoints by query string
 * @param endpoints Array of parsed endpoints
 * @param query Search query
 * @returns Filtered endpoints
 */
export function searchEndpoints(
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
 * Get all unique tags from endpoints
 * @param endpoints Array of parsed endpoints
 * @returns Sorted array of unique tags
 */
export function extractUniqueTags(endpoints: ParsedEndpoint[]): string[] {
  const tags = new Set<string>();

  for (const endpoint of endpoints) {
    if (endpoint.tag) {
      tags.add(endpoint.tag);
    }
    if (endpoint.tags) {
      for (const tag of endpoint.tags) {
        tags.add(tag);
      }
    }
  }

  return Array.from(tags).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });
}

/**
 * Generate a URL-safe ID from endpoint information
 * @param method HTTP method
 * @param path API path
 * @returns URL-safe identifier
 */
export function generateEndpointId(method: string, path: string): string {
  const pathPart = path
    .replace(/\//g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
  return `${method.toLowerCase()}-${pathPart}`.replace(/^-+|-+$/g, '');
}

/**
 * Extract base path from servers configuration
 * @param spec OpenAPI specification document
 * @returns Base path string or empty string
 */
export function extractBasePath(spec: OpenAPISpec): string {
  if (spec.servers && spec.servers.length > 0) {
    const firstServer = spec.servers[0];
    if (firstServer.url) {
      // Extract path from URL (e.g., "https://api.example.com/v1" -> "/v1")
      const url = new URL(firstServer.url, 'http://localhost');
      return url.pathname || '';
    }
  }
  return '';
}
