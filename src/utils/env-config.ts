/**
 * Environment Configuration Utility
 * Loads and validates environment variables at runtime
 * Supports both Node.js and browser environments
 */

/**
 * Environment variable schema definition
 */
export interface EnvVarSchema {
  name: string;
  defaultValue?: string | number | boolean;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'url';
  description?: string;
}

/**
 * Loaded and validated environment configuration
 */
export interface EnvConfig {
  // Deployment
  baseUrl: string;
  githubOrg: string;
  githubRepo: string;
  deploymentBranch: string;

  // API endpoints
  apiBaseUrl: string;
  openapiSpecUrl: string;

  // Feature flags
  demoMode: boolean;
  enableLoadTesting: boolean;
  enableAnalytics: boolean;
  enableRequestHistory: boolean;

  // Runtime
  nodeEnv: 'development' | 'staging' | 'production';
  verboseLogging: boolean;
  apiTimeout: number;

  // Load testing
  defaultLoadProfile: string;
  loadTestOutputDir: string;
  loadTestGenerateGraphs: boolean;

  // Analytics
  analyticsEndpoint?: string;
  analyticsKey?: string;

  // Security
  authToken?: string;
  allowedOrigins?: string[];

  // Docusaurus
  docusaurusBaseUrl: string;
  docusaurusTrailingSlash: boolean;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  structuredLogging: boolean;
}

/**
 * Environment variable schema
 */
const ENV_SCHEMA: EnvVarSchema[] = [
  {
    name: 'NEXT_PUBLIC_BASE_URL',
    type: 'url',
    defaultValue: 'http://localhost:3001',
    description: 'Base URL for the documentation portal',
  },
  {
    name: 'NEXT_PUBLIC_GITHUB_ORG',
    type: 'string',
    defaultValue: 'Pidoko257',
    description: 'GitHub organization for deployment',
  },
  {
    name: 'NEXT_PUBLIC_GITHUB_REPO',
    type: 'string',
    defaultValue: 'proxypay-frontend',
    description: 'GitHub repository name for deployment',
  },
  {
    name: 'NEXT_PUBLIC_DEPLOYMENT_BRANCH',
    type: 'string',
    defaultValue: 'gh-pages',
    description: 'GitHub Pages deployment branch',
  },
  {
    name: 'NEXT_PUBLIC_API_BASE_URL',
    type: 'url',
    defaultValue: 'http://localhost:3000',
    description: 'Backend API base URL',
  },
  {
    name: 'NEXT_PUBLIC_OPENAPI_SPEC_URL',
    type: 'string',
    defaultValue: '/openapi.yaml',
    description: 'OpenAPI specification URL',
  },
  {
    name: 'NEXT_PUBLIC_DEMO_MODE',
    type: 'boolean',
    defaultValue: false,
    description: 'Enable demo mode',
  },
  {
    name: 'NEXT_PUBLIC_ENABLE_LOAD_TESTING',
    type: 'boolean',
    defaultValue: true,
    description: 'Enable load testing features',
  },
  {
    name: 'NEXT_PUBLIC_ENABLE_ANALYTICS',
    type: 'boolean',
    defaultValue: true,
    description: 'Enable analytics dashboard',
  },
  {
    name: 'NEXT_PUBLIC_ENABLE_REQUEST_HISTORY',
    type: 'boolean',
    defaultValue: true,
    description: 'Enable request history logging',
  },
  {
    name: 'NODE_ENV',
    type: 'string',
    defaultValue: 'development',
    description: 'Runtime environment',
  },
  {
    name: 'NEXT_PUBLIC_VERBOSE_LOGGING',
    type: 'boolean',
    defaultValue: false,
    description: 'Enable verbose logging',
  },
  {
    name: 'NEXT_PUBLIC_API_TIMEOUT',
    type: 'number',
    defaultValue: 30000,
    description: 'API request timeout in milliseconds',
  },
  {
    name: 'NEXT_PUBLIC_DEFAULT_LOAD_PROFILE',
    type: 'string',
    defaultValue: 'normal-load',
    description: 'Default load testing profile',
  },
  {
    name: 'NEXT_PUBLIC_LOAD_TEST_OUTPUT_DIR',
    type: 'string',
    defaultValue: './load-test-results',
    description: 'Load testing output directory',
  },
  {
    name: 'NEXT_PUBLIC_LOAD_TEST_GENERATE_GRAPHS',
    type: 'boolean',
    defaultValue: true,
    description: 'Generate graphs in load test reports',
  },
  {
    name: 'NEXT_PUBLIC_ANALYTICS_ENDPOINT',
    type: 'url',
    description: 'Analytics service endpoint (optional)',
  },
  {
    name: 'NEXT_PUBLIC_ANALYTICS_KEY',
    type: 'string',
    description: 'Analytics service API key (optional)',
  },
  {
    name: 'NEXT_PUBLIC_AUTH_TOKEN',
    type: 'string',
    description: 'Bearer token for authenticated requests',
  },
  {
    name: 'NEXT_PUBLIC_ALLOWED_ORIGINS',
    type: 'string',
    description: 'CORS allowed origins (comma-separated)',
  },
  {
    name: 'NEXT_PUBLIC_DOCUSAURUS_BASE_URL',
    type: 'string',
    defaultValue: '/proxypay-frontend/',
    description: 'Docusaurus base URL path',
  },
  {
    name: 'NEXT_PUBLIC_DOCUSAURUS_TRAILING_SLASH',
    type: 'boolean',
    defaultValue: false,
    description: 'Docusaurus trailing slash behavior',
  },
  {
    name: 'NEXT_PUBLIC_LOG_LEVEL',
    type: 'string',
    defaultValue: 'info',
    description: 'Log level (debug, info, warn, error)',
  },
  {
    name: 'NEXT_PUBLIC_STRUCTURED_LOGGING',
    type: 'boolean',
    defaultValue: false,
    description: 'Enable structured logging (JSON format)',
  },
];

/**
 * Parse environment variable value to specified type
 */
function parseEnvValue(value: string | undefined, type?: string): any {
  if (value === undefined || value === '') {
    return undefined;
  }

  switch (type) {
    case 'boolean':
      return value.toLowerCase() === 'true' || value === '1' || value === 'yes';
    case 'number':
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    case 'url':
      try {
        // Validate URL if it doesn't start with /
        if (!value.startsWith('/')) {
          new URL(value);
        }
        return value;
      } catch {
        throw new Error(`Invalid URL: ${value}`);
      }
    case 'string':
    default:
      return value;
  }
}

/**
 * Validate environment configuration
 */
function validateEnvConfig(values: Record<string, any>, schema: EnvVarSchema[]): string[] {
  const errors: string[] = [];

  for (const schemaItem of schema) {
    const value = values[schemaItem.name];

    // Check required
    if (schemaItem.required && (value === undefined || value === '')) {
      errors.push(`Missing required environment variable: ${schemaItem.name}`);
      continue;
    }

    // Validate type
    if (value !== undefined && schemaItem.type) {
      try {
        parseEnvValue(value as string, schemaItem.type);
      } catch (error) {
        errors.push(
          `Invalid ${schemaItem.type} for ${schemaItem.name}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  return errors;
}

/**
 * Get environment variable value
 * Supports both process.env and globalThis.ENV (for browser)
 */
function getEnvValue(name: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }

  // Browser environment
  if (typeof globalThis !== 'undefined') {
    const envObj = (globalThis as any).ENV || (globalThis as any).__ENV__;
    return envObj?.[name];
  }

  return undefined;
}

/**
 * Load and validate environment configuration
 */
export function loadEnvConfig(
  throwOnError: boolean = true,
): { config: EnvConfig; errors: string[] } {
  const rawEnv: Record<string, string | undefined> = {};

  // Load all schema variables
  for (const schema of ENV_SCHEMA) {
    const value = getEnvValue(schema.name);
    if (value !== undefined) {
      rawEnv[schema.name] = value;
    } else if (schema.defaultValue !== undefined) {
      rawEnv[schema.name] = String(schema.defaultValue);
    }
  }

  // Validate
  const errors = validateEnvConfig(rawEnv, ENV_SCHEMA);

  if (errors.length > 0 && throwOnError) {
    console.error('Environment configuration errors:', errors);
    throw new Error(`Invalid environment configuration: ${errors.join('; ')}`);
  }

  // Parse values
  const config: EnvConfig = {
    baseUrl: parseEnvValue(rawEnv.NEXT_PUBLIC_BASE_URL, 'url') || 'http://localhost:3001',
    githubOrg: parseEnvValue(rawEnv.NEXT_PUBLIC_GITHUB_ORG, 'string') || 'Pidoko257',
    githubRepo: parseEnvValue(rawEnv.NEXT_PUBLIC_GITHUB_REPO, 'string') || 'proxypay-frontend',
    deploymentBranch: parseEnvValue(rawEnv.NEXT_PUBLIC_DEPLOYMENT_BRANCH, 'string') || 'gh-pages',
    apiBaseUrl: parseEnvValue(rawEnv.NEXT_PUBLIC_API_BASE_URL, 'url') || 'http://localhost:3000',
    openapiSpecUrl: parseEnvValue(rawEnv.NEXT_PUBLIC_OPENAPI_SPEC_URL, 'string') || '/openapi.yaml',
    demoMode: parseEnvValue(rawEnv.NEXT_PUBLIC_DEMO_MODE, 'boolean') || false,
    enableLoadTesting: parseEnvValue(rawEnv.NEXT_PUBLIC_ENABLE_LOAD_TESTING, 'boolean') ?? true,
    enableAnalytics: parseEnvValue(rawEnv.NEXT_PUBLIC_ENABLE_ANALYTICS, 'boolean') ?? true,
    enableRequestHistory: parseEnvValue(rawEnv.NEXT_PUBLIC_ENABLE_REQUEST_HISTORY, 'boolean') ?? true,
    nodeEnv: (parseEnvValue(rawEnv.NODE_ENV, 'string') || 'development') as any,
    verboseLogging: parseEnvValue(rawEnv.NEXT_PUBLIC_VERBOSE_LOGGING, 'boolean') || false,
    apiTimeout: parseEnvValue(rawEnv.NEXT_PUBLIC_API_TIMEOUT, 'number') || 30000,
    defaultLoadProfile: parseEnvValue(rawEnv.NEXT_PUBLIC_DEFAULT_LOAD_PROFILE, 'string') || 'normal-load',
    loadTestOutputDir: parseEnvValue(rawEnv.NEXT_PUBLIC_LOAD_TEST_OUTPUT_DIR, 'string') || './load-test-results',
    loadTestGenerateGraphs: parseEnvValue(rawEnv.NEXT_PUBLIC_LOAD_TEST_GENERATE_GRAPHS, 'boolean') ?? true,
    analyticsEndpoint: parseEnvValue(rawEnv.NEXT_PUBLIC_ANALYTICS_ENDPOINT, 'url'),
    analyticsKey: parseEnvValue(rawEnv.NEXT_PUBLIC_ANALYTICS_KEY, 'string'),
    authToken: parseEnvValue(rawEnv.NEXT_PUBLIC_AUTH_TOKEN, 'string'),
    allowedOrigins: parseEnvValue(rawEnv.NEXT_PUBLIC_ALLOWED_ORIGINS, 'string')
      ?.split(',')
      .map((s: string) => s.trim())
      .filter(Boolean),
    docusaurusBaseUrl: parseEnvValue(rawEnv.NEXT_PUBLIC_DOCUSAURUS_BASE_URL, 'string') || '/proxypay-frontend/',
    docusaurusTrailingSlash: parseEnvValue(rawEnv.NEXT_PUBLIC_DOCUSAURUS_TRAILING_SLASH, 'boolean') || false,
    logLevel: (parseEnvValue(rawEnv.NEXT_PUBLIC_LOG_LEVEL, 'string') || 'info') as any,
    structuredLogging: parseEnvValue(rawEnv.NEXT_PUBLIC_STRUCTURED_LOGGING, 'boolean') || false,
  };

  return { config, errors };
}

/**
 * Get environment variable schema
 */
export function getEnvSchema(): EnvVarSchema[] {
  return ENV_SCHEMA;
}

/**
 * Export loaded config as singleton
 */
export const envConfig = (() => {
  try {
    const { config } = loadEnvConfig(false);
    return config;
  } catch {
    // Return defaults if loading fails
    return loadEnvConfig(false).config;
  }
})();
