/**
 * Sample Log Generator
 * Generates realistic sample logs for testing and demonstration
 */

import { ParsedLogEntry } from './log-parser';

export class SampleLogGenerator {
  private static readonly ENDPOINTS = [
    '/api/users',
    '/api/users/:id',
    '/api/transactions',
    '/api/transactions/:id',
    '/api/accounts',
    '/api/accounts/:id',
    '/api/rate-limit-status',
    '/api/balance',
    '/api/history',
    '/health',
    '/status',
    '/documentation',
  ];

  private static readonly METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'curl/7.64.1',
    'PostmanRuntime/7.26.8',
  ];

  private static readonly IPS = [
    '192.168.1.1',
    '10.0.0.1',
    '172.16.0.1',
    '203.0.113.42',
    '198.51.100.23',
    '192.0.2.100',
  ];

  private static readonly ERRORS = [
    'Connection timeout',
    'Authentication failed',
    'Invalid request',
    'Unauthorized access',
    'Rate limit exceeded',
    'Database error',
    'Internal server error',
  ];

  /**
   * Generate sample log entries
   */
  static generateSampleLogs(count: number = 1000): ParsedLogEntry[] {
    const logs: ParsedLogEntry[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
      const method = this.METHODS[Math.floor(Math.random() * this.METHODS.length)];
      const endpoint = this.ENDPOINTS[Math.floor(Math.random() * this.ENDPOINTS.length)];
      const ip = this.IPS[Math.floor(Math.random() * this.IPS.length)];
      const userAgent = this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];

      // Status code distribution (mostly 200s, some 400s and 500s)
      let statusCode = 200;
      const rand = Math.random();
      if (rand < 0.05) {
        statusCode = 500 + Math.floor(Math.random() * 3);
      } else if (rand < 0.15) {
        statusCode = 400 + Math.floor(Math.random() * 5);
      } else if (rand < 0.25) {
        statusCode = 300 + Math.floor(Math.random() * 3);
      }

      // Response time (bimodal distribution)
      let responseTime: number;
      if (Math.random() < 0.1) {
        responseTime = Math.random() * 5000 + 1000; // Slow requests
      } else {
        responseTime = Math.random() * 200 + 10; // Normal requests
      }

      const entry: ParsedLogEntry = {
        timestamp,
        method,
        endpoint,
        statusCode,
        responseTime,
        userAgent,
        ip,
        userId: Math.random() < 0.7 ? `user_${Math.floor(Math.random() * 100)}` : undefined,
        requestSize: Math.floor(Math.random() * 5000) + 100,
        responseSize: Math.floor(Math.random() * 100000) + 1000,
        error: statusCode >= 400 ? this.ERRORS[Math.floor(Math.random() * this.ERRORS.length)] : undefined,
        raw: this.generateRawLog({
          timestamp,
          method,
          endpoint,
          statusCode,
          responseTime,
          userAgent,
          ip,
        }),
      };

      logs.push(entry);
    }

    return logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Generate raw log line in various formats
   */
  private static generateRawLog(data: {
    timestamp: Date;
    method: string;
    endpoint: string;
    statusCode: number;
    responseTime: number;
    userAgent: string;
    ip: string;
  }): string {
    // Randomly choose format
    const format = Math.floor(Math.random() * 4);

    if (format === 0) {
      // JSON format
      return JSON.stringify({
        timestamp: data.timestamp.toISOString(),
        method: data.method,
        endpoint: data.endpoint,
        statusCode: data.statusCode,
        responseTime: data.responseTime,
        userAgent: data.userAgent,
        ip: data.ip,
      });
    } else if (format === 1) {
      // Apache Combined Log Format
      const timeStr = this.formatApacheTime(data.timestamp);
      return `${data.ip} - - [${timeStr}] "${data.method} ${data.endpoint} HTTP/1.1" ${data.statusCode} ${Math.floor(Math.random() * 100000)} "-" "${data.userAgent}"`;
    } else if (format === 2) {
      // Nginx format
      const timeStr = this.formatApacheTime(data.timestamp);
      return `${data.ip} - - [${timeStr}] "${data.method} ${data.endpoint} HTTP/1.1" ${data.statusCode} ${Math.floor(Math.random() * 100000)} "-" "${data.userAgent}" ${(data.responseTime / 1000).toFixed(3)}`;
    } else {
      // Custom format
      return `${data.timestamp.toISOString()} | ${data.method} ${data.endpoint} | Status: ${data.statusCode} | Time: ${data.responseTime.toFixed(0)}ms | IP: ${data.ip}`;
    }
  }

  /**
   * Format time in Apache format
   */
  private static formatApacheTime(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
      `${pad(date.getDate())}/${months[date.getMonth()]}/${date.getFullYear()}:` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} +0000`
    );
  }

  /**
   * Generate sample logs as text
   */
  static generateSampleLogText(count: number = 100): string {
    const logs = this.generateSampleLogs(count);
    return logs.map(log => log.raw).join('\n');
  }

  /**
   * Generate logs in specific format
   */
  static generateSampleLogsInFormat(format: 'json' | 'apache' | 'nginx' | 'combined', count: number = 100): string {
    const lines: string[] = [];

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
      const method = this.METHODS[Math.floor(Math.random() * this.METHODS.length)];
      const endpoint = this.ENDPOINTS[Math.floor(Math.random() * this.ENDPOINTS.length)];
      const ip = this.IPS[Math.floor(Math.random() * this.IPS.length)];
      const userAgent = this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
      const statusCode = Math.random() < 0.9 ? 200 : (Math.random() < 0.5 ? 400 : 500);
      const responseTime = Math.random() * 300 + 10;

      let line = '';

      switch (format) {
        case 'json':
          line = JSON.stringify({
            timestamp: timestamp.toISOString(),
            method,
            endpoint,
            statusCode,
            responseTime: Math.round(responseTime),
            userAgent,
            ip,
          });
          break;

        case 'apache':
          const timeStr = this.formatApacheTime(timestamp);
          line = `${ip} - - [${timeStr}] "${method} ${endpoint} HTTP/1.1" ${statusCode} ${Math.floor(Math.random() * 100000)}`;
          break;

        case 'combined':
          const timeStr2 = this.formatApacheTime(timestamp);
          line = `${ip} - - [${timeStr2}] "${method} ${endpoint} HTTP/1.1" ${statusCode} ${Math.floor(Math.random() * 100000)} "-" "${userAgent}"`;
          break;

        case 'nginx':
          const timeStr3 = this.formatApacheTime(timestamp);
          line = `${ip} - - [${timeStr3}] "${method} ${endpoint} HTTP/1.1" ${statusCode} ${Math.floor(Math.random() * 100000)} "-" "${userAgent}" ${(responseTime / 1000).toFixed(3)}`;
          break;
      }

      lines.push(line);
    }

    return lines.join('\n');
  }
}
