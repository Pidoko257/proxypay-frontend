/**
 * Metrics Collector and Monitoring Module
 * Collects, aggregates, and monitors performance metrics in real-time
 */

import { LoadTestResults, RequestBreakdown } from './load-test.config';

export interface MetricSnapshot {
  timestamp: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  throughput: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  avgResponseTime: number;
}

export interface PerformanceTrend {
  metric: string;
  values: number[];
  average: number;
  min: number;
  max: number;
  trend: 'improving' | 'stable' | 'degrading';
}

export interface HealthStatus {
  healthy: boolean;
  alerts: Alert[];
  warnings: Warning[];
}

export interface Alert {
  metric: string;
  message: string;
  threshold: number;
  actual: number;
  timestamp: number;
  severity: 'critical' | 'warning';
}

export interface Warning {
  metric: string;
  message: string;
  timestamp: number;
}

export class MetricsCollector {
  private snapshots: MetricSnapshot[] = [];
  private alerts: Alert[] = [];
  private warnings: Warning[] = [];
  private alertThresholds = {
    errorRate: 5, // percentage
    p95ResponseTime: 2000, // milliseconds
    p99ResponseTime: 5000,
    minThroughput: 5, // requests per second
  };

  /**
   * Record test results as a metric snapshot
   */
  record(results: LoadTestResults): void {
    const snapshot: MetricSnapshot = {
      timestamp: results.timestamp,
      totalRequests: results.totalRequests,
      successfulRequests: results.successfulRequests,
      failedRequests: results.failedRequests,
      errorRate: results.errorRate,
      throughput: results.throughput,
      p95ResponseTime: results.responseTime.p95,
      p99ResponseTime: results.responseTime.p99,
      avgResponseTime: results.responseTime.mean,
    };

    this.snapshots.push(snapshot);
    this.checkHealthAlerts(snapshot);
  }

  /**
   * Check for health alerts and warnings
   */
  private checkHealthAlerts(snapshot: MetricSnapshot): void {
    // Check error rate
    if (snapshot.errorRate > this.alertThresholds.errorRate) {
      this.alerts.push({
        metric: 'errorRate',
        message: `Error rate (${snapshot.errorRate.toFixed(2)}%) exceeds threshold (${this.alertThresholds.errorRate}%)`,
        threshold: this.alertThresholds.errorRate,
        actual: snapshot.errorRate,
        timestamp: snapshot.timestamp,
        severity: snapshot.errorRate > this.alertThresholds.errorRate * 2 ? 'critical' : 'warning',
      });
    }

    // Check P95 response time
    if (snapshot.p95ResponseTime > this.alertThresholds.p95ResponseTime) {
      this.alerts.push({
        metric: 'p95ResponseTime',
        message: `P95 response time (${snapshot.p95ResponseTime.toFixed(2)}ms) exceeds threshold (${this.alertThresholds.p95ResponseTime}ms)`,
        threshold: this.alertThresholds.p95ResponseTime,
        actual: snapshot.p95ResponseTime,
        timestamp: snapshot.timestamp,
        severity: 'warning',
      });
    }

    // Check P99 response time
    if (snapshot.p99ResponseTime > this.alertThresholds.p99ResponseTime) {
      this.alerts.push({
        metric: 'p99ResponseTime',
        message: `P99 response time (${snapshot.p99ResponseTime.toFixed(2)}ms) exceeds threshold (${this.alertThresholds.p99ResponseTime}ms)`,
        threshold: this.alertThresholds.p99ResponseTime,
        actual: snapshot.p99ResponseTime,
        timestamp: snapshot.timestamp,
        severity: 'critical',
      });
    }

    // Check minimum throughput
    if (snapshot.throughput < this.alertThresholds.minThroughput) {
      this.alerts.push({
        metric: 'minThroughput',
        message: `Throughput (${snapshot.throughput.toFixed(2)} req/s) is below minimum (${this.alertThresholds.minThroughput} req/s)`,
        threshold: this.alertThresholds.minThroughput,
        actual: snapshot.throughput,
        timestamp: snapshot.timestamp,
        severity: 'critical',
      });
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus(): HealthStatus {
    const recentAlerts = this.alerts.filter(a => Date.now() - a.timestamp < 60000); // Last 60 seconds
    const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical');

    return {
      healthy: criticalAlerts.length === 0,
      alerts: criticalAlerts,
      warnings: recentAlerts.filter(a => a.severity === 'warning'),
    };
  }

  /**
   * Get performance trends
   */
  getTrends(): PerformanceTrend[] {
    if (this.snapshots.length < 2) {
      return [];
    }

    const metrics = ['errorRate', 'p95ResponseTime', 'throughput'] as const;
    const trends: PerformanceTrend[] = [];

    for (const metric of metrics) {
      const values = this.snapshots.map(s => s[metric]);
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      // Determine trend: compare first half vs second half
      const mid = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
      const secondHalf = values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid);

      let trend: 'improving' | 'stable' | 'degrading' = 'stable';
      const percentChange = ((secondHalf - firstHalf) / firstHalf) * 100;

      if (metric === 'throughput') {
        // For throughput, increasing is good
        if (percentChange > 5) trend = 'improving';
        else if (percentChange < -5) trend = 'degrading';
      } else {
        // For error rate and response time, decreasing is good
        if (percentChange < -5) trend = 'improving';
        else if (percentChange > 5) trend = 'degrading';
      }

      trends.push({
        metric,
        values,
        average,
        min,
        max,
        trend,
      });
    }

    return trends;
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalTests: number;
    averageThroughput: number;
    averageErrorRate: number;
    averageP95ResponseTime: number;
    averageP99ResponseTime: number;
  } {
    if (this.snapshots.length === 0) {
      return {
        totalTests: 0,
        averageThroughput: 0,
        averageErrorRate: 0,
        averageP95ResponseTime: 0,
        averageP99ResponseTime: 0,
      };
    }

    const total = this.snapshots.length;
    return {
      totalTests: total,
      averageThroughput: this.snapshots.reduce((sum, s) => sum + s.throughput, 0) / total,
      averageErrorRate: this.snapshots.reduce((sum, s) => sum + s.errorRate, 0) / total,
      averageP95ResponseTime: this.snapshots.reduce((sum, s) => sum + s.p95ResponseTime, 0) / total,
      averageP99ResponseTime: this.snapshots.reduce((sum, s) => sum + s.p99ResponseTime, 0) / total,
    };
  }

  /**
   * Set custom alert thresholds
   */
  setAlertThresholds(thresholds: Partial<typeof MetricsCollector.prototype.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }

  /**
   * Get all alerts
   */
  getAlerts(): Alert[] {
    return [...this.alerts];
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.snapshots = [];
    this.alerts = [];
    this.warnings = [];
  }

  /**
   * Export metrics as JSON
   */
  exportJSON(): {
    snapshots: MetricSnapshot[];
    alerts: Alert[];
    summary: ReturnType<MetricsCollector['getSummary']>;
    trends: PerformanceTrend[];
  } {
    return {
      snapshots: this.snapshots,
      alerts: this.alerts,
      summary: this.getSummary(),
      trends: this.getTrends(),
    };
  }
}
