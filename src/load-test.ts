#!/usr/bin/env node

/**
 * Load Testing Framework CLI
 * Main entry point for running load tests with advanced features
 */

import * as fs from 'fs';
import * as path from 'path';
import { LoadTestEngine } from './load-test-engine';
import { LoadTestReporter } from './load-test-reporter';
import { MetricsCollector } from './metrics-collector';
import { ScenarioRunner } from './scenario-runner';
import { BaselineManager } from './baseline-manager';
import { loadTestConfigs, LoadTestConfig } from './load-test.config';

interface CLIOptions {
  profile?: string;
  config?: string;
  environment?: 'local' | 'staging' | 'production';
  concurrent?: boolean;
  scenarios?: string[];
  compareBaseline?: boolean;
  saveBaseline?: boolean;
  verbose?: boolean;
  durationMultiplier?: number;
}

class LoadTestCLI {
  private options: CLIOptions = {};
  private config: LoadTestConfig;
  private metricsCollector: MetricsCollector;
  private baselineManager: BaselineManager;

  constructor() {
    this.parseArguments();
    this.config = this.loadConfig();
    this.metricsCollector = new MetricsCollector();
    this.baselineManager = new BaselineManager('./baselines');
  }

  /**
   * Parse command line arguments
   */
  private parseArguments(): void {
    const args = process.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--profile' && args[i + 1]) {
        this.options.profile = args[++i];
      } else if (arg === '--config' && args[i + 1]) {
        this.options.config = args[++i];
      } else if (arg === '--environment' && args[i + 1]) {
        this.options.environment = args[++i] as 'local' | 'staging' | 'production';
      } else if (arg === '--concurrent') {
        this.options.concurrent = true;
      } else if (arg === '--scenarios' && args[i + 1]) {
        this.options.scenarios = args[++i].split(',');
      } else if (arg === '--compare-baseline') {
        this.options.compareBaseline = true;
      } else if (arg === '--save-baseline') {
        this.options.saveBaseline = true;
      } else if (arg === '--verbose') {
        this.options.verbose = true;
      } else if (arg === '--duration-multiplier' && args[i + 1]) {
        this.options.durationMultiplier = parseFloat(args[++i]);
      } else if (arg === '--help' || arg === '-h') {
        this.printHelp();
        process.exit(0);
      } else if (arg === '--version' || arg === '-v') {
        this.printVersion();
        process.exit(0);
      } else if (arg === '--list-profiles') {
        this.listProfiles();
        process.exit(0);
      }
    }
  }

  /**
   * Load configuration
   */
  private loadConfig(): LoadTestConfig {
    let config: LoadTestConfig;

    // Use custom config if provided
    if (this.options.config && fs.existsSync(this.options.config)) {
      const customConfig = require(path.resolve(this.options.config));
      config = customConfig.default || customConfig;
    } else if (this.options.environment && this.options.environment in loadTestConfigs) {
      config = loadTestConfigs[this.options.environment as keyof typeof loadTestConfigs];
    } else {
      config = loadTestConfigs.default;
    }

    config.verbose = this.options.verbose || config.verbose;

    // Apply duration multiplier if provided
    if (this.options.durationMultiplier && this.options.durationMultiplier > 0) {
      config.loadProfiles = config.loadProfiles.map(profile => ({
        ...profile,
        duration: Math.ceil(profile.duration * this.options.durationMultiplier!),
      }));
    }

    return config;
  }

  /**
   * List available profiles
   */
  private listProfiles(): void {
    console.log('\n📋 Available Load Test Profiles:\n');
    for (const profile of this.config.loadProfiles) {
      console.log(`  ${profile.name.padEnd(20)} - ${profile.description}`);
      console.log(`    Duration: ${profile.duration}s, Concurrency: ${profile.concurrency.min}-${profile.concurrency.max}\n`);
    }
  }

  /**
   * Print help message
   */
  private printHelp(): void {
    console.log(`
  📊 ProxyPay Load Testing Framework

  Usage: load-test [options]

  Options:
    --profile <name>              Run specific profile (smoke-test, normal-load, stress-test, spike-test, endurance-test)
    --config <path>               Load custom configuration file
    --environment <env>           Use preset environment (local, staging, production)
    --concurrent                  Run multiple profiles concurrently
    --scenarios <list>            Run specific scenario scripts (comma-separated)
    --compare-baseline            Compare results against baseline
    --save-baseline               Save current results as new baseline
    --duration-multiplier <value> Multiply test duration by this factor
    --verbose                     Enable verbose logging
    --list-profiles               List all available profiles
    --help, -h                    Show this help message
    --version, -v                 Show version information

  Examples:
    # Run smoke test
    load-test --profile smoke-test

    # Run with custom config
    load-test --config ./custom-config.ts

    # Run staging environment with baseline comparison
    load-test --environment staging --compare-baseline

    # Run multiple profiles concurrently
    load-test --concurrent

    # Run with half duration
    load-test --duration-multiplier 0.5 --profile normal-load
    `);
  }

  /**
   * Print version
   */
  private printVersion(): void {
    console.log('ProxyPay Load Testing Framework v1.0.0');
  }

  /**
   * Run the load tests
   */
  async run(): Promise<void> {
    try {
      console.log('🚀 Starting Load Testing Framework\n');

      // Run scenario tests if provided
      if (this.options.scenarios && this.options.scenarios.length > 0) {
        await this.runScenarios();
      }

      // Run standard profiles
      if (!this.options.scenarios || this.options.scenarios.length === 0) {
        if (this.options.concurrent) {
          await this.runProfilesConcurrently();
        } else {
          await this.runProfilesSequentially();
        }
      }

      console.log('\n✅ All load tests completed successfully!');
    } catch (error) {
      console.error('\n❌ Load test failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * Run profiles sequentially
   */
  private async runProfilesSequentially(): Promise<void> {
    const engine = new LoadTestEngine(this.config);
    const reporter = new LoadTestReporter(this.config.reporting.outputDir);

    const profilesToRun = this.options.profile
      ? this.config.loadProfiles.filter(p => p.name === this.options.profile)
      : this.config.loadProfiles;

    if (profilesToRun.length === 0) {
      throw new Error(`Profile "${this.options.profile}" not found`);
    }

    for (const profile of profilesToRun) {
      const results = await engine.runProfile(profile);
      this.metricsCollector.record(results);

      // Generate reports
      reporter.generateReports(results, this.config.reporting.format);

      // Compare with baseline if requested
      if (this.options.compareBaseline) {
        const comparison = this.baselineManager.compare(results);
        if (comparison) {
          console.log('\n📊 Baseline Comparison:');
          console.log(`   Response Time Change: ${comparison.responseTimeChange > 0 ? '+' : ''}${comparison.responseTimeChange.toFixed(2)}%`);
          console.log(`   Throughput Change: ${comparison.throughputChange > 0 ? '+' : ''}${comparison.throughputChange.toFixed(2)}%`);
          console.log(`   Error Rate Change: ${comparison.errorRateChange > 0 ? '+' : ''}${comparison.errorRateChange.toFixed(2)}%`);
        }
      }

      // Save as baseline if requested
      if (this.options.saveBaseline) {
        this.baselineManager.save(results);
        console.log('✅ Results saved as baseline');
      }
    }
  }

  /**
   * Run profiles concurrently
   */
  private async runProfilesConcurrently(): Promise<void> {
    const engine = new LoadTestEngine(this.config);
    const reporter = new LoadTestReporter(this.config.reporting.outputDir);

    const profilesToRun = this.options.profile
      ? this.config.loadProfiles.filter(p => p.name === this.options.profile)
      : this.config.loadProfiles;

    if (profilesToRun.length === 0) {
      throw new Error(`Profile "${this.options.profile}" not found`);
    }

    console.log(`Running ${profilesToRun.length} profiles concurrently...\n`);

    const promises = profilesToRun.map(profile => engine.runProfile(profile));
    const results = await Promise.all(promises);

    for (const result of results) {
      this.metricsCollector.record(result);
      reporter.generateReports(result, this.config.reporting.format);

      if (this.options.compareBaseline) {
        const comparison = this.baselineManager.compare(result);
        if (comparison) {
          console.log(`\n📊 ${result.testName} - Baseline Comparison:`);
          console.log(`   Response Time Change: ${comparison.responseTimeChange > 0 ? '+' : ''}${comparison.responseTimeChange.toFixed(2)}%`);
          console.log(`   Throughput Change: ${comparison.throughputChange > 0 ? '+' : ''}${comparison.throughputChange.toFixed(2)}%`);
          console.log(`   Error Rate Change: ${comparison.errorRateChange > 0 ? '+' : ''}${comparison.errorRateChange.toFixed(2)}%`);
        }
      }

      if (this.options.saveBaseline) {
        this.baselineManager.save(result);
      }
    }

    if (this.options.saveBaseline) {
      console.log('\n✅ All results saved as baselines');
    }
  }

  /**
   * Run scenario scripts
   */
  private async runScenarios(): Promise<void> {
    if (!this.options.scenarios) {
      return;
    }

    const runner = new ScenarioRunner(this.config);
    const reporter = new LoadTestReporter(this.config.reporting.outputDir);

    for (const scenarioName of this.options.scenarios) {
      const scenarioPath = path.resolve(`./scenarios/${scenarioName}.ts`);

      if (!fs.existsSync(scenarioPath)) {
        console.warn(`⚠️  Scenario not found: ${scenarioPath}`);
        continue;
      }

      const results = await runner.runScenario(scenarioPath);
      this.metricsCollector.record(results);
      reporter.generateReports(results, this.config.reporting.format);
    }
  }
}

// Main execution
const cli = new LoadTestCLI();
cli.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
