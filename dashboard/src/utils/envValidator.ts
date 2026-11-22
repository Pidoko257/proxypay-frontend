/**
 * Environment variable validation utility.
 *
 * Vite only exposes variables prefixed with `VITE_` to client code via
 * `import.meta.env`. This module validates that all required variables are
 * present and well-formed at startup.
 */

export interface EnvRule {
  name: string;
  required: boolean;
  description: string;
  validate?: (value: string) => boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const ENV_PREFIX = 'VITE_';

const env = import.meta.env as unknown as Record<string, string | undefined>;

function readEnv(name: string): string | undefined {
  const value = env[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export const envRules: EnvRule[] = [
  {
    name: 'VITE_API_BASE_URL',
    required: true,
    description: 'Base URL for the backend API',
    validate: (value) => /^https?:\/\//.test(value),
  },
  {
    name: 'VITE_API_TIMEOUT',
    required: false,
    description: 'Request timeout in milliseconds',
    validate: (value) => !Number.isNaN(Number(value)) && Number(value) > 0,
  },
];

export function validateEnv(rules: EnvRule[] = envRules): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    if (!rule.name.startsWith(ENV_PREFIX)) {
      warnings.push(
        `Environment variable "${rule.name}" does not use the "${ENV_PREFIX}" prefix and will not be exposed by Vite.`,
      );
      continue;
    }

    const value = readEnv(rule.name);

    if (value === undefined) {
      if (rule.required) {
        errors.push(`Missing required environment variable: ${rule.name}`);
      } else {
        warnings.push(`Optional environment variable not set: ${rule.name}`);
      }
      continue;
    }

    if (rule.validate && !rule.validate(value)) {
      errors.push(`Invalid value for environment variable: ${rule.name}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function assertValidEnv(rules: EnvRule[] = envRules): void {
  const result = validateEnv(rules);

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      console.warn(`[env] ${warning}`);
    }
  }

  if (!result.valid) {
    throw new Error(
      `Environment validation failed:\n${result.errors.join('\n')}`,
    );
  }
}
