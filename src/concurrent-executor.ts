/**
 * Concurrent Load Test Executor
 * Orchestrates running multiple load test profiles concurrently with resource management
 */

import { LoadTestEngine } from './load-test-engine';
import { LoadTestConfig, LoadProfile, LoadTestResults } from './load-test.config';

export interface ConcurrentExecutionOptions {
  maxConcurrentTests: number;
  resourceLimit?: {
    maxMemoryMB: number;
    maxCPUPercent: number;
  };
  failFast: boolean;
  timeout: number; // milliseconds
}

export interface ExecutionProgress {
  total: number;
  completed: number;
  running: number;
  failed: number;
  pending: number;
}

export class ConcurrentExecutor {
  private config: LoadTestConfig;
  private options: ConcurrentExecutionOptions;
  private queue: LoadProfile[] = [];
  private running: Map<string, Promise<LoadTestResults>> = new Map();
  private results: Map<string, LoadTestResults> = new Map();
  private errors: Map<string, Error> = new Map();
  private progress: ExecutionProgress = {
    total: 0,
    completed: 0,
    running: 0,
    failed: 0,
    pending: 0,
  };

  constructor(
    config: LoadTestConfig,
    options: Partial<ConcurrentExecutionOptions> = {},
  ) {
    this.config = config;
    this.options = {
      maxConcurrentTests: 3,
      failFast: false,
      timeout: 600000, // 10 minutes
      ...options,
    };
  }

  /**
   * Execute multiple profiles concurrently
   */
  async executeProfiles(profiles: LoadProfile[]): Promise<{
    results: Map<string, LoadTestResults>;
    errors: Map<string, Error>;
    summary: ExecutionProgress;
  }> {
    this.queue = [...profiles];
    this.progress.total = profiles.length;
    this.progress.pending = profiles.length;

    console.log(`\n🚀 Starting concurrent execution of ${profiles.length} profiles`);
    console.log(`   Max concurrent: ${this.options.maxConcurrentTests}`);

    while (this.queue.length > 0 || this.running.size > 0) {
      // Start new tests if we have capacity
      while (this.queue.length > 0 && this.running.size < this.options.maxConcurrentTests) {
        const profile = this.queue.shift()!;
        await this.startProfile(profile);
      }

      // Wait for at least one test to complete
      if (this.running.size > 0) {
        await this.waitForCompletion();
      }

      // Check for failures if failFast is enabled
      if (this.options.failFast && this.errors.size > 0) {
        console.log('\n⚠️  Failing fast due to test failure');
        // Terminate remaining tests
        this.queue = [];
        break;
      }
    }

    return {
      results: this.results,
      errors: this.errors,
      summary: this.progress,
    };
  }

  /**
   * Start a profile execution
   */
  private async startProfile(profile: LoadProfile): Promise<void> {
    this.progress.running++;
    this.progress.pending--;

    console.log(`\n▶️  Starting: ${profile.name} (${this.progress.running}/${this.options.maxConcurrentTests} running)`);

    const promise = this.executeProfile(profile)
      .then(result => {
        this.results.set(profile.name, result);
        this.progress.completed++;
        this.progress.running--;
        console.log(`✅ Completed: ${profile.name}`);
      })
      .catch(error => {
        this.errors.set(profile.name, error as Error);
        this.progress.failed++;
        this.progress.running--;
        console.error(`❌ Failed: ${profile.name} - ${error instanceof Error ? error.message : String(error)}`);
      })
      .finally(() => {
        this.running.delete(profile.name);
      });

    this.running.set(profile.name, promise as any);
  }

  /**
   * Execute a single profile with timeout
   */
  private executeProfile(profile: LoadProfile): Promise<LoadTestResults> {
    return new Promise((resolve, reject) => {
      const engine = new LoadTestEngine(this.config);
      const timeout = setTimeout(() => {
        reject(new Error(`Profile execution timeout: ${profile.name}`));
      }, this.options.timeout);

      engine
        .runProfile(profile)
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Wait for at least one test to complete
   */
  private waitForCompletion(): Promise<void> {
    return new Promise(resolve => {
      if (this.running.size === 0) {
        resolve();
        return;
      }

      const checkInterval = setInterval(() => {
        if (this.running.size < this.options.maxConcurrentTests) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Also resolve after a max wait time
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });
  }

  /**
   * Get current execution progress
   */
  getProgress(): ExecutionProgress {
    return { ...this.progress };
  }

  /**
   * Generate summary of concurrent execution
   */
  generateSummary(): {
    totalTests: number;
    successfulTests: number;
    failedTests: number;
    successRate: number;
    totalThroughput: number;
    averageErrorRate: number;
    results: Array<{ name: string; status: 'success' | 'failed'; throughput?: number; errorRate?: number }>;
  } {
    const totalTests = this.results.size + this.errors.size;
    const successfulTests = this.results.size;
    const failedTests = this.errors.size;
    const successRate = totalTests > 0 ? (successfulTests / totalTests) * 100 : 0;

    const totalThroughput = Array.from(this.results.values()).reduce(
      (sum, result) => sum + result.throughput,
      0,
    );

    const averageErrorRate =
      this.results.size > 0
        ? Array.from(this.results.values()).reduce((sum, result) => sum + result.errorRate, 0) /
          this.results.size
        : 0;

    const results = [];

    for (const [name, result] of this.results.entries()) {
      results.push({
        name,
        status: 'success' as const,
        throughput: result.throughput,
        errorRate: result.errorRate,
      });
    }

    for (const [name] of this.errors.entries()) {
      results.push({
        name,
        status: 'failed' as const,
      });
    }

    return {
      totalTests,
      successfulTests,
      failedTests,
      successRate,
      totalThroughput,
      averageErrorRate,
      results,
    };
  }

  /**
   * Print execution summary to console
   */
  printSummary(): void {
    const summary = this.generateSummary();

    console.log('\n' + '='.repeat(80));
    console.log('📊 CONCURRENT EXECUTION SUMMARY');
    console.log('='.repeat(80));

    console.log('\n📈 EXECUTION STATS');
    console.log(`  Total Tests:        ${summary.totalTests}`);
    console.log(`  Successful:         ${summary.successfulTests}`);
    console.log(`  Failed:             ${summary.failedTests}`);
    console.log(`  Success Rate:       ${summary.successRate.toFixed(2)}%`);

    console.log('\n🚀 PERFORMANCE');
    console.log(`  Total Throughput:   ${summary.totalThroughput.toFixed(2)} req/s`);
    console.log(`  Avg Error Rate:     ${summary.averageErrorRate.toFixed(2)}%`);

    console.log('\n📋 TEST RESULTS');
    console.log('  Name                          Status         Throughput      Error Rate');
    console.log('  ' + '-'.repeat(76));

    for (const result of summary.results) {
      const name = result.name.padEnd(30);
      const status = result.status === 'success' ? '✅ PASS' : '❌ FAIL';
      const statusStr = status.padEnd(15);
      const throughput = result.throughput ? `${result.throughput.toFixed(2)} req/s`.padEnd(16) : 'N/A'.padEnd(16);
      const errorRate = result.errorRate ? `${result.errorRate.toFixed(2)}%` : 'N/A';

      console.log(`  ${name}${statusStr}${throughput}${errorRate}`);
    }

    console.log('\n' + '='.repeat(80));
  }
}
