/**
 * Utilities for parsing and extracting data from OpenAPI specs
 */

export interface Endpoint {
  id: string;
  method: string;
  path: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Record<string, unknown>[];
  requestBody?: unknown;
  responses?: Record<string, unknown>;
  popularity?: number; // artificial metric based on tag/usage patterns
}

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

/**
 * Fetch and parse OpenAPI spec from static/openapi.yaml
 * Returns parsed JSON (assumes YAML is converted or returns raw if already JSON)
 */
export async function fetchOpenAPISpec(url: string = '/openapi.yaml'): Promise<OpenAPISpec> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch spec: ${response.statusText}`);
    
    const text = await response.text();
    
    // If it's YAML, we need to parse it. For now, assume it's JSON or use a simple parser.
    // In production, you'd use a YAML parser library.
    // For this implementation, we'll try JSON first, then fall back.
    try {
      return JSON.parse(text);
    } catch {
      // If JSON fails, it might be YAML. For now, return empty spec.
      console.warn('Could not parse spec as JSON. Ensure openapi.yaml is valid.');
      throw new Error('Spec parsing failed');
    }
  } catch (error) {
    console.error('Error fetching OpenAPI spec:', error);
    throw error;
  }
}

/**
 * Extract all endpoints from an OpenAPI spec
 */
export function extractEndpoints(spec: OpenAPISpec): Endpoint[] {
  const endpoints: Endpoint[] = [];
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

  Object.entries(spec.paths || {}).forEach(([path, pathItem]) => {
    methods.forEach((method) => {
      const operation = (pathItem as Record<string, unknown>)[method];
      if (!operation) return;

      const op = operation as Record<string, unknown>;
      const id = `${method.toUpperCase()}-${path}`;

      endpoints.push({
        id,
        method: method.toUpperCase(),
        path,
        summary: (op.summary as string) || undefined,
        description: (op.description as string) || undefined,
        tags: (op.tags as string[]) || [],
        parameters: (op.parameters as Record<string, unknown>[]) || [],
        requestBody: op.requestBody,
        responses: (op.responses as Record<string, unknown>) || {},
        popularity: calculatePopularity(op),
      });
    });
  });

  return endpoints;
}

/**
 * Calculate a popularity score based on operation properties
 * (simplified metric: based on tags and response codes)
 */
function calculatePopularity(operation: Record<string, unknown>): number {
  let score = 0;

  // Tag-based popularity
  const tags = (operation.tags as string[]) || [];
  if (tags.includes('core')) score += 3;
  if (tags.includes('webhook')) score += 2;
  if (tags.length > 0) score += 1;

  // Response-based popularity
  const responses = (operation.responses as Record<string, unknown>) || {};
  if (responses['200']) score += 2;
  if (responses['201']) score += 1;

  // Parameters reduce popularity (more complex = less common)
  const params = (operation.parameters as unknown[]) || [];
  score -= Math.min(params.length * 0.5, 1);

  return Math.max(0, Math.round(score));
}

/**
 * Get unique HTTP methods from endpoints
 */
export function getUniqueMethods(endpoints: Endpoint[]): string[] {
  const methods = new Set(endpoints.map((e) => e.method));
  return Array.from(methods).sort();
}

/**
 * Filter endpoints by method
 */
export function filterByMethod(endpoints: Endpoint[], method: string | null): Endpoint[] {
  if (!method) return endpoints;
  return endpoints.filter((e) => e.method === method);
}

/**
 * Search endpoints by path, summary, or description
 */
export function searchEndpoints(endpoints: Endpoint[], query: string): Endpoint[] {
  if (!query.trim()) return endpoints;

  const lowerQuery = query.toLowerCase();
  return endpoints.filter(
    (e) =>
      e.path.toLowerCase().includes(lowerQuery) ||
      e.summary?.toLowerCase().includes(lowerQuery) ||
      e.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Sort endpoints by popularity (descending)
 */
export function sortByPopularity(endpoints: Endpoint[]): Endpoint[] {
  return [...endpoints].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
}
