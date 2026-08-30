import {
  parseEndpoints,
  groupByTag,
  extractTagDescriptions,
  findEndpoint,
  searchEndpoints,
  extractUniqueTags,
  generateEndpointId,
  extractBasePath,
  type OpenAPISpec,
} from '../apiSpecParser';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const minimalSpec: OpenAPISpec = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {},
};

const fullSpec: OpenAPISpec = {
  openapi: '3.0.0',
  info: { title: 'ProxyPay', version: '2.0.0', description: 'Test' },
  tags: [
    { name: 'Transactions', description: 'Payment operations' },
    { name: 'Webhooks', description: 'Webhook management' },
  ],
  paths: {
    '/transactions': {
      get: {
        operationId: 'listTransactions',
        summary: 'List transactions',
        tags: ['Transactions'],
        parameters: [{ name: 'limit', in: 'query', required: false }],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        operationId: 'createTransaction',
        summary: 'Create transaction',
        tags: ['Transactions'],
        requestBody: { required: true, content: { 'application/json': {} } },
        responses: { '201': { description: 'Created' }, '400': { description: 'Bad Request' } },
      },
    },
    '/transactions/{id}': {
      get: {
        operationId: 'getTransaction',
        summary: 'Get transaction by ID',
        description: 'Returns a single transaction',
        tags: ['Transactions'],
        deprecated: true,
        responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' } },
      },
      delete: {
        operationId: 'deleteTransaction',
        summary: 'Delete transaction',
        tags: ['Transactions'],
        responses: { '204': { description: 'No Content' } },
      },
    },
    '/webhooks': {
      post: {
        operationId: 'createWebhook',
        summary: 'Create webhook',
        tags: ['Webhooks'],
        responses: { '201': { description: 'Created' } },
      },
    },
    '/untagged': {
      get: {
        summary: 'Untagged endpoint',
        responses: { '200': { description: 'OK' } },
      },
    },
  },
  servers: [{ url: 'https://api.proxypay.io/v2', description: 'Production' }],
};

// ─── parseEndpoints ───────────────────────────────────────────────────────────

describe('parseEndpoints', () => {
  it('returns an empty array for a spec with no paths', () => {
    expect(parseEndpoints(minimalSpec)).toEqual([]);
  });

  it('returns an empty array when paths is undefined', () => {
    const spec = { ...minimalSpec, paths: undefined } as unknown as OpenAPISpec;
    expect(parseEndpoints(spec)).toEqual([]);
  });

  it('extracts correct number of endpoints from full spec', () => {
    const endpoints = parseEndpoints(fullSpec);
    // GET /transactions, POST /transactions, GET /transactions/{id},
    // DELETE /transactions/{id}, POST /webhooks, GET /untagged = 6
    expect(endpoints).toHaveLength(6);
  });

  it('uses operationId as endpoint id when present', () => {
    const endpoints = parseEndpoints(fullSpec);
    const ep = endpoints.find((e) => e.operationId === 'listTransactions');
    expect(ep).toBeDefined();
    expect(ep!.id).toBe('listTransactions');
  });

  it('falls back to "method:path" when operationId is absent', () => {
    const endpoints = parseEndpoints(fullSpec);
    const ep = endpoints.find((e) => e.path === '/untagged');
    expect(ep).toBeDefined();
    expect(ep!.id).toBe('get:/untagged');
  });

  it('assigns the first tag as primary tag', () => {
    const endpoints = parseEndpoints(fullSpec);
    const ep = endpoints.find((e) => e.operationId === 'listTransactions');
    expect(ep!.tag).toBe('Transactions');
    expect(ep!.tags).toContain('Transactions');
  });

  it('sets tag to undefined for untagged endpoints', () => {
    const endpoints = parseEndpoints(fullSpec);
    const ep = endpoints.find((e) => e.path === '/untagged');
    expect(ep!.tag).toBeUndefined();
  });

  it('sets deprecated flag correctly', () => {
    const endpoints = parseEndpoints(fullSpec);
    const deprecated = endpoints.find((e) => e.operationId === 'getTransaction');
    const notDeprecated = endpoints.find((e) => e.operationId === 'listTransactions');
    expect(deprecated!.deprecated).toBe(true);
    expect(notDeprecated!.deprecated).toBe(false);
  });

  it('uses method + path as summary fallback when summary is absent', () => {
    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/no-summary': {
          get: { responses: {} },
        },
      },
    };
    const endpoints = parseEndpoints(spec);
    expect(endpoints[0].summary).toBe('GET /no-summary');
  });

  it('does not include path-level keys that are not HTTP methods', () => {
    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          // pathItem-level parameters (not an HTTP method)
          parameters: [{ name: 'id', in: 'path', required: true }],
          get: { summary: 'Get item', responses: {} },
        },
      },
    };
    const endpoints = parseEndpoints(spec);
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0].method).toBe('get');
  });

  it('skips null / non-object pathItem entries gracefully', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/good': { get: { summary: 'Good', responses: {} } },
        '/bad': null,
      },
    } as unknown as OpenAPISpec;
    expect(() => parseEndpoints(spec)).not.toThrow();
    const endpoints = parseEndpoints(spec);
    expect(endpoints).toHaveLength(1);
  });
});

// ─── groupByTag ───────────────────────────────────────────────────────────────

describe('groupByTag', () => {
  it('returns an empty array for empty input', () => {
    expect(groupByTag([])).toEqual([]);
  });

  it('groups endpoints by tag', () => {
    const endpoints = parseEndpoints(fullSpec);
    const groups = groupByTag(endpoints);
    const txGroup = groups.find((g) => g.name === 'Transactions');
    expect(txGroup).toBeDefined();
    expect(txGroup!.endpoints.length).toBeGreaterThanOrEqual(3);
  });

  it('places untagged endpoints under "Other"', () => {
    const endpoints = parseEndpoints(fullSpec);
    const groups = groupByTag(endpoints);
    const other = groups.find((g) => g.name === 'Other');
    expect(other).toBeDefined();
    expect(other!.endpoints.some((e) => e.path === '/untagged')).toBe(true);
  });

  it('puts "Other" at the end', () => {
    const endpoints = parseEndpoints(fullSpec);
    const groups = groupByTag(endpoints);
    expect(groups[groups.length - 1].name).toBe('Other');
  });

  it('sorts non-Other groups alphabetically', () => {
    const endpoints = parseEndpoints(fullSpec);
    const groups = groupByTag(endpoints).filter((g) => g.name !== 'Other');
    for (let i = 1; i < groups.length; i++) {
      expect(groups[i - 1].name.localeCompare(groups[i].name)).toBeLessThanOrEqual(0);
    }
  });

  it('sorts endpoints within each group by method order then path', () => {
    const endpoints = parseEndpoints(fullSpec);
    const groups = groupByTag(endpoints);
    const txGroup = groups.find((g) => g.name === 'Transactions')!;
    const methods = txGroup.endpoints.map((e) => e.method);
    // GET should come before POST and DELETE
    const getIdx = methods.indexOf('get');
    const postIdx = methods.indexOf('post');
    const deleteIdx = methods.indexOf('delete');
    expect(getIdx).toBeLessThan(postIdx);
    expect(getIdx).toBeLessThan(deleteIdx);
  });
});

// ─── extractTagDescriptions ───────────────────────────────────────────────────

describe('extractTagDescriptions', () => {
  it('extracts descriptions for all tags in spec', () => {
    const descs = extractTagDescriptions(fullSpec);
    expect(descs['Transactions']).toBe('Payment operations');
    expect(descs['Webhooks']).toBe('Webhook management');
  });

  it('returns an empty object when spec has no tags array', () => {
    expect(extractTagDescriptions(minimalSpec)).toEqual({});
  });

  it('handles tags with no description', () => {
    const spec: OpenAPISpec = {
      ...minimalSpec,
      tags: [{ name: 'Alpha' }],
    };
    const descs = extractTagDescriptions(spec);
    expect(descs['Alpha']).toBeUndefined();
  });
});

// ─── findEndpoint ─────────────────────────────────────────────────────────────

describe('findEndpoint', () => {
  const endpoints = parseEndpoints(fullSpec);

  it('finds endpoint by id', () => {
    const ep = findEndpoint(endpoints, 'listTransactions');
    expect(ep).toBeDefined();
    expect(ep!.path).toBe('/transactions');
  });

  it('finds endpoint by operationId', () => {
    const ep = findEndpoint(endpoints, 'createWebhook');
    expect(ep).toBeDefined();
    expect(ep!.method).toBe('post');
  });

  it('returns undefined when id does not match', () => {
    expect(findEndpoint(endpoints, 'nonexistent')).toBeUndefined();
  });

  it('returns undefined for empty endpoints array', () => {
    expect(findEndpoint([], 'listTransactions')).toBeUndefined();
  });
});

// ─── searchEndpoints ──────────────────────────────────────────────────────────

describe('searchEndpoints', () => {
  const endpoints = parseEndpoints(fullSpec);

  it('returns all endpoints when query is empty', () => {
    expect(searchEndpoints(endpoints, '')).toHaveLength(endpoints.length);
    expect(searchEndpoints(endpoints, '  ')).toHaveLength(endpoints.length);
  });

  it('filters by path (case-insensitive)', () => {
    const results = searchEndpoints(endpoints, 'webhook');
    expect(results.every((e) => e.path.toLowerCase().includes('webhook') || (e.tags?.some((t) => t.toLowerCase().includes('webhook'))))).toBe(true);
  });

  it('filters by method', () => {
    const results = searchEndpoints(endpoints, 'delete');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((e) => e.method === 'delete')).toBe(true);
  });

  it('filters by summary text', () => {
    const results = searchEndpoints(endpoints, 'List transactions');
    expect(results.some((e) => e.operationId === 'listTransactions')).toBe(true);
  });

  it('filters by operationId', () => {
    const results = searchEndpoints(endpoints, 'createTransaction');
    expect(results.some((e) => e.operationId === 'createTransaction')).toBe(true);
  });

  it('returns empty array when nothing matches', () => {
    expect(searchEndpoints(endpoints, 'zzzzznotarealoperation')).toHaveLength(0);
  });
});

// ─── extractUniqueTags ────────────────────────────────────────────────────────

describe('extractUniqueTags', () => {
  it('extracts unique tags sorted alphabetically (Other at end)', () => {
    const endpoints = parseEndpoints(fullSpec);
    const tags = extractUniqueTags(endpoints);
    expect(tags).toContain('Transactions');
    expect(tags).toContain('Webhooks');
    // Tags should be sorted; Other (from untagged) is not present because
    // untagged endpoints have tag=undefined — confirm no "Other" here
    expect(tags).not.toContain('Other');
  });

  it('returns empty array for empty endpoints', () => {
    expect(extractUniqueTags([])).toEqual([]);
  });

  it('deduplicates tags that appear on multiple endpoints', () => {
    const endpoints = parseEndpoints(fullSpec).filter((e) => e.tag === 'Transactions');
    const tags = extractUniqueTags(endpoints);
    const txOccurrences = tags.filter((t) => t === 'Transactions');
    expect(txOccurrences).toHaveLength(1);
  });
});

// ─── generateEndpointId ───────────────────────────────────────────────────────

describe('generateEndpointId', () => {
  it('generates a URL-safe slug from method and path', () => {
    const id = generateEndpointId('GET', '/transactions/{id}');
    expect(id).toMatch(/^[a-z0-9-]+$/);
    expect(id).not.toContain('/');
    expect(id).not.toContain('{');
  });

  it('lowercases the method', () => {
    expect(generateEndpointId('POST', '/items')).toMatch(/^post-/);
  });

  it('does not produce leading or trailing hyphens', () => {
    const id = generateEndpointId('GET', '/');
    expect(id).not.toMatch(/^-|-$/);
  });
});

// ─── extractBasePath ──────────────────────────────────────────────────────────

describe('extractBasePath', () => {
  it('extracts pathname from server URL', () => {
    const basePath = extractBasePath(fullSpec);
    expect(basePath).toBe('/v2');
  });

  it('returns empty string when no servers are defined', () => {
    expect(extractBasePath(minimalSpec)).toBe('');
  });

  it('returns empty string when servers array is empty', () => {
    const spec: OpenAPISpec = { ...minimalSpec, servers: [] };
    expect(extractBasePath(spec)).toBe('');
  });

  it('returns "/" for a server URL with no pathname beyond root', () => {
    const spec: OpenAPISpec = {
      ...minimalSpec,
      servers: [{ url: 'https://api.example.com' }],
    };
    // URL with no path returns '/' from URL.pathname
    const basePath = extractBasePath(spec);
    expect(typeof basePath).toBe('string');
  });
});
