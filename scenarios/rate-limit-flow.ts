/**
 * Example Scenario 1: Rate Limit API Flow
 * Tests the rate limiting endpoints and status checking
 */

import { TestScenario, ScenarioContext } from '../src/scenario-runner';
import { LoadProfile } from '../src/load-test.config';

export default {
  name: 'Rate Limit API Flow',
  description: 'Tests rate limit checking and status endpoints',

  async execute(context: ScenarioContext) {
    context.log('Starting rate limit API flow test');

    const profile: LoadProfile = {
      name: 'rate-limit-flow',
      description: 'Rate limit checking flow',
      duration: 120,
      rampUp: 20,
      concurrency: { min: 5, max: 30 },
      thinkTime: 200,
      requests: [
        {
          name: 'Check Rate Limit Status',
          method: 'GET',
          path: '/api/rate-limit-status',
          weight: 40,
          expectedStatus: [200],
          headers: {
            'Authorization': 'Bearer test-token',
          },
        },
        {
          name: 'View Rate Limits Page',
          method: 'GET',
          path: '/rate-limits',
          weight: 30,
          expectedStatus: [200],
        },
        {
          name: 'View API Documentation',
          method: 'GET',
          path: '/api',
          weight: 20,
          expectedStatus: [200],
        },
        {
          name: 'Homepage',
          method: 'GET',
          path: '/',
          weight: 10,
          expectedStatus: [200],
        },
      ],
    };

    const results = await context.engine.runProfile(profile);

    // Post-test analysis
    if (results.errorRate > 1) {
      context.warn(`High error rate detected: ${results.errorRate.toFixed(2)}%`);
    }

    if (results.responseTime.p95 > 1000) {
      context.warn(`P95 response time is high: ${results.responseTime.p95.toFixed(2)}ms`);
    }

    context.log(`Test completed with ${results.throughput.toFixed(2)} req/s throughput`);

    return results;
  },
} as TestScenario;
