/**
 * Report Generation and Export
 * Export analytics data in multiple formats
 */

import { AnalyticsResult } from './analytics-engine';

export interface ExportOptions {
  format: 'json' | 'csv' | 'html' | 'markdown';
  includeCharts?: boolean;
  filename?: string;
}

export class ReportGenerator {
  /**
   * Generate JSON report
   */
  static generateJsonReport(analytics: AnalyticsResult): string {
    return JSON.stringify(analytics, null, 2);
  }

  /**
   * Generate CSV report
   */
  static generateCsvReport(analytics: AnalyticsResult): string {
    const lines: string[] = [];

    // Summary section
    lines.push('SERVER LOGS ANALYTICS REPORT');
    lines.push('');
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
    lines.push('Rank,Method,Endpoint,Count,Avg Response Time (ms),Error Rate (%)');
    analytics.topEndpoints.forEach((endpoint, idx) => {
      lines.push(
        `${idx + 1},"${endpoint.method}","${endpoint.endpoint}",${endpoint.count},` +
        `${endpoint.avgResponseTime.toFixed(2)},"${endpoint.errorRate.toFixed(2)}"`
      );
    });
    lines.push('');

    // Top errors
    lines.push('TOP ERRORS');
    lines.push('Rank,Error,Count,Percentage (%)');
    analytics.topErrors.forEach((error, idx) => {
      lines.push(`${idx + 1},"${error.error.replace(/"/g, '""')}",${error.count},"${error.percentage.toFixed(2)}"`);
    });
    lines.push('');

    // Status code breakdown
    lines.push('STATUS CODE BREAKDOWN');
    lines.push('Status Code,Count,Percentage (%)');
    analytics.statusCodeBreakdown.forEach(status => {
      lines.push(`${status.code},${status.count},"${status.percentage.toFixed(2)}"`);
    });
    lines.push('');

    // Hourly usage
    lines.push('HOURLY USAGE PATTERN');
    lines.push('Hour,Request Count,Avg Response Time (ms),Error Rate (%)');
    analytics.usageByHour.forEach(pattern => {
      lines.push(`${pattern.hour}:00,${pattern.count},${pattern.avgResponseTime.toFixed(2)},"${pattern.errorRate.toFixed(2)}"`);
    });
    lines.push('');

    // Top users
    lines.push('TOP USERS');
    lines.push('Rank,User ID,Request Count,Unique Endpoints,Errors');
    analytics.topUsers.forEach((user, idx) => {
      lines.push(`${idx + 1},"${user.userId || 'Anonymous'}",${user.requestCount},${user.uniqueEndpoints},${user.errorCount}`);
    });
    lines.push('');

    // Top IPs
    lines.push('TOP IPs');
    lines.push('Rank,IP Address,Request Count,Unique Endpoints,Errors');
    analytics.topIPs.forEach((ip, idx) => {
      lines.push(`${idx + 1},"${ip.ip || 'Unknown'}",${ip.requestCount},${ip.uniqueEndpoints},${ip.errorCount}`);
    });

    return lines.join('\n');
  }

  /**
   * Generate Markdown report
   */
  static generateMarkdownReport(analytics: AnalyticsResult): string {
    let md = '# Server Logs Analytics Report\n\n';

    // Summary
    md += '## Summary\n\n';
    md += `**Date Range:** ${analytics.dateRange.start.toISOString()} to ${analytics.dateRange.end.toISOString()}\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Requests | ${analytics.totalRequests.toLocaleString()} |\n`;
    md += `| Total Errors | ${analytics.totalErrors.toLocaleString()} |\n`;
    md += `| Error Rate | ${analytics.errorRate.toFixed(2)}% |\n`;
    md += `| Avg Response Time | ${analytics.avgResponseTime.toFixed(2)}ms |\n`;
    md += `| P95 Response Time | ${analytics.p95ResponseTime.toFixed(2)}ms |\n`;
    md += `| P99 Response Time | ${analytics.p99ResponseTime.toFixed(2)}ms |\n\n`;

    // Top endpoints
    md += '## Top Endpoints\n\n';
    md += `| Rank | Method | Endpoint | Requests | Avg Time | Error Rate |\n`;
    md += `|------|--------|----------|----------|----------|------------|\n`;
    analytics.topEndpoints.slice(0, 10).forEach((endpoint, idx) => {
      md += `| ${idx + 1} | ${endpoint.method} | \`${endpoint.endpoint}\` | ${endpoint.count} | ` +
        `${endpoint.avgResponseTime.toFixed(2)}ms | ${endpoint.errorRate.toFixed(2)}% |\n`;
    });
    md += '\n';

    // Top errors
    if (analytics.topErrors.length > 0) {
      md += '## Top Errors\n\n';
      md += `| Rank | Error | Count | Percentage |\n`;
      md += `|------|-------|-------|------------|\n`;
      analytics.topErrors.slice(0, 10).forEach((error, idx) => {
        md += `| ${idx + 1} | ${error.error} | ${error.count} | ${error.percentage.toFixed(2)}% |\n`;
      });
      md += '\n';
    }

    // Status codes
    md += '## Status Code Distribution\n\n';
    md += `| Code | Count | Percentage |\n`;
    md += `|------|-------|------------|\n`;
    analytics.statusCodeBreakdown.forEach(status => {
      md += `| ${status.code} | ${status.count} | ${status.percentage.toFixed(2)}% |\n`;
    });
    md += '\n';

    // Usage by hour
    md += '## Hourly Usage Pattern\n\n';
    md += `| Hour | Requests | Avg Response | Error Rate |\n`;
    md += `|------|----------|--------------|------------|\n`;
    analytics.usageByHour.forEach(pattern => {
      md += `| ${pattern.hour}:00 | ${pattern.count} | ${pattern.avgResponseTime.toFixed(2)}ms | ${pattern.errorRate.toFixed(2)}% |\n`;
    });
    md += '\n';

    // Top users
    if (analytics.topUsers.length > 0) {
      md += '## Top Users\n\n';
      md += `| Rank | User ID | Requests | Endpoints | Errors |\n`;
      md += `|------|---------|----------|-----------|--------|\n`;
      analytics.topUsers.slice(0, 10).forEach((user, idx) => {
        md += `| ${idx + 1} | ${user.userId || 'Anonymous'} | ${user.requestCount} | ${user.uniqueEndpoints} | ${user.errorCount} |\n`;
      });
      md += '\n';
    }

    // Top IPs
    if (analytics.topIPs.length > 0) {
      md += '## Top IPs\n\n';
      md += `| Rank | IP | Requests | Endpoints | Errors |\n`;
      md += `|------|-----|----------|-----------|--------|\n`;
      analytics.topIPs.slice(0, 10).forEach((ip, idx) => {
        md += `| ${idx + 1} | ${ip.ip || 'Unknown'} | ${ip.requestCount} | ${ip.uniqueEndpoints} | ${ip.errorCount} |\n`;
      });
      md += '\n';
    }

    md += `---\n\n*Report generated on ${new Date().toISOString()}*\n`;

    return md;
  }

  /**
   * Generate HTML report
   */
  static generateHtmlReport(analytics: AnalyticsResult): string {
    const csvData = this.generateCsvReport(analytics);
    const markdownData = this.generateMarkdownReport(analytics);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Server Logs Analytics Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f7fa;
      padding: 20px;
      color: #2c3e50;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
    }
    
    header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    
    header p {
      opacity: 0.9;
      font-size: 1.1em;
    }
    
    .content {
      padding: 40px;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .metric-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 12px;
      text-align: center;
    }
    
    .metric-card h3 {
      font-size: 0.9em;
      opacity: 0.9;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .metric-card .value {
      font-size: 2.2em;
      font-weight: bold;
    }
    
    h2 {
      margin-top: 40px;
      margin-bottom: 20px;
      color: #2c3e50;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    th {
      background: #f0f0f0;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #667eea;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #ecf0f1;
    }
    
    tr:hover {
      background: #f9f9f9;
    }
    
    footer {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      color: #7f8c8d;
      font-size: 0.9em;
      border-top: 1px solid #ecf0f1;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 Server Logs Analytics Report</h1>
      <p>Generated on ${new Date().toLocaleString()}</p>
    </header>
    
    <div class="content">
      <h2>Summary</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <h3>Total Requests</h3>
          <div class="value">${analytics.totalRequests.toLocaleString()}</div>
        </div>
        <div class="metric-card">
          <h3>Total Errors</h3>
          <div class="value">${analytics.totalErrors.toLocaleString()}</div>
        </div>
        <div class="metric-card">
          <h3>Error Rate</h3>
          <div class="value">${analytics.errorRate.toFixed(2)}%</div>
        </div>
        <div class="metric-card">
          <h3>Avg Response Time</h3>
          <div class="value">${analytics.avgResponseTime.toFixed(0)}ms</div>
        </div>
        <div class="metric-card">
          <h3>P95 Response Time</h3>
          <div class="value">${analytics.p95ResponseTime.toFixed(0)}ms</div>
        </div>
        <div class="metric-card">
          <h3>P99 Response Time</h3>
          <div class="value">${analytics.p99ResponseTime.toFixed(0)}ms</div>
        </div>
      </div>
      
      <h2>Top Endpoints</h2>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Endpoint</th>
            <th>Requests</th>
            <th>Avg Time</th>
            <th>Error Rate</th>
          </tr>
        </thead>
        <tbody>
          ${analytics.topEndpoints.slice(0, 10).map(endpoint => `
            <tr>
              <td>${endpoint.method}</td>
              <td><code>${endpoint.endpoint}</code></td>
              <td>${endpoint.count.toLocaleString()}</td>
              <td>${endpoint.avgResponseTime.toFixed(2)}ms</td>
              <td>${endpoint.errorRate.toFixed(2)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${analytics.topErrors.length > 0 ? `
        <h2>Top Errors</h2>
        <table>
          <thead>
            <tr>
              <th>Error</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${analytics.topErrors.slice(0, 10).map(error => `
              <tr>
                <td>${error.error}</td>
                <td>${error.count.toLocaleString()}</td>
                <td>${error.percentage.toFixed(2)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
      
      <h2>Status Code Distribution</h2>
      <table>
        <thead>
          <tr>
            <th>Status Code</th>
            <th>Count</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${analytics.statusCodeBreakdown.map(status => `
            <tr>
              <td>${status.code}</td>
              <td>${status.count.toLocaleString()}</td>
              <td>${status.percentage.toFixed(2)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <footer>
      Report generated on ${new Date().toLocaleString()}
    </footer>
  </div>
</body>
</html>
    `;

    return html;
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
        content = this.generateJsonReport(analytics);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'csv':
        content = this.generateCsvReport(analytics);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'html':
        content = this.generateHtmlReport(analytics);
        mimeType = 'text/html';
        extension = 'html';
        break;
      case 'markdown':
        content = this.generateMarkdownReport(analytics);
        mimeType = 'text/markdown';
        extension = 'md';
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
}
