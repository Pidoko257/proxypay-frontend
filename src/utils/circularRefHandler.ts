const MAX_RECURSION_DEPTH = 5;
const CIRCULAR_PLACEHOLDER_SCHEMA = {
  type: 'object',
  title: 'Circular Reference',
  description:
    'This schema contains a circular reference and has been truncated to prevent infinite recursion.',
  properties: {},
};

interface CircularRefHandlerOptions {
  maxDepth?: number;
}

function resolveRef(
  obj: any,
  root: any,
  refPath: string,
): any {
  if (!refPath.startsWith('#/')) return undefined;
  const parts = refPath.replace(/^#\//, '').split('/');
  let current = root;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

function processSchema(
  schema: any,
  root: any,
  currentRef: string,
  visited: Map<string, number>,
  depth: number,
  maxDepth: number,
): any {
  if (schema === null || schema === undefined || typeof schema !== 'object') {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map((item, idx) => {
      if (item && typeof item === 'object' && '$ref' in item) {
        return processRef(item, root, visited, depth, maxDepth);
      }
      return processSchema(item, root, currentRef, visited, depth, maxDepth);
    });
  }

  if ('$ref' in schema) {
    return processRef(schema, root, visited, depth, maxDepth);
  }

  const result: Record<string, any> = {};
  for (const key of Object.keys(schema)) {
    if (key === 'properties' && typeof schema[key] === 'object') {
      result[key] = {};
      for (const [propName, propSchema] of Object.entries(schema[key])) {
        if (propSchema && typeof propSchema === 'object' && '$ref' in (propSchema as any)) {
          result[key][propName] = processRef(propSchema, root, visited, depth, maxDepth);
        } else {
          result[key][propName] = processSchema(propSchema, root, currentRef, visited, depth, maxDepth);
        }
      }
    } else if (
      ['items', 'additionalProperties', 'not'].includes(key) &&
      typeof schema[key] === 'object' &&
      schema[key] !== null
    ) {
      if ('$ref' in schema[key]) {
        result[key] = processRef(schema[key], root, visited, depth, maxDepth);
      } else {
        result[key] = processSchema(schema[key], root, currentRef, visited, depth, maxDepth);
      }
    } else if (
      ['allOf', 'oneOf', 'anyOf'].includes(key) &&
      Array.isArray(schema[key])
    ) {
      result[key] = schema[key].map((item: any) => {
        if (item && typeof item === 'object' && '$ref' in item) {
          return processRef(item, root, visited, depth, maxDepth);
        }
        return processSchema(item, root, currentRef, visited, depth, maxDepth);
      });
    } else {
      result[key] = processSchema(schema[key], root, currentRef, visited, depth, maxDepth);
    }
  }

  return result;
}

function processRef(
  refObj: { $ref: string },
  root: any,
  visited: Map<string, number>,
  depth: number,
  maxDepth: number,
): any {
  const refPath = refObj.$ref;
  const count = visited.get(refPath) || 0;

  if (count >= maxDepth) {
    return {
      ...CIRCULAR_PLACEHOLDER_SCHEMA,
      description: `Circular reference to \`${refPath}\` detected (depth limit: ${maxDepth}).`,
    };
  }

  visited.set(refPath, count + 1);

  const resolved = resolveRef(root, root, refPath);
  if (resolved === undefined) {
    return {
      type: 'object',
      description: `Could not resolve reference: ${refPath}`,
    };
  }

  const processed = processSchema(resolved, root, refPath, visited, depth + 1, maxDepth);

  visited.set(refPath, count);

  return processed;
}

export function handleCircularRefs(
  spec: any,
  options: CircularRefHandlerOptions = {},
): any {
  const maxDepth = options.maxDepth ?? MAX_RECURSION_DEPTH;
  const visited = new Map<string, number>();

  const processed = JSON.parse(JSON.stringify(spec));

  if (processed.components?.schemas) {
    for (const [name, schema] of Object.entries(processed.components.schemas)) {
      const refPath = `#/components/schemas/${name}`;
      visited.set(refPath, 1);
      (processed.components.schemas as any)[name] = processSchema(
        schema,
        processed,
        refPath,
        visited,
        0,
        maxDepth,
      );
    }
  }

  if (processed.paths) {
    for (const [pathKey, pathObj] of Object.entries(processed.paths)) {
      if (typeof pathObj !== 'object' || pathObj === null) continue;
      for (const [method, operation] of Object.entries(pathObj as any)) {
        if (typeof operation !== 'object' || operation === null) continue;
        (processed.paths as any)[pathKey][method] = processSchema(
          operation,
          processed,
          '',
          visited,
          0,
          maxDepth,
        );
      }
    }
  }

  return processed;
}
