/**
 * Baseline Manager
 * Manages performance baselines and comparison for regression detection
 */

import * as fs from 'fs';
import * as path from 'path';
import { LoadTestResults } from './load-test.config';

export interface BaselineEntry {
  testName: string;
  timestamp: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  throughput: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  meanResponseTime: number;
  maxResponseTime: number;
}

export interface BaselineComparison {
  testName: string;
  responseTimeChange: number; // percentage
  throughputChange: number; // percentage
  errorRateChange: number; // percentage
  status: 'passed' | 'warning' | 'failed';
  details: {
    metric: string;
    baseline: number;
    current: number;
    change: number;
    thresholdExceeded: boolean;
  }[];
}

export class BaselineManager {
  private basePath: string;
  private regressionThresholds = {
    responseTime: 10, // percentage
    throughput: -10, // percentage (negative means degradation)
    errorRate: 5, // percentage points
  };

  constructor(basePath: string) {
    this.basePath = basePath;
    this.ensureBasePath();
  }

  /**
   * Ensure baseline directory exists
   */
  private ensureBasePath(): void {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  /**
   * Save test results as a baseline
   */
  save(results: LoadTestResults): void {
    const baseline: BaselineEntry = {
      testName: results.testName,
      timestamp: results.timestamp,
      totalRequests: results.totalRequests,
      successfulRequests: results.successfulRequests,
      failedRequests: results.failedRequests,
      errorRate: results.errorRate,
      throughput: results.throughput,
      p50ResponseTime: results.responseTime.p50,
      p95ResponseTime: results.responseTime.p95,
      p99ResponseTime: results.responseTime.p99,
      meanResponseTime: results.responseTime.mean,
      maxResponseTime: results.responseTime.max,
    };

    const filename = path.join(this.basePath, `${results.testName}-baseline.json`);
    fs.writeFileSync(filename, JSON.stringify(baseline, null, 2));

    console.log(`✅ Baseline saved: ${filename}`);
  }

  /**
   * Load baseline for a test
   */
  loadBaseline(testName: string): BaselineEntry | null {
    const filename = path.join(this.basePath, `${testName}-baseline.json`);

    if (!fs.existsSync(filename)) {
      return null;
    }

    const content = fs.readFileSync(filename, 'utf-8');
    return JSON.parse(content) as BaselineEntry;
  }

  /**
   * Compare current results against baseline
   */
  compare(results: LoadTestResults): BaselineComparison | null {
    const baseline = this.loadBaseline(results.testName);

    if (!baseline) {
      console.log(`⚠️  No baseline found for ${results.testName}`);
      return null;
    }

    const responseTimeChange = ((results.responseTime.mean - baseline.meanResponseTime) / baseline.meanResponseTime) * 100;
    const throughputChange = ((results.throughput - baseline.throughput) / baseline.throughput) * 100;
    const errorRateChange = results.errorRate - baseline.errorRate;

    const details = [
      {
        metric: 'Mean Response Time',
        baseline: baseline.meanResponseTime,
        current: results.responseTime.mean,
        change: responseTimeChange,
        thresholdExceeded: Math.abs(responseTimeChange) > this.regressionThresholds.responseTime,
      },
      {
        metric: 'P95 Response Time',
        baseline: baseline.p95ResponseTime,
        current: results.responseTime.p95,
        change: ((results.responseTime.p95 - baseline.p95ResponseTime) / baseline.p95ResponseTime) * 100,
        thresholdExceeded: Math.abs(((results.responseTime.p95 - baseline.p95ResponseTime) / baseline.p95ResponseTime) * 100) > this.regressionThresholds.responseTime,
      },
      {
        metric: 'P99 Response Time',
        baseline: baseline.p99ResponseTime,
        current: results.responseTime.p99,
        change: ((results.responseTime.p99 - baseline.p99ResponseTime) / baseline.p99ResponseTime) * 100,
        thresholdExceeded: Math.abs(((results.responseTime.p99 - baseline.p99ResponseTime) / baseline.p99ResponseTime) * 100) > this.regressionThresholds.responseTime,
      },
      {
        metric: 'Throughput',
        baseline: baseline.throughput,
        current: results.throughput,
        change: throughputChange,
        thresholdExceeded: throughputChange < this.regressionThresholds.throughput,
      },
      {
        metric: 'Error Rate',
        baseline: baseline.errorRate,
        current: results.errorRate,
        change: errorRateChange,
        thresholdExceeded: errorRateChange > this.regressionThresholds.errorRate,
      },
    ];

    const exceededCount = details.filter(d => d.thresholdExceeded).length;
    let status: 'passed' | 'warning' | 'failed';

    if (exceededCount === 0) {
      status = 'passed';
    } else if (exceededCount === 1) {
      status = 'warning';
    } else {
      status = 'failed';
    }

    return {
      testName: results.testName,
      responseTimeChange,
      throughputChange,
      errorRateChange,
      status,
      details,
    };
  }

  /**
   * Set custom regression thresholds
   */
  setRegressionThresholds(thresholds: Partial<typeof BaselineManager.prototype.regressionThresholds>): void {
    this.regressionThresholds = { ...this.regressionThresholds, ...thresholds };
  }

  /**
   * List all available baselines
   */
  listBaselines(): BaselineEntry[] {
    const files = fs.readdirSync(this.basePath).filter(f => f.endsWith('-baseline.json'));
    const baselines: BaselineEntry[] = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(this.basePath, file), 'utf-8');
      baselines.push(JSON.parse(content));
    }

    return baselines.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get baseline history for a test
   */
  getHistory(testName: string, limit: number = 10): BaselineEntry[] {
    const files = fs.readdirSync(this.basePath).filter(f => f.startsWith(`${testName}-baseline`));

    if (files.length === 0) {
      return [];
    }

    const file = files[0]; // Get the main baseline
    const content = fs.readFileSync(path.join(this.basePath, file), 'utf-8');
    const baseline = JSON.parse(content) as BaselineEntry;

    return [baseline]; // In a real scenario, you might maintain a history array
  }

  /**
   * Export comparison report
   */
  generateComparisonReport(results: LoadTestResults[]): string {
    let report = '# Baseline Comparison Report\n\n';
    report += `Generated: ${new Date().toLocaleString()}\n\n`;

    for (const result of results) {
      const comparison = this.compare(result);

      if (comparison) {
        report += `## ${result.testName}\n\n`;
        report += `**Status**: ${comparison.status.toUpperCase()}\n\n`;
        report += '| Metric | Baseline | Current | Change | Status |\n';
        report += '|--------|----------|---------|--------|--------|\n';

        for (const detail of comparison.details) {
          const status = detail.thresholdExceeded ? '⚠️ EXCEEDED' : '✅ OK';
          report += `| ${detail.metric} | ${detail.baseline.toFixed(2)} | ${detail.current.toFixed(2)} | ${detail.change.toFixed(2)}% | ${status} |\n`;
        }

        report += '\n';
      }
    }

    return report;
  }

  /**
   * Delete a baseline
   */
  deleteBaseline(testName: string): void {
    const filename = path.join(this.basePath, `${testName}-baseline.json`);

    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename);
      console.log(`✅ Baseline deleted: ${filename}`);
    }
  }

  /**
   * Clear all baselines
   */
  clearAll(): void {
    const files = fs.readdirSync(this.basePath).filter(f => f.endsWith('-baseline.json'));

    for (const file of files) {
      fs.unlinkSync(path.join(this.basePath, file));
    }

    console.log(`✅ All baselines cleared`);
  }
}
