import { useState, useEffect } from 'react';
import yaml from 'js-yaml';

interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, Record<string, PathItem>>;
  components?: {
    schemas?: Record<string, any>;
    parameters?: Record<string, any>;
  };
  tags?: Array<{ name: string; description?: string }>;
  [key: string]: any;
}

interface PathItem {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: any;
  responses?: Record<string, any>;
  [key: string]: any;
}

export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: {
    type?: string;
    format?: string;
    enum?: string[];
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    default?: any;
    example?: any;
    examples?: any[];
    [key: string]: any;
  };
  example?: any;
  examples?: Record<string, any>;
}

export interface EndpointInfo {
  path: string;
  method: string;
  operation: PathItem;
  tagName: string;
}

/** Find an endpoint by path and method from a list of endpoints */
export function getEndpoint(endpoints: EndpointInfo[], path: string, method: string): EndpointInfo | undefined {
  return endpoints.find(e => e.path === path && e.method === method.toUpperCase());
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

interface UseOpenApiSpecResult {
  spec: OpenApiSpec | null;
  loading: boolean;
  error: string | null;
  endpoints: EndpointInfo[];
  getEndpoint: (path: string, method: string) => EndpointInfo | undefined;
}

export function useOpenApiSpec(): UseOpenApiSpecResult {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSpec() {
      try {
        const res = await fetch('/openapi.yaml');
        if (!res.ok) throw new Error(`Failed to load spec: ${res.status}`);
        const text = await res.text();
        if (cancelled) return;
        const parsed = yaml.load(text) as OpenApiSpec;
        setSpec(parsed);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSpec();
    return () => { cancelled = true; };
  }, []);

  const endpoints: EndpointInfo[] = [];
  if (spec?.paths) {
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (typeof operation === 'object' && operation !== null && HTTP_METHODS.includes(method.toLowerCase())) {
          const op = operation as PathItem;
          const tagName = op.tags?.[0] || 'Uncategorized';
          endpoints.push({ path, method: method.toUpperCase(), operation: op, tagName });
        }
      }
    }
  }

  const boundGetEndpoint = (path: string, method: string) => getEndpoint(endpoints, path, method);

  return { spec, loading, error, endpoints, getEndpoint: boundGetEndpoint };
}
