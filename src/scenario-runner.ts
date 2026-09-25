/**
 * Scenario Runner
 * Allows running custom test scenarios defined in TypeScript files
 */

import * as path from 'path';
import { LoadTestEngine } from './load-test-engine';
import { LoadTestConfig, LoadProfile, LoadTestResults } from './load-test.config';

export interface ScenarioContext {
  config: LoadTestConfig;
  engine: LoadTestEngine;
  log: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

export interface TestScenario {
  name: string;
  description: string;
  execute(context: ScenarioContext): Promise<LoadTestResults>;
}

export class ScenarioRunner {
  private config: LoadTestConfig;

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  /**
   * Run a scenario from a TypeScript file
   */
  async runScenario(filePath: string): Promise<LoadTestResults> {
    try {
      const absolutePath = path.resolve(filePath);

      // Dynamically import the scenario
      const module = await import(absolutePath);
      const scenario: TestScenario = module.default || module.scenario;

      if (!scenario || !scenario.execute) {
        throw new Error('Scenario must export a default object with an execute function');
      }

      console.log(`\n🎬 Running Scenario: ${scenario.name}`);
      if (scenario.description) {
        console.log(`   ${scenario.description}`);
      }

      const engine = new LoadTestEngine(this.config);
      const context: ScenarioContext = {
        config: this.config,
        engine,
        log: (msg: string) => console.log(`  ℹ️  ${msg}`),
        warn: (msg: string) => console.warn(`  ⚠️  ${msg}`),
        error: (msg: string) => console.error(`  ❌ ${msg}`),
      };

      const results = await scenario.execute(context);

      console.log(`✅ Scenario completed: ${scenario.name}`);

      return results;
    } catch (error) {
      throw new Error(`Failed to run scenario: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a custom profile from scenario parameters
   */
  createProfile(config: {
    name: string;
    duration: number;
    concurrency: { min: number; max: number };
    requests: any[];
    thinkTime?: number;
    rampUp?: number;
  }): LoadProfile {
    return {
      name: config.name,
      description: `Custom scenario: ${config.name}`,
      duration: config.duration,
      rampUp: config.rampUp || 30,
      concurrency: config.concurrency,
      thinkTime: config.thinkTime || 100,
      requests: config.requests,
    };
  }

  /**
   * Create a sequential scenario that runs multiple profiles in order
   */
  async runSequentialScenario(
    profiles: LoadProfile[],
    onComplete?: (results: LoadTestResults) => void,
  ): Promise<LoadTestResults[]> {
    const engine = new LoadTestEngine(this.config);
    const results: LoadTestResults[] = [];

    for (const profile of profiles) {
      console.log(`\n📊 Running profile: ${profile.name}`);
      const result = await engine.runProfile(profile);
      results.push(result);

      if (onComplete) {
        onComplete(result);
      }
    }

    return results;
  }

  /**
   * Create a ramp-up scenario that gradually increases load
   */
  async runRampUpScenario(
    baseProfile: LoadProfile,
    levels: number,
    levelDuration: number,
  ): Promise<LoadTestResults[]> {
    const engine = new LoadTestEngine(this.config);
    const results: LoadTestResults[] = [];

    const minConcurrency = baseProfile.concurrency.min;
    const maxConcurrency = baseProfile.concurrency.max;
    const step = Math.floor((maxConcurrency - minConcurrency) / levels);

    for (let i = 0; i < levels; i++) {
      const concurrency = minConcurrency + step * (i + 1);
      const profile: LoadProfile = {
        ...baseProfile,
        name: `${baseProfile.name}-level-${i + 1}`,
        duration: levelDuration,
        concurrency: {
          min: concurrency,
          max: concurrency,
        },
      };

      console.log(`\n📊 Ramp-up Level ${i + 1}: ${concurrency} concurrent users`);
      const result = await engine.runProfile(profile);
      results.push(result);

      // Wait between levels
      if (i < levels - 1) {
        console.log(`   Cooling down before next level...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    return results;
  }

  /**
   * Create a sustained load scenario with periodic spikes
   */
  async runSpikeScenario(
    baseProfile: LoadProfile,
    spikeConcurrency: number,
    spikeDuration: number,
    cooldownDuration: number,
    repetitions: number,
  ): Promise<LoadTestResults[]> {
    const engine = new LoadTestEngine(this.config);
    const results: LoadTestResults[] = [];

    for (let i = 0; i < repetitions; i++) {
      // Normal load period
      console.log(`\n📊 Spike Cycle ${i + 1} - Normal Load`);
      const normalProfile: LoadProfile = {
        ...baseProfile,
        name: `${baseProfile.name}-normal-${i + 1}`,
        duration: cooldownDuration,
      };
      results.push(await engine.runProfile(normalProfile));

      // Spike period
      console.log(`\n📊 Spike Cycle ${i + 1} - Spike Load (${spikeConcurrency} users)`);
      const spikeProfile: LoadProfile = {
        ...baseProfile,
        name: `${baseProfile.name}-spike-${i + 1}`,
        duration: spikeDuration,
        concurrency: {
          min: spikeConcurrency,
          max: spikeConcurrency,
        },
      };
      results.push(await engine.runProfile(spikeProfile));
    }

    return results;
  }

  /**
   * Create a stress test scenario that finds breaking point
   */
  async runStressTestScenario(
    baseProfile: LoadProfile,
    initialConcurrency: number,
    maxConcurrency: number,
    step: number,
    durationPerLevel: number,
    errorRateThreshold: number = 5,
  ): Promise<LoadTestResults[]> {
    const engine = new LoadTestEngine(this.config);
    const results: LoadTestResults[] = [];

    let currentConcurrency = initialConcurrency;

    while (currentConcurrency <= maxConcurrency) {
      console.log(`\n📊 Stress Test - Concurrency: ${currentConcurrency}`);

      const profile: LoadProfile = {
        ...baseProfile,
        name: `${baseProfile.name}-stress-${currentConcurrency}`,
        duration: durationPerLevel,
        concurrency: {
          min: currentConcurrency,
          max: currentConcurrency,
        },
      };

      const result = await engine.runProfile(profile);
      results.push(result);

      // Check if we've hit the breaking point
      if (result.errorRate > errorRateThreshold) {
        console.log(`\n🛑 Breaking point reached at ${currentConcurrency} concurrent users (error rate: ${result.errorRate.toFixed(2)}%)`);
        break;
      }

      currentConcurrency += step;

      // Cooldown between levels
      if (currentConcurrency <= maxConcurrency) {
        console.log(`   Cooling down...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    return results;
  }

  /**
   * Create an endurance test scenario that monitors for memory leaks
   */
  async runEnduranceScenario(
    baseProfile: LoadProfile,
    checkpointInterval: number = 300000, // 5 minutes
    totalDuration: number = 1800000, // 30 minutes
  ): Promise<{ results: LoadTestResults[]; memoryTrend: 'stable' | 'growing' | 'shrinking' }> {
    const engine = new LoadTestEngine(this.config);
    const results: LoadTestResults[] = [];
    const memorySnapshots: number[] = [];
    const startTime = Date.now();

    while (Date.now() - startTime < totalDuration) {
      console.log(`\n📊 Endurance Test - Checkpoint`);

      const profile: LoadProfile = {
        ...baseProfile,
        name: `${baseProfile.name}-checkpoint-${results.length + 1}`,
        duration: Math.min(300, checkpointInterval / 1000), // Run for 5 minutes or until total duration
      };

      const result = await engine.runProfile(profile);
      results.push(result);

      // Record memory usage
      const memUsage = process.memoryUsage();
      const heapUsed = memUsage.heapUsed / 1024 / 1024; // Convert to MB
      memorySnapshots.push(heapUsed);

      console.log(`   Memory Used: ${heapUsed.toFixed(2)} MB`);
    }

    // Analyze memory trend
    const memoryTrend = this.analyzeMemoryTrend(memorySnapshots);

    return { results, memoryTrend };
  }

  /**
   * Analyze memory trend to detect leaks
   */
  private analyzeMemoryTrend(snapshots: number[]): 'stable' | 'growing' | 'shrinking' {
    if (snapshots.length < 2) {
      return 'stable';
    }

    const firstHalf = snapshots.slice(0, Math.floor(snapshots.length / 2));
    const secondHalf = snapshots.slice(Math.floor(snapshots.length / 2));

    const firstAverage = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAverage = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const percentChange = ((secondAverage - firstAverage) / firstAverage) * 100;

    if (percentChange > 10) {
      return 'growing';
    } else if (percentChange < -10) {
      return 'shrinking';
    }

    return 'stable';
  }
}
