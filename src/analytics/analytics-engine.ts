/**
 * Analytics Engine
 * Analyzes parsed logs to generate metrics for endpoints, errors, and usage patterns
 */

import { ParsedLogEntry } from './log-parser';

export interface EndpointMetrics {
  endpoint: string;
  method: string;
  count: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errorCount: number;
  errorRate: number;
  statusCodes: { [code: number]: number };
  successRate: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

export interface ErrorAnalysis {
  error: string;
  count: number;
  percentage: number;
  endpoints: string[];
  statusCodes: number[];
  lastOccurrence: Date;
  firstOccurrence: Date;
}

export interface UsagePattern {
  hour: number;
  count: number;
  avgResponseTime: number;
  errorRate: number;
}

export interface UserAnalysis {
  userId: string;
  requestCount: number;
  uniqueEndpoints: number;
  errorCount: number;
  lastActivity: Date;
}

export interface IPAnalysis {
  ip: string;
  requestCount: number;
  uniqueEndpoints: number;
  statusCodes: { [code: number]: number };
  errorCount: number;
}

export interface StatusCodeAnalysis {
  code: number;
  count: number;
  percentage: number;
  avgResponseTime: number;
  endpoints: string[];
}

export interface AnalyticsResult {
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  dateRange: { start: Date; end: Date };
  topEndpoints: EndpointMetrics[];
  topErrors: ErrorAnalysis[];
  usageByHour: UsagePattern[];
  statusCodeBreakdown: StatusCodeAnalysis[];
  topUsers: UserAnalysis[];
  topIPs: IPAnalysis[];
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

export class LogAnalyticsEngine {
  private logs: ParsedLogEntry[];

  constructor(logs: ParsedLogEntry[]) {
    this.logs = logs;
  }

  /**
   * Run full analytics on logs
   */
  analyze(): AnalyticsResult {
    const totalRequests = this.logs.length;
    const totalErrors = this.logs.filter(log => log.statusCode >= 400).length;

    const dateRange = this.getDateRange();
    const responseTimes = this.logs.map(l => l.responseTime).sort((a, b) => a - b);

    return {
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      dateRange,
      topEndpoints: this.analyzeEndpoints().slice(0, 10),
      topErrors: this.analyzeErrors().slice(0, 10),
      usageByHour: this.analyzeUsageByHour(),
      statusCodeBreakdown: this.analyzeStatusCodes(),
      topUsers: this.analyzeUsers().slice(0, 10),
      topIPs: this.analyzeIPs().slice(0, 10),
      avgResponseTime: this.calculateAverage(responseTimes),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99),
    };
  }

  /**
   * Analyze endpoints for popularity and performance
   */
  private analyzeEndpoints(): EndpointMetrics[] {
    const grouped = this.groupBy(this.logs, log => `${log.method}:${log.endpoint}`);
    const metrics: EndpointMetrics[] = [];

    for (const [key, entries] of grouped.entries()) {
      const [method, endpoint] = key.split(':');
      const responseTimes = entries.map(e => e.responseTime).sort((a, b) => a - b);
      const errors = entries.filter(e => e.statusCode >= 400);
      const statusCodes: { [code: number]: number } = {};

      for (const entry of entries) {
        statusCodes[entry.statusCode] = (statusCodes[entry.statusCode] || 0) + 1;
      }

      metrics.push({
        endpoint,
        method,
        count: entries.length,
        avgResponseTime: this.calculateAverage(responseTimes),
        minResponseTime: responseTimes[0],
        maxResponseTime: responseTimes[responseTimes.length - 1],
        errorCount: errors.length,
        errorRate: (errors.length / entries.length) * 100,
        statusCodes,
        successRate: ((entries.length - errors.length) / entries.length) * 100,
        p95ResponseTime: this.calculatePercentile(responseTimes, 95),
        p99ResponseTime: this.calculatePercentile(responseTimes, 99),
      });
    }

    return metrics.sort((a, b) => b.count - a.count);
  }

  /**
   * Analyze errors and their frequency
   */
  private analyzeErrors(): ErrorAnalysis[] {
    const errorLogs = this.logs.filter(log => log.error || log.statusCode >= 400);
    const grouped = this.groupBy(errorLogs, log => log.error || `HTTP ${log.statusCode}`);
    const analysis: ErrorAnalysis[] = [];

    for (const [error, entries] of grouped.entries()) {
      const endpoints = [...new Set(entries.map(e => e.endpoint))];
      const statusCodes = [...new Set(entries.map(e => e.statusCode))];
      const dates = entries.map(e => e.timestamp).sort((a, b) => a.getTime() - b.getTime());

      analysis.push({
        error,
        count: entries.length,
        percentage: (entries.length / this.logs.length) * 100,
        endpoints,
        statusCodes,
        firstOccurrence: dates[0],
        lastOccurrence: dates[dates.length - 1],
      });
    }

    return analysis.sort((a, b) => b.count - a.count);
  }

  /**
   * Analyze usage patterns by hour
   */
  private analyzeUsageByHour(): UsagePattern[] {
    const byHour = new Map<number, ParsedLogEntry[]>();

    for (const log of this.logs) {
      const hour = log.timestamp.getHours();
      if (!byHour.has(hour)) {
        byHour.set(hour, []);
      }
      byHour.get(hour)!.push(log);
    }

    const patterns: UsagePattern[] = [];

    for (let hour = 0; hour < 24; hour++) {
      const entries = byHour.get(hour) || [];
      const errors = entries.filter(e => e.statusCode >= 400);
      const responseTimes = entries.map(e => e.responseTime);

      patterns.push({
        hour,
        count: entries.length,
        avgResponseTime: this.calculateAverage(responseTimes),
        errorRate: entries.length > 0 ? (errors.length / entries.length) * 100 : 0,
      });
    }

    return patterns;
  }

  /**
   * Analyze status code distribution
   */
  private analyzeStatusCodes(): StatusCodeAnalysis[] {
    const grouped = this.groupBy(this.logs, log => log.statusCode.toString());
    const analysis: StatusCodeAnalysis[] = [];

    for (const [code, entries] of grouped.entries()) {
      const endpoints = [...new Set(entries.map(e => e.endpoint))];
      const responseTimes = entries.map(e => e.responseTime);

      analysis.push({
        code: parseInt(code),
        count: entries.length,
        percentage: (entries.length / this.logs.length) * 100,
        avgResponseTime: this.calculateAverage(responseTimes),
        endpoints,
      });
    }

    return analysis.sort((a, b) => b.count - a.count);
  }

  /**
   * Analyze top users
   */
  private analyzeUsers(): UserAnalysis[] {
    const userLogs = this.logs.filter(log => log.userId);
    const grouped = this.groupBy(userLogs, log => log.userId!);
    const analysis: UserAnalysis[] = [];

    for (const [userId, entries] of grouped.entries()) {
      const endpoints = new Set(entries.map(e => e.endpoint));
      const errors = entries.filter(e => e.statusCode >= 400);
      const timestamps = entries.map(e => e.timestamp);

      analysis.push({
        userId,
        requestCount: entries.length,
        uniqueEndpoints: endpoints.size,
        errorCount: errors.length,
        lastActivity: new Date(Math.max(...timestamps.map(t => t.getTime()))),
      });
    }

    return analysis.sort((a, b) => b.requestCount - a.requestCount);
  }

  /**
   * Analyze top IPs
   */
  private analyzeIPs(): IPAnalysis[] {
    const ipLogs = this.logs.filter(log => log.ip);
    const grouped = this.groupBy(ipLogs, log => log.ip!);
    const analysis: IPAnalysis[] = [];

    for (const [ip, entries] of grouped.entries()) {
      const endpoints = new Set(entries.map(e => e.endpoint));
      const errors = entries.filter(e => e.statusCode >= 400);
      const statusCodes: { [code: number]: number } = {};

      for (const entry of entries) {
        statusCodes[entry.statusCode] = (statusCodes[entry.statusCode] || 0) + 1;
      }

      analysis.push({
        ip,
        requestCount: entries.length,
        uniqueEndpoints: endpoints.size,
        statusCodes,
        errorCount: errors.length,
      });
    }

    return analysis.sort((a, b) => b.requestCount - a.requestCount);
  }

  /**
   * Get date range of logs
   */
  private getDateRange(): { start: Date; end: Date } {
    if (this.logs.length === 0) {
      return { start: new Date(), end: new Date() };
    }

    const timestamps = this.logs.map(l => l.timestamp.getTime());
    return {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps)),
    };
  }

  /**
   * Group entries by key function
   */
  private groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
    const map = new Map<string, T[]>();

    for (const item of items) {
      const key = keyFn(item);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    }

    return map;
  }

  /**
   * Calculate average of numbers
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(sortedNumbers: number[], percentile: number): number {
    if (sortedNumbers.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedNumbers.length) - 1;
    return sortedNumbers[Math.max(0, index)];
  }

  /**
   * Static method to analyze logs
   */
  static analyze(logs: ParsedLogEntry[]): AnalyticsResult {
    const engine = new LogAnalyticsEngine(logs);
    return engine.analyze();
  }

  /**
   * Filter logs by date range
   */
  filterByDateRange(start: Date, end: Date): LogAnalyticsEngine {
    const filtered = this.logs.filter(
      log => log.timestamp >= start && log.timestamp <= end
    );
    return new LogAnalyticsEngine(filtered);
  }

  /**
   * Filter logs by endpoint pattern
   */
  filterByEndpoint(pattern: string | RegExp): LogAnalyticsEngine {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const filtered = this.logs.filter(log => regex.test(log.endpoint));
    return new LogAnalyticsEngine(filtered);
  }

  /**
   * Filter logs by status code
   */
  filterByStatus(statusCode: number): LogAnalyticsEngine {
    const filtered = this.logs.filter(log => log.statusCode === statusCode);
    return new LogAnalyticsEngine(filtered);
  }

  /**
   * Filter logs by status code range
   */
  filterByStatusRange(minCode: number, maxCode: number): LogAnalyticsEngine {
    const filtered = this.logs.filter(
      log => log.statusCode >= minCode && log.statusCode <= maxCode
    );
    return new LogAnalyticsEngine(filtered);
  }

  /**
   * Filter logs by method
   */
  filterByMethod(method: string): LogAnalyticsEngine {
    const filtered = this.logs.filter(log => log.method === method);
    return new LogAnalyticsEngine(filtered);
  }

  /**
   * Get all unique endpoints
   */
  getEndpoints(): string[] {
    return [...new Set(this.logs.map(log => log.endpoint))];
  }

  /**
   * Get all unique methods
   */
  getMethods(): string[] {
    return [...new Set(this.logs.map(log => log.method))];
  }
}
