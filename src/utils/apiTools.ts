import { parseEndpoints, type OpenAPISpec, type ParsedEndpoint } from './apiSpecParser';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace']);

function resolveReference(spec: OpenAPISpec, reference: string): unknown {
  if (!reference.startsWith('#/')) return undefined;
  return reference.slice(2).split('/').reduce<unknown>((value, segment) => {
    const key = segment.replace(/~1/g, '/').replace(/~0/g, '~');
    return value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
  }, spec);
}

export function createSchemaExample(
  schema: Record<string, any> | undefined,
  spec: OpenAPISpec,
  seenReferences = new Set<string>(),
  depth = 0,
): unknown {
  if (!schema || depth > 8) return {};
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];

  if (typeof schema.$ref === 'string') {
    if (seenReferences.has(schema.$ref)) return {};
    const resolved = resolveReference(spec, schema.$ref);
    if (resolved && typeof resolved === 'object') {
      const nextReferences = new Set(seenReferences).add(schema.$ref);
      return createSchemaExample(resolved as Record<string, any>, spec, nextReferences, depth + 1);
    }
  }

  const composition = schema.oneOf?.[0] || schema.anyOf?.[0];
  if (composition) return createSchemaExample(composition, spec, seenReferences, depth + 1);
  if (Array.isArray(schema.allOf)) {
    return Object.assign(
      {},
      ...schema.allOf.map((part: Record<string, any>) =>
        createSchemaExample(part, spec, seenReferences, depth + 1),
      ),
    );
  }

  const type = schema.type || (schema.properties ? 'object' : schema.items ? 'array' : 'string');
  if (type === 'object') {
    return Object.fromEntries(
      Object.entries(schema.properties || {}).map(([key, property]) => [
        key,
        createSchemaExample(property as Record<string, any>, spec, seenReferences, depth + 1),
      ]),
    );
  }
  if (type === 'array') {
    return [createSchemaExample(schema.items, spec, seenReferences, depth + 1)];
  }
  if (type === 'integer' || type === 'number') return 1;
  if (type === 'boolean') return true;
  if (schema.format === 'email') return 'jane@example.com';
  if (schema.format === 'date' || schema.format === 'date-time') return '2026-09-26T12:00:00Z';
  return 'string';
}

function getResponseExample(spec: OpenAPISpec, endpoint: ParsedEndpoint, requestedStatus?: string): {
  status: string;
  body: unknown;
  headers: Record<string, unknown>;
} {
  const responses = endpoint.responses || {};
  const status = requestedStatus && responses[requestedStatus]
    ? requestedStatus
    : Object.keys(responses).sort((left, right) => {
        const rank = (code: string) => (code === 'default' ? 2 : /^2\d\d$/.test(code) ? 0 : 1);
        return rank(left) - rank(right) || left.localeCompare(right);
      })[0] || '200';
  const response = responses[status] || {};
  const content = response.content || {};
  const mediaType = content['application/json'] ? 'application/json' : Object.keys(content)[0];
  const media = mediaType ? content[mediaType] || {} : {};
  const namedExample = media.examples ? Object.values(media.examples)[0] as Record<string, any> : undefined;
  const body = media.example ?? namedExample?.value ?? createSchemaExample(media.schema, spec);
  const headers = Object.fromEntries(
    Object.entries(response.headers || {}).map(([name, value]: [string, any]) => [
      name,
      value.example ?? createSchemaExample(value.schema, spec),
    ]),
  );
  if (mediaType) headers['Content-Type'] = mediaType;
  return { status, body, headers };
}

export function getApiEndpoints(spec: OpenAPISpec): ParsedEndpoint[] {
  return parseEndpoints(spec);
}

export function getEndpointResponseExample(spec: OpenAPISpec, endpoint: ParsedEndpoint, status?: string) {
  return getResponseExample(spec, endpoint, status);
}

export function buildPostmanAssets(spec: OpenAPISpec): { collection: object; environment: object } {
  const paths = spec.paths || {};
  const items = Object.entries(paths).flatMap(([path, pathItem]) => {
    if (!pathItem || typeof pathItem !== 'object') return [];
    return Object.entries(pathItem as Record<string, any>)
      .filter(([method, operation]) => HTTP_METHODS.has(method.toLowerCase()) && operation)
      .map(([method, operation]) => {
        const parameters = [...(pathItem.parameters || []), ...(operation.parameters || [])];
        const query = parameters
          .filter((parameter: any) => parameter.in === 'query')
          .map((parameter: any) => `${encodeURIComponent(parameter.name)}={{${parameter.name}}}`)
          .join('&');
        const requestPath = path.replace(/\{([^}]+)\}/g, ':$1');
        const rawUrl = `{{baseUrl}}${requestPath}${query ? `?${query}` : ''}`;
        const headers = parameters
          .filter((parameter: any) => parameter.in === 'header')
          .map((parameter: any) => ({
            key: parameter.name,
            value: `{{${parameter.name}}}`,
            type: 'text',
          }));
        const bodySchema = operation.requestBody?.content?.['application/json'];
        if (bodySchema) headers.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
        const request: Record<string, any> = {
          method: method.toUpperCase(),
          header: headers,
          url: { raw: rawUrl, host: ['{{baseUrl}}'], path: requestPath.split('/').filter(Boolean) },
        };
        if (bodySchema) {
          request.body = {
            mode: 'raw',
            raw: JSON.stringify(
              bodySchema.example ?? createSchemaExample(bodySchema.schema, spec),
              null,
              2,
            ),
            options: { raw: { language: 'json' } },
          };
        }
        return {
          name: operation.summary || `${method.toUpperCase()} ${path}`,
          request,
        };
      });
  });
  const serverUrl = (spec.servers?.[0]?.url || '').replace(/\/$/, '');
  return {
    collection: {
      info: {
        name: `${spec.info?.title || 'API'} collection`,
        description: spec.info?.description || 'Generated from the ProxyPay OpenAPI specification.',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: items,
    },
    environment: {
      name: `${spec.info?.title || 'API'} environment`,
      values: [
        { key: 'baseUrl', value: serverUrl, enabled: true, type: 'default' },
        { key: 'apiKey', value: '', enabled: true, type: 'secret' },
      ],
      _postman_variable_scope: 'environment',
      _postman_exported_using: 'ProxyPay API Portal',
    },
  };
}

export function makeCurlCommand(
  endpoint: ParsedEndpoint,
  baseUrl: string,
  headers: Record<string, string>,
  query: Record<string, string>,
  body: string,
): string {
  const path = endpoint.path.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = query[`path:${name}`];
    return value ? encodeURIComponent(value) : `{${name}}`;
  });
  const queryValues = Object.fromEntries(
    Object.entries(query)
      .filter(([key, value]) => key.startsWith('query:') && value)
      .map(([key, value]) => [key.slice('query:'.length), value]),
  );
  const queryString = new URLSearchParams(queryValues).toString();
  const url = `${baseUrl.replace(/\/$/, '')}${path}${queryString ? `?${queryString}` : ''}`;
  const headerArgs = Object.entries(headers)
    .filter(([, value]) => value)
    .map(([name, value]) => `-H '${name}: ${value.replace(/'/g, "'\\''")}'`);
  const bodyArg = body.trim() && !['get', 'head'].includes(endpoint.method.toLowerCase())
    ? ` --data '${body.replace(/'/g, "'\\''")}'`
    : '';
  return `curl -X ${endpoint.method.toUpperCase()} '${url}' ${headerArgs.join(' ')}${bodyArg}`.trim();
}