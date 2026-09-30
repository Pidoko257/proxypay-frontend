/**
 * Report Generation and Export
 * Export analytics data in multiple formats with filter preservation
 */

import { AnalyticsResult } from './analytics-engine';

export interface FilterMetadata {
  startDate: string;
  endDate: string;
  endpoint: string;
  method: string;
  statusCode: string;
  minResponseTime: number;
  maxResponseTime: number;
}

export interface ExportOptions {
  format: 'json' | 'csv';
  includeCharts?: boolean;
  filename?: string;
  filters?: FilterMetadata;
}

export interface BatchExportItem {
  analytics: AnalyticsResult;
  filters?: FilterMetadata;
  filename?: string;
}

export class ReportGenerator {
  /**
   * Generate JSON report with filter metadata
   */
  static generateJsonReport(analytics: AnalyticsResult, filters?: FilterMetadata): string {
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        filters: filters || null,
      },
      analytics,
    };
    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate CSV report with filter metadata and all metrics
   */
  static generateCsvReport(analytics: AnalyticsResult, filters?: FilterMetadata): string {
    const lines: string[] = [];

    // Report header
    lines.push('SERVER LOGS ANALYTICS REPORT');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Filter metadata section
    if (filters) {
      lines.push('FILTERS APPLIED');
      lines.push(`Start Date,${filters.startDate}`);
      lines.push(`End Date,${filters.endDate}`);
      if (filters.endpoint) lines.push(`Endpoint Filter,${filters.endpoint}`);
      if (filters.method) lines.push(`Method Filter,${filters.method}`);
      if (filters.statusCode) lines.push(`Status Code Filter,${filters.statusCode}`);
      lines.push(`Min Response Time (ms),${filters.minResponseTime}`);
      lines.push(`Max Response Time (ms),${filters.maxResponseTime}`);
      lines.push('');
    }

    // Summary section
    lines.push('SUMMARY');
    lines.push(`Date Range,"${analytics.dateRange.start.toISOString()} to ${analytics.dateRange.end.toISOString()}"`);
    lines.push(`Total Requests,${analytics.totalRequests}`);
    lines.push(`Total Errors,${analytics.totalErrors}`);
    lines.push(`Error Rate (%),"${analytics.errorRate.toFixed(2)}"`);
    lines.push(`Average Response Time (ms),${analytics.avgResponseTime.toFixed(2)}`);
    lines.push(`P95 Response Time (ms),${analytics.p95ResponseTime.toFixed(2)}`);
    lines.push(`P99 Response Time (ms),${analytics.p99ResponseTime.toFixed(2)}`);
    lines.push('');

    // Top endpoints
    lines.push('TOP ENDPOINTS');
    lines.push('Rank,Method,Endpoint,Count,Avg Response Time (ms),P95 Response Time (ms),P99 Response Time (ms),Error Count,Error Rate (%)');
    analytics.topEndpoints.forEach((endpoint, idx) => {
      lines.push(
        `${idx + 1},"${endpoint.method}","${endpoint.endpoint}",${endpoint.count},` +
        `${endpoint.avgResponseTime.toFixed(2)},${endpoint.p95ResponseTime.toFixed(2)},${endpoint.p99ResponseTime.toFixed(2)},` +
        `${endpoint.errorCount},"${endpoint.errorRate.toFixed(2)}"`
      );
    });
    lines.push('');

    // Top errors
    lines.push('TOP ERRORS');
    lines.push('Rank,Error,Count,Percentage (%),First Occurrence,Last Occurrence,Affected Endpoints');
    analytics.topErrors.forEach((error, idx) => {
      const endpoints = error.endpoints.join('; ');
      lines.push(
        `${idx + 1},"${error.error.replace(/"/g, '""')}",${error.count},"${error.percentage.toFixed(2)}"` +
        `,"${error.firstOccurrence.toISOString()}","${error.lastOccurrence.toISOString()}","${endpoints}"`
      );
    });
    lines.push('');

    // Status code breakdown
    lines.push('STATUS CODE BREAKDOWN');
    lines.push('Status Code,Count,Percentage (%),Avg Response Time (ms),Affected Endpoints');
    analytics.statusCodeBreakdown.forEach(status => {
      const endpoints = status.endpoints.join('; ');
      lines.push(
        `${status.code},${status.count},"${status.percentage.toFixed(2)}",${status.avgResponseTime.toFixed(2)},"${endpoints}"`
      );
    });
    lines.push('');

    // Hourly usage
    lines.push('HOURLY USAGE PATTERN');
    lines.push('Hour,Request Count,Avg Response Time (ms),Error Rate (%)');
    analytics.usageByHour.forEach(pattern => {
      lines.push(
        `${pattern.hour}:00,${pattern.count},${pattern.avgResponseTime.toFixed(2)},"${pattern.errorRate.toFixed(2)}"`
      );
    });
    lines.push('');

    // Top users
    lines.push('TOP USERS');
    lines.push('Rank,User ID,Request Count,Unique Endpoints,Error Count,Last Activity');
    analytics.topUsers.forEach((user, idx) => {
      lines.push(
        `${idx + 1},"${user.userId || 'Anonymous'}",${user.requestCount},${user.uniqueEndpoints},${user.errorCount},"${user.lastActivity.toISOString()}"`
      );
    });
    lines.push('');

    // Top IPs
    lines.push('TOP IPs');
    lines.push('Rank,IP Address,Request Count,Unique Endpoints,Error Count,Status Codes');
    analytics.topIPs.forEach((ip, idx) => {
      const statusCodes = Object.entries(ip.statusCodes).map(([code, count]) => `${code}(${count})`).join('; ');
      lines.push(
        `${idx + 1},"${ip.ip || 'Unknown'}",${ip.requestCount},${ip.uniqueEndpoints},${ip.errorCount},"${statusCodes}"`
      );
    });

    return lines.join('\n');
  }

  /**
   * Export report to file
   */
  static exportReport(analytics: AnalyticsResult, options: ExportOptions): void {
    let content = '';
    let mimeType = 'text/plain';
    let extension = 'txt';

    switch (options.format) {
      case 'json':
        content = this.generateJsonReport(analytics, options.filters);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'csv':
        content = this.generateCsvReport(analytics, options.filters);
        mimeType = 'text/csv;charset=utf-8';
        extension = 'csv';
        break;
    }

    const filename = options.filename || `logs-report-${new Date().getTime()}.${extension}`;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  static async exportBatch(items: BatchExportItem[], filename = `logs-analytics-batch-${new Date().toISOString().slice(0, 10)}.zip`): Promise<void> {
    if (items.length === 0) throw new Error('Select at least one date range to export');
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    items.forEach((item, index) => {
      const date = item.filters?.startDate || `range-${index + 1}`;
      const name = item.filename || `logs-analytics-${date}.json`;
      zip.file(name, this.generateJsonReport(item.analytics, item.filters));
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
