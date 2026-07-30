/**
 * Load Testing Reporter
 * Generates reports in multiple formats (HTML, JSON, CSV, Console)
 */

import * as fs from 'fs';
import * as path from 'path';
import { LoadTestResults, RequestBreakdown } from './load-test.config';

export class LoadTestReporter {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    this.ensureOutputDir();
  }

  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate all report formats
   */
  generateReports(results: LoadTestResults, formats: string[]): void {
    for (const format of formats) {
      switch (format) {
        case 'json':
          this.generateJsonReport(results);
          break;
        case 'csv':
          this.generateCsvReport(results);
          break;
        case 'html':
          this.generateHtmlReport(results);
          break;
        case 'console':
          this.printConsoleReport(results);
          break;
      }
    }
  }

  /**
   * Generate JSON report
   */
  private generateJsonReport(results: LoadTestResults): void {
    const filename = path.join(
      this.outputDir,
      `${results.testName}-${results.timestamp}.json`
    );
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n📄 JSON Report: ${filename}`);
  }

  /**
   * Generate CSV report
   */
  private generateCsvReport(results: LoadTestResults): void {
    const lines: string[] = [];

    // Summary section
    lines.push('# Load Test Summary');
    lines.push(`Test Name,${results.testName}`);
    lines.push(`Timestamp,${new Date(results.timestamp).toISOString()}`);
    lines.push(`Duration (ms),${results.duration}`);
    lines.push(`Total Requests,${results.totalRequests}`);
    lines.push(`Successful,${results.successfulRequests}`);
    lines.push(`Failed,${results.failedRequests}`);
    lines.push(`Error Rate (%),${results.errorRate.toFixed(2)}`);
    lines.push(`Throughput (req/s),${results.throughput.toFixed(2)}`);
    lines.push('');

    // Response time metrics
    lines.push('# Response Time Metrics (ms)');
    lines.push('Metric,Value');
    lines.push(`Min,${results.responseTime.min.toFixed(2)}`);
    lines.push(`Max,${results.responseTime.max.toFixed(2)}`);
    lines.push(`Mean,${results.responseTime.mean.toFixed(2)}`);
    lines.push(`Median,${results.responseTime.median.toFixed(2)}`);
    lines.push(`P50,${results.responseTime.p50.toFixed(2)}`);
    lines.push(`P75,${results.responseTime.p75.toFixed(2)}`);
    lines.push(`P90,${results.responseTime.p90.toFixed(2)}`);
    lines.push(`P95,${results.responseTime.p95.toFixed(2)}`);
    lines.push(`P99,${results.responseTime.p99.toFixed(2)}`);
    lines.push(`Std Dev,${results.responseTime.stdDev.toFixed(2)}`);
    lines.push('');

    // Request breakdown
    lines.push('# Request Breakdown');
    lines.push('Request,Count,Successful,Failed,Error Rate (%),Min (ms),Max (ms),Mean (ms),P95 (ms)');
    for (const breakdown of results.breakdown) {
      lines.push(
        `"${breakdown.name}",${breakdown.count},${breakdown.successful},${breakdown.failed},` +
        `${breakdown.errorRate.toFixed(2)},${breakdown.minTime.toFixed(2)},${breakdown.maxTime.toFixed(2)},` +
        `${breakdown.meanTime.toFixed(2)},${breakdown.p95Time.toFixed(2)}`
      );
    }
    lines.push('');

    // Threshold violations
    lines.push('# Threshold Violations');
    lines.push('Metric,Expected,Actual,Severity');
    for (const violation of results.violations) {
      lines.push(
        `"${violation.metric}",${violation.expected.toFixed(2)},${violation.actual.toFixed(2)},${violation.severity}`
      );
    }

    const filename = path.join(
      this.outputDir,
      `${results.testName}-${results.timestamp}.csv`
    );
    fs.writeFileSync(filename, lines.join('\n'));
    console.log(`\n📊 CSV Report: ${filename}`);
  }

  /**
   * Generate HTML report with charts
   */
  private generateHtmlReport(results: LoadTestResults): void {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Load Test Report - ${results.testName}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f7fa;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 0;
      margin-bottom: 30px;
      border-radius: 8px 8px 0 0;
    }
    
    h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    
    .subtitle {
      opacity: 0.9;
      font-size: 1.1em;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .metric-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-left: 4px solid #667eea;
    }
    
    .metric-value {
      font-size: 2.5em;
      font-weight: bold;
      color: #667eea;
      margin: 10px 0;
    }
    
    .metric-label {
      color: #666;
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .status-pass {
      color: #27ae60;
      border-left-color: #27ae60;
    }
    
    .status-fail {
      color: #e74c3c;
      border-left-color: #e74c3c;
    }
    
    .chart-container {
      background: white;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .chart-container h3 {
      margin-bottom: 20px;
      color: #333;
    }
    
    canvas {
      max-height: 400px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    
    thead {
      background: #f0f0f0;
      font-weight: 600;
    }
    
    th {
      padding: 12px;
      text-align: left;
      border-bottom: 2px solid #e0e0e0;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
    }
    
    tbody tr:hover {
      background: #f9f9f9;
    }
    
    .violation-table td:first-child {
      color: #667eea;
      font-weight: 600;
    }
    
    .violation-warning {
      background: #fff3cd;
    }
    
    .violation-critical {
      background: #f8d7da;
    }
    
    .section {
      margin-bottom: 40px;
    }
    
    .section h2 {
      margin-bottom: 20px;
      color: #333;
      font-size: 1.5em;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    
    footer {
      text-align: center;
      color: #999;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
    
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 0.9em;
    }
    
    .badge-pass {
      background: #d4edda;
      color: #155724;
    }
    
    .badge-fail {
      background: #f8d7da;
      color: #721c24;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Load Test Report</h1>
      <p class="subtitle">${results.testName}</p>
      <p class="subtitle">Generated: ${new Date(results.timestamp).toLocaleString()}</p>
    </header>
    
    <div class="section">
      <div class="metrics-grid">
        <div class="metric-card ${results.thresholdsPassed ? 'status-pass' : 'status-fail'}">
          <div class="metric-label">Overall Status</div>
          <div class="metric-value">
            <span class="status-badge ${results.thresholdsPassed ? 'badge-pass' : 'badge-fail'}">
              ${results.thresholdsPassed ? 'PASSED' : 'FAILED'}
            </span>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Total Requests</div>
          <div class="metric-value">${results.totalRequests.toLocaleString()}</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Success Rate</div>
          <div class="metric-value">${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Throughput</div>
          <div class="metric-value">${results.throughput.toFixed(2)}</div>
          <small>req/s</small>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">P95 Response Time</div>
          <div class="metric-value">${results.responseTime.p95.toFixed(2)}ms</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Error Rate</div>
          <div class="metric-value">${results.errorRate.toFixed(2)}%</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>Response Time Distribution</h2>
      <div class="chart-container">
        <canvas id="responseTimeChart"></canvas>
      </div>
    </div>
    
    <div class="section">
      <h2>Request Breakdown</h2>
      <div class="chart-container">
        <canvas id="requestBreakdownChart"></canvas>
      </div>
    </div>
    
    <div class="section">
      <h2>Response Time Percentiles</h2>
      <div class="chart-container">
        <canvas id="percentilesChart"></canvas>
      </div>
    </div>
    
    <div class="section">
      <h2>Request Details</h2>
      <table>
        <thead>
          <tr>
            <th>Request</th>
            <th>Count</th>
            <th>Success</th>
            <th>Failed</th>
            <th>Error Rate</th>
            <th>Mean (ms)</th>
            <th>P95 (ms)</th>
          </tr>
        </thead>
        <tbody>
          ${results.breakdown.map(b => `
            <tr>
              <td>${b.name}</td>
              <td>${b.count}</td>
              <td>${b.successful}</td>
              <td>${b.failed}</td>
              <td>${b.errorRate.toFixed(2)}%</td>
              <td>${b.meanTime.toFixed(2)}</td>
              <td>${b.p95Time.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    ${results.violations.length > 0 ? `
    <div class="section">
      <h2>⚠️ Threshold Violations</h2>
      <table class="violation-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Expected</th>
            <th>Actual</th>
            <th>Severity</th>
          </tr>
        </thead>
        <tbody>
          ${results.violations.map(v => `
            <tr class="violation-${v.severity}">
              <td>${v.metric}</td>
              <td>${v.expected.toFixed(2)}</td>
              <td>${v.actual.toFixed(2)}</td>
              <td>${v.severity.toUpperCase()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    
    <footer>
      <p>Load Test Report • Generated on ${new Date().toLocaleString()}</p>
    </footer>
  </div>
  
  <script>
    // Response Time Distribution
    const ctx1 = document.getElementById('responseTimeChart').getContext('2d');
    new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: ['Min', 'P50', 'Mean', 'P95', 'P99', 'Max'],
        datasets: [{
          label: 'Response Time (ms)',
          data: [
            ${results.responseTime.min.toFixed(2)},
            ${results.responseTime.p50.toFixed(2)},
            ${results.responseTime.mean.toFixed(2)},
            ${results.responseTime.p95.toFixed(2)},
            ${results.responseTime.p99.toFixed(2)},
            ${results.responseTime.max.toFixed(2)}
          ],
          backgroundColor: ['#27ae60', '#3498db', '#667eea', '#f39c12', '#e74c3c', '#c0392b'],
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
    
    // Request Breakdown
    const ctx2 = document.getElementById('requestBreakdownChart').getContext('2d');
    new Chart(ctx2, {
      type: 'pie',
      data: {
        labels: ${JSON.stringify(results.breakdown.map(b => b.name))},
        datasets: [{
          data: ${JSON.stringify(results.breakdown.map(b => b.count))},
          backgroundColor: [
            '#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe',
            '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#330867'
          ],
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
      }
    });
    
    // Percentiles
    const ctx3 = document.getElementById('percentilesChart').getContext('2d');
    new Chart(ctx3, {
      type: 'line',
      data: {
        labels: ['P50', 'P75', 'P90', 'P95', 'P99'],
        datasets: [{
          label: 'Response Time (ms)',
          data: [
            ${results.responseTime.p50.toFixed(2)},
            ${results.responseTime.p75.toFixed(2)},
            ${results.responseTime.p90.toFixed(2)},
            ${results.responseTime.p95.toFixed(2)},
            ${results.responseTime.p99.toFixed(2)}
          ],
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true },
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  </script>
</body>
</html>
    `;

    const filename = path.join(
      this.outputDir,
      `${results.testName}-${results.timestamp}.html`
    );
    fs.writeFileSync(filename, html);
    console.log(`\n📊 HTML Report: ${filename}`);
  }

  /**
   * Print console report
   */
  private printConsoleReport(results: LoadTestResults): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 LOAD TEST REPORT');
    console.log('='.repeat(80));

    console.log('\n📋 TEST SUMMARY');
    console.log(`  Test Name:       ${results.testName}`);
    console.log(`  Timestamp:       ${new Date(results.timestamp).toLocaleString()}`);
    console.log(`  Duration:        ${(results.duration / 1000).toFixed(2)}s`);
    console.log(`  Status:          ${results.thresholdsPassed ? '✅ PASSED' : '❌ FAILED'}`);

    console.log('\n📈 REQUESTS');
    console.log(`  Total:           ${results.totalRequests.toLocaleString()}`);
    console.log(`  Successful:      ${results.successfulRequests.toLocaleString()} (${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`  Failed:          ${results.failedRequests.toLocaleString()} (${results.errorRate.toFixed(2)}%)`);
    console.log(`  Throughput:      ${results.throughput.toFixed(2)} req/s`);

    console.log('\n⏱️  RESPONSE TIME (ms)');
    console.log(`  Min:             ${results.responseTime.min.toFixed(2)}`);
    console.log(`  Mean:            ${results.responseTime.mean.toFixed(2)}`);
    console.log(`  Median:          ${results.responseTime.median.toFixed(2)}`);
    console.log(`  P50:             ${results.responseTime.p50.toFixed(2)}`);
    console.log(`  P75:             ${results.responseTime.p75.toFixed(2)}`);
    console.log(`  P90:             ${results.responseTime.p90.toFixed(2)}`);
    console.log(`  P95:             ${results.responseTime.p95.toFixed(2)}`);
    console.log(`  P99:             ${results.responseTime.p99.toFixed(2)}`);
    console.log(`  Max:             ${results.responseTime.max.toFixed(2)}`);
    console.log(`  Std Dev:         ${results.responseTime.stdDev.toFixed(2)}`);

    console.log('\n📊 REQUEST BREAKDOWN');
    console.log('  Name                          Count    Success    Failed    Mean(ms)    P95(ms)');
    console.log('  ' + '-'.repeat(76));
    for (const breakdown of results.breakdown) {
      const name = breakdown.name.padEnd(30);
      const count = breakdown.count.toString().padStart(8);
      const success = breakdown.successful.toString().padStart(10);
      const failed = breakdown.failed.toString().padStart(10);
      const mean = breakdown.meanTime.toFixed(2).padStart(11);
      const p95 = breakdown.p95Time.toFixed(2).padStart(10);
      console.log(`  ${name}${count}${success}${failed}${mean}${p95}`);
    }

    if (results.violations.length > 0) {
      console.log('\n⚠️  THRESHOLD VIOLATIONS');
      console.log('  Metric                   Expected        Actual     Severity');
      console.log('  ' + '-'.repeat(70));
      for (const violation of results.violations) {
        const metric = violation.metric.padEnd(25);
        const expected = violation.expected.toFixed(2).padStart(12);
        const actual = violation.actual.toFixed(2).padStart(12);
        const severity = violation.severity.padEnd(12);
        console.log(`  ${metric}${expected}${actual}${severity}`);
      }
    }

    console.log('\n' + '='.repeat(80));
  }
}
