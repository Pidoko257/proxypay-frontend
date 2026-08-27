/**
 * Load Testing Framework Configuration
 * Defines test scenarios, load profiles, and performance thresholds
 */

import { envConfig } from './utils/env-config';

// Helper to get env var with fallback
const getEnv = (key: string, defaultValue: string = ''): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  return defaultValue;
};

export interface LoadTestConfig {
  // Test environment
  baseUrl: string;
  apiBaseUrl: string;
  timeout: number;
  verbose: boolean;

  // Load profiles
  loadProfiles: LoadProfile[];

  // Performance thresholds
  thresholds: PerformanceThresholds;

  // Reporting
  reporting: ReportingConfig;
}

export interface LoadProfile {
  name: string;
  description: string;
  duration: number; // in seconds
  rampUp: number; // in seconds
  concurrency: {
    min: number;
    max: number;
  };
  requests: TestRequest[];
  thinkTime: number; // delay between requests in ms
}

export interface TestRequest {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  weight: number; // probability of this request being chosen (0-100)
  expectedStatus?: number[];
  assertions?: Assertion[];
}

export interface Assertion {
  type: 'status' | 'responseTime' | 'bodyContains' | 'jsonPath' | 'headerExists';
  value?: unknown;
  operator?: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
}

export interface PerformanceThresholds {
  p50ResponseTime: number; // milliseconds
  p95ResponseTime: number;
  p99ResponseTime: number;
  maxResponseTime: number;
  errorRate: number; // percentage
  minThroughput: number; // requests per second
  availabilityTarget: number; // percentage (99.9 = 99.9%)
}

export interface ReportingConfig {
  outputDir: string;
  format: ('html' | 'json' | 'csv' | 'console')[];
  generateGraphs: boolean;
  emailReport?: {
    enabled: boolean;
    recipients: string[];
    subject: string;
  };
}

export interface LoadTestResults {
  testName: string;
  timestamp: number;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  throughput: number; // requests per second
  responseTime: ResponseTimeMetrics;
  breakdown: RequestBreakdown[];
  thresholdsPassed: boolean;
  violations: ThresholdViolation[];
}

export interface ResponseTimeMetrics {
  min: number;
  max: number;
  mean: number;
  median: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  stdDev: number;
}

export interface RequestBreakdown {
  name: string;
  count: number;
  successful: number;
  failed: number;
  errorRate: number;
  minTime: number;
  maxTime: number;
  meanTime: number;
  p95Time: number;
}

export interface ThresholdViolation {
  metric: string;
  expected: number;
  actual: number;
  severity: 'warning' | 'critical';
}

// Default configuration
export const defaultConfig: LoadTestConfig = {
  baseUrl: getEnv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3001'),
  apiBaseUrl: getEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:3000'),
  timeout: parseInt(getEnv('NEXT_PUBLIC_API_TIMEOUT', '30000'), 10),
  verbose: getEnv('NEXT_PUBLIC_VERBOSE_LOGGING', 'false') === 'true',

  loadProfiles: [
    {
      name: 'smoke-test',
      description: 'Quick smoke test with low load',
      duration: 30,
      rampUp: 5,
      concurrency: { min: 1, max: 5 },
      thinkTime: 100,
      requests: [
        {
          name: 'GET /',
          method: 'GET',
          path: '/',
          weight: 20,
          expectedStatus: [200],
        },
        {
          name: 'GET /api',
          method: 'GET',
          path: '/api',
          weight: 20,
          expectedStatus: [200],
        },
        {
          name: 'GET /rate-limits',
          method: 'GET',
          path: '/rate-limits',
          weight: 30,
          expectedStatus: [200],
        },
        {
          name: 'GET /api/rate-limit-status',
          method: 'GET',
          path: '/api/rate-limit-status',
          weight: 30,
          expectedStatus: [200],
          headers: {
            'Authorization': 'Bearer test-token',
          },
        },
      ],
    },

    {
      name: 'normal-load',
      description: 'Simulates typical production load',
      duration: 120,
      rampUp: 30,
      concurrency: { min: 10, max: 50 },
      thinkTime: 200,
      requests: [
        {
          name: 'Homepage',
          method: 'GET',
          path: '/',
          weight: 15,
          expectedStatus: [200],
        },
        {
          name: 'API Reference',
          method: 'GET',
          path: '/api',
          weight: 25,
          expectedStatus: [200],
        },
        {
          name: 'Rate Limits Page',
          method: 'GET',
          path: '/rate-limits',
          weight: 35,
          expectedStatus: [200],
        },
        {
          name: 'Rate Limit Status',
          method: 'GET',
          path: '/api/rate-limit-status',
          weight: 25,
          expectedStatus: [200],
          headers: {
            'Authorization': 'Bearer test-token',
          },
        },
      ],
    },

    {
      name: 'stress-test',
      description: 'Tests system behavior under stress',
      duration: 300,
      rampUp: 60,
      concurrency: { min: 50, max: 200 },
      thinkTime: 50,
      requests: [
        {
          name: 'Homepage',
          method: 'GET',
          path: '/',
          weight: 10,
          expectedStatus: [200],
        },
        {
          name: 'API Reference',
          method: 'GET',
          path: '/api',
          weight: 20,
          expectedStatus: [200],
        },
        {
          name: 'Rate Limits Page',
          method: 'GET',
          path: '/rate-limits',
          weight: 40,
          expectedStatus: [200],
        },
        {
          name: 'Rate Limit Status',
          method: 'GET',
          path: '/api/rate-limit-status',
          weight: 30,
          expectedStatus: [200],
          headers: {
            'Authorization': 'Bearer test-token',
          },
        },
      ],
    },

    {
      name: 'spike-test',
      description: 'Sudden spike in traffic',
      duration: 180,
      rampUp: 10,
      concurrency: { min: 100, max: 500 },
      thinkTime: 25,
      requests: [
        {
          name: 'Rate Limits Page',
          method: 'GET',
          path: '/rate-limits',
          weight: 50,
          expectedStatus: [200],
        },
        {
          name: 'Rate Limit Status',
          method: 'GET',
          path: '/api/rate-limit-status',
          weight: 50,
          expectedStatus: [200],
          headers: {
            'Authorization': 'Bearer test-token',
          },
        },
      ],
    },

    {
      name: 'endurance-test',
      description: 'Long-running test to check for memory leaks',
      duration: 1800, // 30 minutes
      rampUp: 120,
      concurrency: { min: 20, max: 80 },
      thinkTime: 500,
      requests: [
        {
          name: 'Homepage',
          method: 'GET',
          path: '/',
          weight: 20,
          expectedStatus: [200],
        },
        {
          name: 'Rate Limits Page',
          method: 'GET',
          path: '/rate-limits',
          weight: 50,
          expectedStatus: [200],
        },
        {
          name: 'Rate Limit Status',
          method: 'GET',
          path: '/api/rate-limit-status',
          weight: 30,
          expectedStatus: [200],
          headers: {
            'Authorization': 'Bearer test-token',
          },
        },
      ],
    },
  ],

  thresholds: {
    p50ResponseTime: 200,
    p95ResponseTime: 800,
    p99ResponseTime: 2000,
    maxResponseTime: 5000,
    errorRate: 1, // max 1%
    minThroughput: 10, // min 10 req/s
    availabilityTarget: 99.5,
  },

  reporting: {
    outputDir: getEnv('NEXT_PUBLIC_LOAD_TEST_OUTPUT_DIR', './load-test-results'),
    format: ['html', 'json', 'console'],
    generateGraphs: getEnv('NEXT_PUBLIC_LOAD_TEST_GENERATE_GRAPHS', 'true') === 'true',
    emailReport: {
      enabled: false,
      recipients: [],
      subject: 'Load Test Results',
    },
  },
};

export const loadTestConfigs = {
  default: defaultConfig,

  staging: {
    ...defaultConfig,
    baseUrl: getEnv('NEXT_PUBLIC_BASE_URL', 'https://staging-api.proxypay.io'),
    apiBaseUrl: getEnv('NEXT_PUBLIC_API_BASE_URL', 'https://staging-api.proxypay.io'),
    thresholds: {
      ...defaultConfig.thresholds,
      p95ResponseTime: 1000,
      p99ResponseTime: 3000,
      maxResponseTime: 10000,
    },
  } as LoadTestConfig,

  production: {
    ...defaultConfig,
    baseUrl: getEnv('NEXT_PUBLIC_BASE_URL', 'https://api.proxypay.io'),
    apiBaseUrl: getEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.proxypay.io'),
    loadProfiles: defaultConfig.loadProfiles.filter(p => p.name !== 'spike-test'),
    thresholds: {
      ...defaultConfig.thresholds,
      p95ResponseTime: 500,
      p99ResponseTime: 1500,
      errorRate: 0.1, // max 0.1%
      availabilityTarget: 99.9,
    },
  } as LoadTestConfig,
};
