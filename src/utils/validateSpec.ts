import jsYaml from 'js-yaml';
import OpenAPIParser from '@readme/openapi-parser';

export interface ValidationError {
  message: string;
  path?: string;
  line?: number;
  suggestion: string;
}

export interface SpecValidationResult {
  valid: boolean;
  spec?: Record<string, unknown>;
  errors: ValidationError[];
}

function extractLineFromMessage(message: string): number | undefined {
  const arrowMatch = message.match(/^> (\d+) \|/m);
  if (arrowMatch) {
    return parseInt(arrowMatch[1], 10);
  }
  return undefined;
}

function extractPathFromMessage(message: string): string | undefined {
  const pathMatch = message.match(/"([^"]+)"/);
  if (pathMatch) {
    return pathMatch[1];
  }
  return undefined;
}

function generateSuggestion(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("required property 'title'")) {
    return 'Add a "title" field inside the "info" object. Example: info: { title: "My API", version: "1.0.0" }';
  }
  if (lower.includes("required property 'version'")) {
    return 'Add a "version" field inside the "info" object. Example: info: { title: "My API", version: "1.0.0" }';
  }
  if (lower.includes("must match a schema in 'anyof'")) {
    return 'Ensure the field value matches one of the allowed schemas. Check the OpenAPI 3.0 specification for valid formats.';
  }
  if (lower.includes('minproperties') || lower.includes('fewer than')) {
    return 'The object has too few properties. Add the required fields or remove the empty object.';
  }
  if (lower.includes('maxproperties') || lower.includes('more than')) {
    return 'The object has too many properties. Remove extra fields.';
  }
  if (lower.includes('must be equal to one of the allowed values')) {
    return 'Check the allowed values for this field in the OpenAPI 3.0 specification.';
  }
  if (lower.includes('invalid type')) {
    return 'The value has an incorrect type. Verify the expected type in the OpenAPI 3.0 spec and correct it.';
  }
  if (lower.includes('must match pattern')) {
    return 'The value does not match the expected pattern. Verify the format against the OpenAPI 3.0 specification.';
  }
  if (lower.includes('additional property') && lower.includes('not allowed')) {
    return 'An unexpected property was found. Remove the extra property or check the OpenAPI 3.0 spec for valid properties.';
  }
  if (lower.includes('must have required property')) {
    const propMatch = message.match(/required property '(\w+)'/);
    const prop = propMatch ? propMatch[1] : 'a required field';
    return `Add the missing required property "${prop}" to this object.`;
  }

  return 'Review the OpenAPI 3.0 specification for this section and correct the syntax or values.';
}

function parseYamlSpec(raw: string): Record<string, unknown> {
  return jsYaml.load(raw) as Record<string, unknown>;
}

export async function validateSpec(rawSpec: string): Promise<SpecValidationResult> {
  let spec: Record<string, unknown>;

  try {
    spec = parseYamlSpec(rawSpec);
  } catch (err) {
    const yamlErr = err as { mark?: { line?: number; column?: number }; message?: string };
    return {
      valid: false,
      errors: [
        {
          message: yamlErr.message || 'Failed to parse YAML',
          line: yamlErr.mark?.line !== undefined ? yamlErr.mark.line + 1 : undefined,
          suggestion:
            'Check the YAML syntax. Ensure proper indentation and valid YAML structure. You can validate your YAML at https://yamlvalidator.com/.',
        },
      ],
    };
  }

  if (typeof spec !== 'object' || spec === null) {
    return {
      valid: false,
      errors: [
        {
          message: 'Parsed YAML is not a valid object',
          suggestion:
            'The YAML file should define an OpenAPI object with "openapi", "info", and "paths" keys.',
        },
      ],
    };
  }

  try {
    const result = await OpenAPIParser.validate(structuredClone(spec) as any);

    if (result.valid) {
      return { valid: true, spec, errors: [] };
    }

    const errors: ValidationError[] = (result.errors || []).map(
      (err: { message: string; path?: string }) => ({
        message: err.message,
        path: err.path,
        line: extractLineFromMessage(err.message),
        suggestion: generateSuggestion(err.message),
      })
    );

    return { valid: false, errors };
  } catch (err) {
    const parseErr = err as { message?: string };
    return {
      valid: false,
      errors: [
        {
          message: parseErr.message || 'Unknown validation error',
          suggestion:
            'An unexpected error occurred during validation. Ensure the spec is valid OpenAPI 3.0.',
        },
      ],
    };
  }
}
