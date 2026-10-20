import yaml from 'js-yaml';

export interface SecurityScheme {
  type: string;
  description?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: Record<string, unknown>;
  openIdConnectUrl?: string;
}

export interface SecurityRequirement {
  [schemeName: string]: string[];
}

export interface ParsedSecurity {
  schemes: Record<string, SecurityScheme>;
  globalRequirements: SecurityRequirement[];
}

export class ExternalReferenceError extends Error {
  readonly reference: string;

  constructor(reference: string) {
    super(
      `Unsupported external OpenAPI reference: "${reference}". ` +
        'Only local references (starting with "#/") can be resolved; ' +
        'inline the referenced content or bundle the spec before loading it.',
    );
    this.name = 'ExternalReferenceError';
    this.reference = reference;
  }
}

function isExternalRef(ref: unknown): ref is string {
  return typeof ref === 'string' && ref.length > 0 && !ref.startsWith('#/');
}

/**
 * Walks the parsed spec and throws on the first external `$ref` encountered,
 * so callers never render partially resolved content as if it were complete.
 */
export function assertNoExternalRefs(node: unknown, seen: Set<unknown> = new Set()): void {
  if (node === null || typeof node !== 'object') {
    return;
  }
  if (seen.has(node)) {
    return;
  }
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) {
      assertNoExternalRefs(item, seen);
    }
    return;
  }

  const record = node as Record<string, unknown>;
  if (isExternalRef(record.$ref)) {
    throw new ExternalReferenceError(record.$ref);
  }

  for (const value of Object.values(record)) {
    assertNoExternalRefs(value, seen);
  }
}

function resolveLocalRef(spec: unknown, ref: string): unknown {
  const segments = ref
    .slice(2)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));

  let current: unknown = spec;
  for (const segment of segments) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function resolveSecurityScheme(spec: unknown, scheme: unknown): SecurityScheme | undefined {
  if (scheme === null || typeof scheme !== 'object') {
    return undefined;
  }
  const record = scheme as Record<string, unknown>;
  if (isExternalRef(record.$ref)) {
    throw new ExternalReferenceError(record.$ref);
  }
  if (typeof record.$ref === 'string') {
    const resolved = resolveLocalRef(spec, record.$ref);
    if (resolved === null || typeof resolved !== 'object') {
      return undefined;
    }
    return resolved as SecurityScheme;
  }
  return record as SecurityScheme;
}

export function parseSecuritySchemes(specText: string): ParsedSecurity {
  const spec = yaml.load(specText);

  if (spec === null || typeof spec !== 'object') {
    return { schemes: {}, globalRequirements: [] };
  }

  assertNoExternalRefs(spec);

  const record = spec as Record<string, unknown>;
  const components = record.components;
  const rawSchemes =
    components !== null && typeof components === 'object'
      ? (components as Record<string, unknown>).securitySchemes
      : undefined;

  const schemes: Record<string, SecurityScheme> = {};
  if (rawSchemes !== null && typeof rawSchemes === 'object') {
    for (const [name, scheme] of Object.entries(rawSchemes as Record<string, unknown>)) {
      const resolved = resolveSecurityScheme(spec, scheme);
      if (resolved) {
        schemes[name] = resolved;
      }
    }
  }

  const globalRequirements: SecurityRequirement[] = Array.isArray(record.security)
    ? (record.security as SecurityRequirement[])
    : [];

  return { schemes, globalRequirements };
}
