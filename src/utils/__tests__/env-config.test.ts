/**
 * Environment Configuration Tests
 */

import { loadEnvConfig, getEnvSchema, type EnvConfig } from '../env-config';

describe('env-config', () => {
  // Store original env
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore env
    process.env = originalEnv;
  });

  describe('loadEnvConfig', () => {
    it('should load default values', () => {
      const { config, errors } = loadEnvConfig(false);

      expect(errors).toHaveLength(0);
      expect(config.baseUrl).toBe('http://localhost:3001');
      expect(config.apiBaseUrl).toBe('http://localhost:3000');
      expect(config.nodeEnv).toBe('development');
    });

    it('should load environment variables', () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';
      process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com';
      process.env.NODE_ENV = 'production';

      const { config, errors } = loadEnvConfig(false);

      expect(errors).toHaveLength(0);
      expect(config.baseUrl).toBe('https://example.com');
      expect(config.apiBaseUrl).toBe('https://api.example.com');
      expect(config.nodeEnv).toBe('production');
    });

    it('should parse boolean values', () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
      process.env.NEXT_PUBLIC_ENABLE_LOAD_TESTING = 'false';
      process.env.NEXT_PUBLIC_VERBOSE_LOGGING = 'yes';

      const { config, errors } = loadEnvConfig(false);

      expect(errors).toHaveLength(0);
      expect(config.demoMode).toBe(true);
      expect(config.enableLoadTesting).toBe(false);
      expect(config.verboseLogging).toBe(true);
    });

    it('should parse number values', () => {
      process.env.NEXT_PUBLIC_API_TIMEOUT = '60000';

      const { config, errors } = loadEnvConfig(false);

      expect(errors).toHaveLength(0);
      expect(config.apiTimeout).toBe(60000);
      expect(typeof config.apiTimeout).toBe('number');
    });

    it('should parse comma-separated origins', () => {
      process.env.NEXT_PUBLIC_ALLOWED_ORIGINS = 'https://example.com, https://api.example.com, http://localhost:3000';

      const { config, errors } = loadEnvConfig(false);

      expect(errors).toHaveLength(0);
      expect(config.allowedOrigins).toEqual([
        'https://example.com',
        'https://api.example.com',
        'http://localhost:3000',
      ]);
    });

    it('should validate URL format', () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = 'not a valid url';

      const { config, errors } = loadEnvConfig(false);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid url');
    });

    it('should handle empty values as undefined', () => {
      process.env.NEXT_PUBLIC_AUTH_TOKEN = '';
      process.env.NEXT_PUBLIC_ANALYTICS_KEY = '';

      const { config, errors } = loadEnvConfig(false);

      expect(errors).toHaveLength(0);
      expect(config.authToken).toBeUndefined();
      expect(config.analyticsKey).toBeUndefined();
    });

    it('should set proper defaults for feature flags', () => {
      const { config } = loadEnvConfig(false);

      expect(config.demoMode).toBe(false);
      expect(config.enableLoadTesting).toBe(true);
      expect(config.enableAnalytics).toBe(true);
      expect(config.enableRequestHistory).toBe(true);
    });

    it('should configure for staging environment', () => {
      process.env.NODE_ENV = 'staging';
      process.env.NEXT_PUBLIC_BASE_URL = 'https://staging-docs.proxypay.io';
      process.env.NEXT_PUBLIC_API_BASE_URL = 'https://staging-api.proxypay.io';

      const { config, errors } = loadEnvConfig(false);

      expect(errors).toHaveLength(0);
      expect(config.nodeEnv).toBe('staging');
      expect(config.baseUrl).toContain('staging');
      expect(config.apiBaseUrl).toContain('staging');
    });

    it('should configure for production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_BASE_URL = 'https://docs.proxypay.io';
      process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.proxypay.io';
      process.env.NEXT_PUBLIC_ENABLE_LOAD_TESTING = 'false';
      process.env.NEXT_PUBLIC_ENABLE_REQUEST_HISTORY = 'false';

      const { config, errors } = loadEnvConfig(false);

      expect(errors).toHaveLength(0);
      expect(config.nodeEnv).toBe('production');
      expect(config.baseUrl).toBe('https://docs.proxypay.io');
      expect(config.apiBaseUrl).toBe('https://api.proxypay.io');
      expect(config.enableLoadTesting).toBe(false);
      expect(config.enableRequestHistory).toBe(false);
    });

    it('should return structured config object', () => {
      const { config } = loadEnvConfig(false);

      // Check all required properties exist
      expect(config).toHaveProperty('baseUrl');
      expect(config).toHaveProperty('apiBaseUrl');
      expect(config).toHaveProperty('openapiSpecUrl');
      expect(config).toHaveProperty('demoMode');
      expect(config).toHaveProperty('enableLoadTesting');
      expect(config).toHaveProperty('enableAnalytics');
      expect(config).toHaveProperty('enableRequestHistory');
      expect(config).toHaveProperty('nodeEnv');
      expect(config).toHaveProperty('verboseLogging');
      expect(config).toHaveProperty('apiTimeout');
      expect(config).toHaveProperty('defaultLoadProfile');
      expect(config).toHaveProperty('loadTestOutputDir');
      expect(config).toHaveProperty('loadTestGenerateGraphs');
      expect(config).toHaveProperty('logLevel');
      expect(config).toHaveProperty('structuredLogging');
    });

    it('should throw error when throwOnError is true and validation fails', () => {
      process.env.NEXT_PUBLIC_API_TIMEOUT = 'invalid-number';

      expect(() => {
        loadEnvConfig(true);
      }).toThrow('Invalid environment configuration');
    });

    it('should not throw when throwOnError is false', () => {
      process.env.NEXT_PUBLIC_API_TIMEOUT = 'invalid-number';

      expect(() => {
        loadEnvConfig(false);
      }).not.toThrow();

      const { errors } = loadEnvConfig(false);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('getEnvSchema', () => {
    it('should return schema array', () => {
      const schema = getEnvSchema();

      expect(Array.isArray(schema)).toBe(true);
      expect(schema.length).toBeGreaterThan(0);
    });

    it('should include all required variables in schema', () => {
      const schema = getEnvSchema();
      const variableNames = schema.map((s) => s.name);

      expect(variableNames).toContain('NEXT_PUBLIC_BASE_URL');
      expect(variableNames).toContain('NEXT_PUBLIC_API_BASE_URL');
      expect(variableNames).toContain('NEXT_PUBLIC_DEMO_MODE');
      expect(variableNames).toContain('NODE_ENV');
    });

    it('should include type information', () => {
      const schema = getEnvSchema();
      const baseUrlSchema = schema.find((s) => s.name === 'NEXT_PUBLIC_BASE_URL');

      expect(baseUrlSchema).toBeDefined();
      expect(baseUrlSchema?.type).toBe('url');
      expect(baseUrlSchema?.description).toBeDefined();
    });
  });

  describe('Load test configuration', () => {
    it('should configure load test defaults', () => {
      const { config } = loadEnvConfig(false);

      expect(config.defaultLoadProfile).toBe('normal-load');
      expect(config.loadTestOutputDir).toBe('./load-test-results');
      expect(config.loadTestGenerateGraphs).toBe(true);
    });

    it('should allow customizing load test configuration', () => {
      process.env.NEXT_PUBLIC_DEFAULT_LOAD_PROFILE = 'stress-test';
      process.env.NEXT_PUBLIC_LOAD_TEST_OUTPUT_DIR = './custom-results';
      process.env.NEXT_PUBLIC_LOAD_TEST_GENERATE_GRAPHS = 'false';

      const { config } = loadEnvConfig(false);

      expect(config.defaultLoadProfile).toBe('stress-test');
      expect(config.loadTestOutputDir).toBe('./custom-results');
      expect(config.loadTestGenerateGraphs).toBe(false);
    });
  });

  describe('Docusaurus configuration', () => {
    it('should configure Docusaurus defaults', () => {
      const { config } = loadEnvConfig(false);

      expect(config.docusaurusBaseUrl).toBe('/proxypay-frontend/');
      expect(config.docusaurusTrailingSlash).toBe(false);
      expect(config.githubOrg).toBe('Pidoko257');
      expect(config.githubRepo).toBe('proxypay-frontend');
      expect(config.deploymentBranch).toBe('gh-pages');
    });

    it('should allow customizing Docusaurus configuration', () => {
      process.env.NEXT_PUBLIC_DOCUSAURUS_BASE_URL = '/docs/';
      process.env.NEXT_PUBLIC_DOCUSAURUS_TRAILING_SLASH = 'true';
      process.env.NEXT_PUBLIC_GITHUB_ORG = 'myorg';
      process.env.NEXT_PUBLIC_GITHUB_REPO = 'mydocs';

      const { config } = loadEnvConfig(false);

      expect(config.docusaurusBaseUrl).toBe('/docs/');
      expect(config.docusaurusTrailingSlash).toBe(true);
      expect(config.githubOrg).toBe('myorg');
      expect(config.githubRepo).toBe('mydocs');
    });
  });

  describe('Logging configuration', () => {
    it('should configure logging defaults', () => {
      const { config } = loadEnvConfig(false);

      expect(config.logLevel).toBe('info');
      expect(config.structuredLogging).toBe(false);
    });

    it('should allow customizing logging', () => {
      process.env.NEXT_PUBLIC_LOG_LEVEL = 'debug';
      process.env.NEXT_PUBLIC_STRUCTURED_LOGGING = 'true';

      const { config } = loadEnvConfig(false);

      expect(config.logLevel).toBe('debug');
      expect(config.structuredLogging).toBe(true);
    });
  });
});
