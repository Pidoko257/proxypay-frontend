import type { OpenAPISpec } from './apiSpecParser';

export type TestFramework = 'jest' | 'vitest';
export type TestOutputFormat = 'ts' | 'js';

interface GeneratedOperation {
  id: string;
  method: string;
  path: string;
  parameters: Array<Record<string, any>>;
  requestBodyRequired: boolean;
  requestBody?: unknown;
  invalidBody?: unknown;
  responseBody: unknown;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

function resolveSchema(
  schema: Record<string, any> | undefined,
  spec: OpenAPISpec,
  seen = new Set<string>(),
): Record<string, any> {
  if (!schema?.$ref || typeof schema.$ref !== 'string') return schema ?? {};
  const prefix = '#/components/schemas/';
  if (!schema.$ref.startsWith(prefix) || seen.has(schema.$ref)) return {};
  const name = schema.$ref.slice(prefix.length);
  const referenced = spec.components?.schemas?.[name];
  if (!referenced || typeof referenced !== 'object') return {};
  seen.add(schema.$ref);
  return resolveSchema(referenced, spec, seen);
}

function mockValue(
  originalSchema: Record<string, any> | undefined,
  spec: OpenAPISpec,
  depth = 0,
): unknown {
  if (depth > 5) return null;
  const schema = resolveSchema(originalSchema, spec);
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];

  if (schema.type === 'object' || schema.properties) {
    return Object.fromEntries(
      Object.entries(schema.properties ?? {}).map(([key, value]) => [
        key,
        mockValue(value as Record<string, any>, spec, depth + 1),
      ]),
    );
  }
  if (schema.type === 'array') return [mockValue(schema.items, spec, depth + 1)];
  if (schema.type === 'integer' || schema.type === 'number') return schema.minimum ?? 1;
  if (schema.type === 'boolean') return true;
  if (schema.format === 'date') return '2026-01-01';
  if (schema.format === 'date-time') return '2026-01-01T00:00:00Z';
  if (schema.type === 'string') return 'example';
  return null;
}

function exampleForContent(
  content: Record<string, any> | undefined,
  spec: OpenAPISpec,
): unknown {
  if (!content) return undefined;
  const mediaType = Object.values(content)[0] as Record<string, any> | undefined;
  if (!mediaType) return undefined;
  if (mediaType.example !== undefined) return mediaType.example;
  return mockValue(mediaType.schema, spec);
}

function collectOperations(spec: OpenAPISpec): GeneratedOperation[] {
  const operations: GeneratedOperation[] = [];
  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, any>)[method];
      if (!operation || typeof operation !== 'object') continue;

      const requestBody = operation.requestBody as Record<string, any> | undefined;
      const requestContent = requestBody?.content;
      const validBody = exampleForContent(requestContent, spec);
      const requestSchema = Object.values(requestContent ?? {})[0] as Record<string, any> | undefined;
      const requiredFields = resolveSchema(requestSchema?.schema, spec).required;
      let invalidBody: unknown = undefined;
      if (validBody && typeof validBody === 'object' && !Array.isArray(validBody)) {
        const incomplete = { ...(validBody as Record<string, unknown>) };
        const missingField = Array.isArray(requiredFields) ? requiredFields[0] : undefined;
        if (missingField) delete incomplete[missingField];
        else if (Object.keys(incomplete).length > 0) delete incomplete[Object.keys(incomplete)[0]];
        invalidBody = incomplete;
      } else if (requestBody) {
        invalidBody = null;
      }

      const successResponse = Object.entries(operation.responses ?? {}).find(([code]) => /^2\d\d$/.test(code))?.[1] as Record<string, any> | undefined;
      const responseBody = exampleForContent(successResponse?.content, spec) ?? {};
      operations.push({
        id: operation.operationId || `${method.toUpperCase()} ${path}`,
        method: method.toUpperCase(),
        path,
        parameters: Array.isArray(operation.parameters) ? operation.parameters : [],
        requestBodyRequired: Boolean(requestBody?.required),
        requestBody: validBody,
        invalidBody,
        responseBody,
      });
    }
  }
  return operations;
}

export function countOpenApiOperations(spec: OpenAPISpec): number {
  return collectOperations(spec).length;
}

function literal(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? 'null';
}

function requestUrl(operation: GeneratedOperation, includeQuery: boolean): string {
  const pathParameters = operation.parameters.filter((parameter) => parameter.in === 'path');
  let path = operation.path.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const parameter = pathParameters.find((candidate) => candidate.name === name);
    return encodeURIComponent(String(parameter?.example ?? parameter?.schema?.example ?? 'example'));
  });
  if (!path.startsWith('/')) path = `/${path}`;
  const url = `const url = new URL(\`${'${BASE_URL}'}${path}\`);`;
  if (!includeQuery) return url;
  const queryParameters = operation.parameters.filter((parameter) => parameter.in === 'query' && parameter.required);
  const query = queryParameters.map((parameter) => {
    const value = parameter.example ?? parameter.schema?.example ?? 'example';
    return `url.searchParams.set(${literal(parameter.name)}, ${literal(String(value))});`;
  });
  return [url, ...query].join('\n');
}

function requestHeaders(operation: GeneratedOperation): Record<string, string> {
  return Object.fromEntries(
    operation.parameters
      .filter((parameter) => parameter.in === 'header' && parameter.required)
      .map((parameter) => [parameter.name, String(parameter.example ?? parameter.schema?.example ?? 'example')]),
  );
}

export function generateOpenApiTestSuite(
  spec: OpenAPISpec,
  framework: TestFramework,
  outputFormat: TestOutputFormat = 'ts',
): string {
  const operations = collectOperations(spec);
  if (operations.length === 0) return '';

  const isVitest = framework === 'vitest';
  const mockFunction = isVitest ? 'vi' : 'jest';
  const fetchMockDeclaration = outputFormat === 'ts'
    ? `const fetchMock: ReturnType<typeof ${mockFunction}.fn> = ${mockFunction}.fn();`
    : `const fetchMock = ${mockFunction}.fn();`;
  const imports = isVitest
    ? "import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';\n"
    : '';
  const suites = operations.map((operation) => {
    const operationLabel = `${operation.method} ${operation.path}`;
    const headers = { Accept: 'application/json', ...requestHeaders(operation) };
    const validOptions = {
      method: operation.method,
      headers: operation.requestBody === undefined ? headers : { ...headers, 'Content-Type': 'application/json' },
      ...(operation.requestBody === undefined ? {} : { body: JSON.stringify(operation.requestBody) }),
    };
    const invalidOptions = {
      method: operation.method,
      headers: operation.invalidBody === undefined ? headers : { ...headers, 'Content-Type': 'application/json' },
      ...(operation.invalidBody === undefined ? {} : { body: JSON.stringify(operation.invalidBody) }),
    };

    return `describe(${literal(operationLabel)}, () => {
  it('sends a valid request using generated mock data', async () => {
    ${requestUrl(operation, true)}
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ${literal(operation.responseBody)} });
    const response = await fetch(url.toString(), ${literal(validOptions)});
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(url.toString(), expect.objectContaining({ method: ${literal(operation.method)} }));
  });

  it('handles a request with missing or invalid required input', async () => {
    ${requestUrl(operation, false)}
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'Invalid request' }) });
    const response = await fetch(url.toString(), ${literal(invalidOptions)});
    expect(response.status).toBe(400);
  });
});`;
  }).join('\n\n');

  return `${imports}const BASE_URL = (process.env.API_BASE_URL || 'http://localhost:3000').replace(/\\/$/, '');
${fetchMockDeclaration}

beforeEach(() => {
  ${mockFunction}.clearAllMocks();
  ${mockFunction}.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  ${mockFunction}.unstubAllGlobals();
});

${suites}
`;
}

export function generateOpenApiTestManifest(spec: OpenAPISpec): string {
  const operations = collectOperations(spec).map((operation) => ({
    id: operation.id,
    method: operation.method,
    path: operation.path,
    positiveCase: {
      requestBody: operation.requestBody,
      responseBody: operation.responseBody,
    },
    negativeCase: {
      requestBody: operation.invalidBody,
      expectedStatus: 400,
    },
  }));
  return JSON.stringify({ format: 'proxypay-openapi-test-cases', version: 1, operations }, null, 2);
}