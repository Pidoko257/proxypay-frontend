/**
 * Example Scenario 2: Documentation Portal Performance
 * Tests the complete documentation site experience
 */

import { TestScenario, ScenarioContext } from '../src/scenario-runner';
import { LoadProfile } from '../src/load-test.config';

export default {
  name: 'Documentation Portal Flow',
  description: 'Tests complete documentation site navigation and API reference',

  async execute(context: ScenarioContext) {
    context.log('Starting documentation portal flow test');

    const profile: LoadProfile = {
      name: 'documentation-flow',
      description: 'Full documentation site usage',
      duration: 180,
      rampUp: 30,
      concurrency: { min: 10, max: 50 },
      thinkTime: 300, // Higher think time for reading
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
          weight: 35,
          expectedStatus: [200],
        },
        {
          name: 'Rate Limits Page',
          method: 'GET',
          path: '/rate-limits',
          weight: 25,
          expectedStatus: [200],
        },
        {
          name: 'Get Rate Limit Status',
          method: 'GET',
          path: '/api/rate-limit-status',
          weight: 20,
          expectedStatus: [200],
          headers: {
            'Authorization': 'Bearer test-token',
          },
        },
        {
          name: 'OpenAPI Spec',
          method: 'GET',
          path: '/openapi.yaml',
          weight: 5,
          expectedStatus: [200],
        },
      ],
    };

    context.log(`Running documentation portal test with 10-50 concurrent users`);
    const results = await context.engine.runProfile(profile);

    // Detailed analysis
    const overallHealth = results.errorRate < 1 && results.responseTime.p95 < 1000;

    if (overallHealth) {
      context.log('✅ Documentation portal is performing well');
    } else {
      context.warn('⚠️  Documentation portal performance needs attention');
    }

    if (results.breakdown) {
      context.log('Request performance breakdown:');
      results.breakdown.forEach(req => {
        const status = req.errorRate > 0 ? '⚠️' : '✅';
        context.log(`  ${status} ${req.name}: ${req.meanTime.toFixed(2)}ms (P95: ${req.p95Time.toFixed(2)}ms)`);
      });
    }

    return results;
  },
} as TestScenario;
