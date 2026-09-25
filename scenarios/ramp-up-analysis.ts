/**
 * Example Scenario 3: Advanced Scenario - Ramp-up with Analysis
 * Demonstrates using the ScenarioRunner for advanced test patterns
 */

import { TestScenario, ScenarioContext } from '../src/scenario-runner';
import { ScenarioRunner } from '../src/scenario-runner';
import { LoadProfile } from '../src/load-test.config';

export default {
  name: 'Ramp-up Analysis',
  description: 'Gradually increases load to identify performance degradation points',

  async execute(context: ScenarioContext) {
    context.log('Starting ramp-up analysis');

    const baseProfile: LoadProfile = {
      name: 'ramp-up-base',
      description: 'Base profile for ramp-up',
      duration: 60,
      rampUp: 10,
      concurrency: { min: 10, max: 10 },
      thinkTime: 200,
      requests: [
        {
          name: 'API Reference',
          method: 'GET',
          path: '/api',
          weight: 50,
          expectedStatus: [200],
        },
        {
          name: 'Rate Limits',
          method: 'GET',
          path: '/rate-limits',
          weight: 50,
          expectedStatus: [200],
        },
      ],
    };

    const scenarioRunner = new ScenarioRunner(context.config);

    try {
      context.log('Phase 1: Low load (10 concurrent users)');
      const lowLoadResults = await context.engine.runProfile(baseProfile);
      context.log(`  Throughput: ${lowLoadResults.throughput.toFixed(2)} req/s`);
      context.log(`  P95 Response: ${lowLoadResults.responseTime.p95.toFixed(2)}ms`);
      context.log(`  Error Rate: ${lowLoadResults.errorRate.toFixed(2)}%`);

      context.log('\nPhase 2: Medium load (50 concurrent users)');
      const mediumLoadProfile: LoadProfile = { ...baseProfile, concurrency: { min: 50, max: 50 } };
      const mediumLoadResults = await context.engine.runProfile(mediumLoadProfile);
      context.log(`  Throughput: ${mediumLoadResults.throughput.toFixed(2)} req/s`);
      context.log(`  P95 Response: ${mediumLoadResults.responseTime.p95.toFixed(2)}ms`);
      context.log(`  Error Rate: ${mediumLoadResults.errorRate.toFixed(2)}%`);

      // Calculate degradation
      const p95Degradation = ((mediumLoadResults.responseTime.p95 - lowLoadResults.responseTime.p95) / lowLoadResults.responseTime.p95) * 100;
      const throughputChange = ((mediumLoadResults.throughput - lowLoadResults.throughput) / lowLoadResults.throughput) * 100;

      context.log(`\nPerformance Change from Low to Medium Load:`);
      context.log(`  P95 Degradation: ${p95Degradation.toFixed(2)}%`);
      context.log(`  Throughput Change: ${throughputChange.toFixed(2)}%`);

      if (p95Degradation > 50) {
        context.warn('⚠️  Significant P95 degradation detected');
      }

      context.log('\nPhase 3: High load (100 concurrent users)');
      const highLoadProfile: LoadProfile = { ...baseProfile, concurrency: { min: 100, max: 100 } };
      const highLoadResults = await context.engine.runProfile(highLoadProfile);
      context.log(`  Throughput: ${highLoadResults.throughput.toFixed(2)} req/s`);
      context.log(`  P95 Response: ${highLoadResults.responseTime.p95.toFixed(2)}ms`);
      context.log(`  Error Rate: ${highLoadResults.errorRate.toFixed(2)}%`);

      // Return the final result
      return highLoadResults;
    } catch (error) {
      context.error(`Ramp-up analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  },
} as TestScenario;
