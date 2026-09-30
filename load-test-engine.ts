/**
 * Load Testing Engine
 * Core execution engine for running load tests
 */

import { performance } from 'perf_hooks';
import axios, { AxiosError, AxiosResponse } from 'axios';
import {
  LoadTestConfig,
  LoadProfile,
  TestRequest,
  LoadTestResults,
  ResponseTimeMetrics,
  RequestBreakdown,
  ThresholdViolation,
} from './load-test.config';

interface RequestMetrics {
  name: string;
  method: string;
  path: string;
  timestamp: number;
  duration: number;
  status: number;
  success: boolean;
  error?: string;
  responseSize: number;
  requestSize: number;
}

interface VirtualUser {
  id: number;
  metrics: RequestMetrics[];
  startTime: number;
}

export class LoadTestEngine {
  private config: LoadTestConfig;
  private allMetrics: RequestMetrics[] = [];
  private virtualUsers: Map<number, VirtualUser> = new Map();
  private isRunning = false;
  private startTime: number = 0;

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  /**
   * Run a specific load profile
   */
  async runProfile(profile: LoadProfile): Promise<LoadTestResults> {
    console.log(`\n📊 Starting load test: ${profile.name}`);
    console.log(`   Duration: ${profile.duration}s, Concurrency: ${profile.concurrency.min}-${profile.concurrency.max}`);

    this.allMetrics = [];
    this.virtualUsers.clear();
    this.isRunning = true;
    this.startTime = Date.now();

    const testStartTime = performance.now();
    const rampUpInterval = (profile.rampUp * 1000) / (profile.concurrency.max - profile.concurrency.min);
    let currentConcurrency = profile.concurrency.min;

    // Start initial users
    for (let i = 0; i < profile.concurrency.min; i++) {
      this.spawnVirtualUser(i, profile);
    }

    // Ramp up phase
    const rampUpPromise = this.rampUp(
      profile,
      rampUpInterval,
      profile.concurrency.max,
      currentConcurrency,
    );

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, profile.duration * 1000));

    // Cool down: stop spawning new users
    this.isRunning = false;

    // Wait for in-flight requests to complete
    await Promise.all([...this.virtualUsers.values()].map(user =>
      new Promise(resolve => {
        const checkComplete = setInterval(() => {
          if (user.metrics.length === 0) {
            clearInterval(checkComplete);
            resolve(null);
          }
        }, 100);
      })
    ));

    const testDuration = performance.now() - testStartTime;
    const results = this.calculateResults(profile.name, testDuration);

    console.log(`\n✅ Test completed: ${profile.name}`);
    console.log(`   Total requests: ${results.totalRequests}`);
    console.log(`   Success rate: ${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%`);
    console.log(`   Throughput: ${results.throughput.toFixed(2)} req/s`);
    console.log(`   P95 Response Time: ${results.responseTime.p95.toFixed(2)}ms`);

    return results;
  }

  /**
   * Ramp up virtual users gradually
   */
  private async rampUp(
    profile: LoadProfile,
    interval: number,
    maxConcurrency: number,
    currentConcurrency: number,
  ): Promise<void> {
    for (let i = currentConcurrency; i < maxConcurrency && this.isRunning; i++) {
      await new Promise(resolve => setTimeout(resolve, interval));
      this.spawnVirtualUser(i, profile);
    }
  }

  /**
   * Spawn a virtual user that sends requests
   */
  private spawnVirtualUser(userId: number, profile: LoadProfile): void {
    const user: VirtualUser = {
      id: userId,
      metrics: [],
      startTime: Date.now(),
    };

    this.virtualUsers.set(userId, user);

    const sendNextRequest = async () => {
      if (!this.isRunning && Date.now() - this.startTime > profile.duration * 1000) {
        this.virtualUsers.delete(userId);
        return;
      }

      const request = this.selectRequest(profile);
      await this.sendRequest(request, user);

      // Think time delay
      await new Promise(resolve => setTimeout(resolve, profile.thinkTime));

      // Send next request
      setImmediate(() => sendNextRequest());
    };

    sendNextRequest();
  }

  /**
   * Select next request based on weights
   */
  private selectRequest(profile: LoadProfile): TestRequest {
    const totalWeight = profile.requests.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;

    for (const request of profile.requests) {
      random -= request.weight;
      if (random <= 0) {
        return request;
      }
    }

    return profile.requests[0];
  }

  /**
   * Send HTTP request and record metrics
   */
  private async sendRequest(request: TestRequest, user: VirtualUser): Promise<void> {
    const startTime = performance.now();
    const url = `${this.config.baseUrl}${request.path}`;
    const requestBody = JSON.stringify(request.body || {});

    try {
      const response = await axios({
        method: request.method,
        url,
        data: request.body,
        headers: {
          'Content-Type': 'application/json',
          ...request.headers,
        },
        timeout: this.config.timeout,
        validateStatus: () => true, // Don't throw on any status
      });

      const duration = performance.now() - startTime;
      const expectedStatuses = request.expectedStatus || [200];
      const success = expectedStatuses.includes(response.status);

      const metric: RequestMetrics = {
        name: request.name,
        method: request.method,
        path: request.path,
        timestamp: Date.now(),
        duration,
        status: response.status,
        success,
        responseSize: JSON.stringify(response.data).length,
        requestSize: requestBody.length,
      };

      this.allMetrics.push(metric);
      user.metrics.push(metric);

      if (this.config.verbose) {
        const statusIcon = success ? '✓' : '✗';
        console.log(`  ${statusIcon} ${request.name} - ${duration.toFixed(2)}ms [${response.status}]`);
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMsg = error instanceof AxiosError ? error.message : 'Unknown error';

      const metric: RequestMetrics = {
        name: request.name,
        method: request.method,
        path: request.path,
        timestamp: Date.now(),
        duration,
        status: 0,
        success: false,
        error: errorMsg,
        responseSize: 0,
        requestSize: requestBody.length,
      };

      this.allMetrics.push(metric);
      user.metrics.push(metric);

      if (this.config.verbose) {
        console.log(`  ✗ ${request.name} - ERROR: ${errorMsg}`);
      }
    }
  }

  /**
   * Calculate results and check thresholds
   */
  private calculateResults(testName: string, duration: number): LoadTestResults {
    const metrics = this.allMetrics;
    const successfulRequests = metrics.filter(m => m.success).length;
    const failedRequests = metrics.length - successfulRequests;
    const errorRate = (failedRequests / metrics.length) * 100;
    const throughput = metrics.length / (duration / 1000);

    const responseTimes = metrics.map(m => m.duration).sort((a, b) => a - b);
    const responseTime = this.calculatePercentiles(responseTimes);

    const breakdown = this.calculateBreakdown(metrics);
    const violations = this.checkThresholds(responseTime, errorRate, throughput);

    return {
      testName,
      timestamp: this.startTime,
      duration,
      totalRequests: metrics.length,
      successfulRequests,
      failedRequests,
      errorRate,
      throughput,
      responseTime,
      breakdown,
      thresholdsPassed: violations.length === 0,
      violations,
    };
  }

  /**
   * Calculate percentiles for response times
   */
  private calculatePercentiles(sortedTimes: number[]): ResponseTimeMetrics {
    const len = sortedTimes.length;
    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * len) - 1;
      return sortedTimes[Math.max(0, index)];
    };

    const sum = sortedTimes.reduce((a, b) => a + b, 0);
    const mean = sum / len;
    const variance = sortedTimes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / len;
    const stdDev = Math.sqrt(variance);

    return {
      min: sortedTimes[0],
      max: sortedTimes[len - 1],
      mean,
      median: sortedTimes[Math.floor(len / 2)],
      p50: getPercentile(50),
      p75: getPercentile(75),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99),
      stdDev,
    };
  }

  /**
   * Break down metrics by request type
   */
  private calculateBreakdown(metrics: RequestMetrics[]): RequestBreakdown[] {
    const grouped = new Map<string, RequestMetrics[]>();

    for (const metric of metrics) {
      const key = metric.name;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(metric);
    }

    const breakdown: RequestBreakdown[] = [];

    for (const [name, requestMetrics] of grouped) {
      const successful = requestMetrics.filter(m => m.success).length;
      const failed = requestMetrics.length - successful;
      const times = requestMetrics.map(m => m.duration).sort((a, b) => a - b);
      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      const p95Index = Math.ceil((95 / 100) * times.length) - 1;

      breakdown.push({
        name,
        count: requestMetrics.length,
        successful,
        failed,
        errorRate: (failed / requestMetrics.length) * 100,
        minTime: times[0],
        maxTime: times[times.length - 1],
        meanTime: mean,
        p95Time: times[Math.max(0, p95Index)],
      });
    }

    return breakdown.sort((a, b) => b.count - a.count);
  }

  /**
   * Check if results violate thresholds
   */
  private checkThresholds(
    responseTime: ResponseTimeMetrics,
    errorRate: number,
    throughput: number,
  ): ThresholdViolation[] {
    const violations: ThresholdViolation[] = [];
    const t = this.config.thresholds;

    if (responseTime.p50 > t.p50ResponseTime) {
      violations.push({
        metric: 'p50ResponseTime',
        expected: t.p50ResponseTime,
        actual: responseTime.p50,
        severity: 'warning',
      });
    }

    if (responseTime.p95 > t.p95ResponseTime) {
      violations.push({
        metric: 'p95ResponseTime',
        expected: t.p95ResponseTime,
        actual: responseTime.p95,
        severity: 'warning',
      });
    }

    if (responseTime.p99 > t.p99ResponseTime) {
      violations.push({
        metric: 'p99ResponseTime',
        expected: t.p99ResponseTime,
        actual: responseTime.p99,
        severity: 'warning',
      });
    }

    if (responseTime.max > t.maxResponseTime) {
      violations.push({
        metric: 'maxResponseTime',
        expected: t.maxResponseTime,
        actual: responseTime.max,
        severity: 'critical',
      });
    }

    if (errorRate > t.errorRate) {
      violations.push({
        metric: 'errorRate',
        expected: t.errorRate,
        actual: errorRate,
        severity: 'critical',
      });
    }

    if (throughput < t.minThroughput) {
      violations.push({
        metric: 'minThroughput',
        expected: t.minThroughput,
        actual: throughput,
        severity: 'critical',
      });
    }

    return violations;
  }

  /**
   * Stop current test
   */
  stop(): void {
    this.isRunning = false;
  }
}
