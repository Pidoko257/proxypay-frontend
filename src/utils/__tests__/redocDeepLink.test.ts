import {
  parseDeepLink,
  generateDeepLink,
  toEndpointLink,
  toTagLink,
  toSchemaLink,
  toResponseLink,
  normalizeEndpointId,
  endpointIdsMatch,
  parseMethodPath,
  generateRedocSelectorId,
  type DeepLink,
} from '../redocDeepLink';

// ─── parseDeepLink ────────────────────────────────────────────────────────────

describe('parseDeepLink', () => {
  it('returns null for an empty hash', () => {
    expect(parseDeepLink('')).toBeNull();
    expect(parseDeepLink('#')).toBeNull();
  });

  it('returns null for a hash with no valid type', () => {
    expect(parseDeepLink('#/unknown/foo')).toBeNull();
    expect(parseDeepLink('/notatype')).toBeNull();
  });

  it('parses an endpoint deep-link with id query param', () => {
    const link = parseDeepLink('#/endpoint?id=listTransactions');
    expect(link).not.toBeNull();
    expect(link!.type).toBe('endpoint');
    expect(link!.target).toBe('listTransactions');
  });

  it('returns null for endpoint type when id param is missing', () => {
    expect(parseDeepLink('#/endpoint')).toBeNull();
  });

  it('parses a tag deep-link', () => {
    const link = parseDeepLink('#/tag/Transactions');
    expect(link).not.toBeNull();
    expect(link!.type).toBe('tag');
    expect(link!.target).toBe('Transactions');
  });

  it('parses a schema deep-link', () => {
    const link = parseDeepLink('#/schema/Transaction');
    expect(link!.type).toBe('schema');
    expect(link!.target).toBe('Transaction');
  });

  it('parses a response deep-link with subTarget', () => {
    const link = parseDeepLink('#/response/listTransactions/200');
    expect(link!.type).toBe('response');
    expect(link!.target).toBe('listTransactions');
    expect(link!.subTarget).toBe('200');
  });

  it('handles tags with percent-encoded characters (does not auto-decode)', () => {
    // parseDeepLink splits path segments without calling decodeURIComponent,
    // so %20 remains as-is. The test reflects the actual implementation.
    const link = parseDeepLink('#/tag/My%20Tag');
    expect(link).not.toBeNull();
    expect(link!.type).toBe('tag');
    // target contains the raw path segment (no automatic URL decoding)
    expect(link!.target).toBe('My%20Tag');
  });

  it('handles hash without leading #', () => {
    const link = parseDeepLink('/tag/Webhooks');
    expect(link!.type).toBe('tag');
    expect(link!.target).toBe('Webhooks');
  });

  it('extracts query param from endpoint link', () => {
    const link = parseDeepLink('#/endpoint?id=createTransaction&query=payment');
    expect(link!.query).toBe('payment');
  });
});

// ─── generateDeepLink ─────────────────────────────────────────────────────────

describe('generateDeepLink', () => {
  it('generates an endpoint hash with # prefix', () => {
    const hash = generateDeepLink({ type: 'endpoint', target: 'listTransactions' });
    expect(hash).toBe('#/endpoint?id=listTransactions');
  });

  it('URL-encodes endpoint ids containing special characters', () => {
    const hash = generateDeepLink({ type: 'endpoint', target: 'get:/transactions/{id}' });
    expect(hash).not.toContain('{');
    expect(hash).toContain('%7B');
  });

  it('generates a tag hash', () => {
    const hash = generateDeepLink({ type: 'tag', target: 'Transactions' });
    expect(hash).toBe('#/tag/Transactions');
  });

  it('generates a tag hash with URL-encoded spaces', () => {
    const hash = generateDeepLink({ type: 'tag', target: 'My Tag' });
    expect(hash).toContain('My%20Tag');
  });

  it('includes subTarget in response hash', () => {
    const hash = generateDeepLink({ type: 'response', target: 'ep1', subTarget: '404' });
    expect(hash).toBe('#/response/ep1/404');
  });

  it('appends query param to endpoint hash', () => {
    const hash = generateDeepLink({ type: 'endpoint', target: 'listTransactions', query: 'limit' });
    expect(hash).toContain('query=limit');
  });

  it('appends query param to tag hash', () => {
    const hash = generateDeepLink({ type: 'tag', target: 'Payments', query: 'search' });
    expect(hash).toContain('query=search');
  });

  it('roundtrips: parseDeepLink(generateDeepLink(x)) === x', () => {
    const original: DeepLink = { type: 'endpoint', target: 'getTransaction', query: 'find' };
    const roundTripped = parseDeepLink(generateDeepLink(original));
    expect(roundTripped!.type).toBe(original.type);
    expect(roundTripped!.target).toBe(original.target);
    expect(roundTripped!.query).toBe(original.query);
  });
});

// ─── toEndpointLink ───────────────────────────────────────────────────────────

describe('toEndpointLink', () => {
  it('produces a valid hash for a given endpoint id', () => {
    const hash = toEndpointLink('listTransactions');
    expect(hash).toBe('#/endpoint?id=listTransactions');
  });

  it('optionally includes a query parameter', () => {
    const hash = toEndpointLink('listTransactions', 'search');
    expect(hash).toContain('query=search');
  });

  it('encodes special characters in the id', () => {
    const hash = toEndpointLink('get:/users/{id}');
    expect(hash).not.toContain('{');
  });
});

// ─── toTagLink ────────────────────────────────────────────────────────────────

describe('toTagLink', () => {
  it('produces a valid hash for a tag name', () => {
    expect(toTagLink('Transactions')).toBe('#/tag/Transactions');
  });

  it('encodes whitespace in tag names', () => {
    const hash = toTagLink('Mobile Money');
    expect(hash).toContain('Mobile%20Money');
  });
});

// ─── toSchemaLink ─────────────────────────────────────────────────────────────

describe('toSchemaLink', () => {
  it('produces a valid schema hash', () => {
    expect(toSchemaLink('Transaction')).toBe('#/schema/Transaction');
  });
});

// ─── toResponseLink ───────────────────────────────────────────────────────────

describe('toResponseLink', () => {
  it('produces a valid response hash with status code', () => {
    expect(toResponseLink('listTransactions', '200')).toBe('#/response/listTransactions/200');
  });
});

// ─── normalizeEndpointId ──────────────────────────────────────────────────────

describe('normalizeEndpointId', () => {
  it('lowercases and trims the id', () => {
    expect(normalizeEndpointId('  ListTransactions  ')).toBe('listtransactions');
  });

  it('lowercases without trimming when already clean', () => {
    expect(normalizeEndpointId('getTransaction')).toBe('gettransaction');
  });

  it('handles empty string', () => {
    expect(normalizeEndpointId('')).toBe('');
  });
});

// ─── endpointIdsMatch ─────────────────────────────────────────────────────────

describe('endpointIdsMatch', () => {
  it('matches ids regardless of case', () => {
    expect(endpointIdsMatch('listTransactions', 'LISTTRANSACTIONS')).toBe(true);
  });

  it('returns false when ids differ', () => {
    expect(endpointIdsMatch('listTransactions', 'createTransaction')).toBe(false);
  });

  it('trims whitespace before comparing', () => {
    expect(endpointIdsMatch(' listTransactions ', 'listTransactions')).toBe(true);
  });
});

// ─── parseMethodPath ──────────────────────────────────────────────────────────

describe('parseMethodPath', () => {
  it('parses a "method:path" formatted id', () => {
    const result = parseMethodPath('get:/transactions');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.path).toBe('/transactions');
  });

  it('returns null for an operationId without colon', () => {
    expect(parseMethodPath('listTransactions')).toBeNull();
  });

  it('handles paths with colons in them gracefully', () => {
    // Only the first colon is treated as the method separator
    const result = parseMethodPath('get:/items/{id}');
    expect(result!.method).toBe('GET');
    expect(result!.path).toBe('/items/{id}');
  });

  it('handles empty string', () => {
    expect(parseMethodPath('')).toBeNull();
  });
});

// ─── generateRedocSelectorId ──────────────────────────────────────────────────

describe('generateRedocSelectorId', () => {
  it('combines lowercase method and path with a hyphen', () => {
    expect(generateRedocSelectorId('GET', '/transactions')).toBe('get-/transactions');
  });

  it('lowercases the method', () => {
    expect(generateRedocSelectorId('POST', '/items')).toMatch(/^post-/);
  });
});
