/**
 * Server Log Parser
 * Parses various log formats (JSON, Common Log Format, Combined, Nginx, etc.)
 */

export interface ParsedLogEntry {
  timestamp: Date;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number; // milliseconds
  userAgent?: string;
  ip?: string;
  error?: string;
  userId?: string;
  requestSize?: number;
  responseSize?: number;
  raw: string;
}

export interface ParsingResult {
  entries: ParsedLogEntry[];
  errors: string[];
  successCount: number;
  failureCount: number;
  format: LogFormat;
}

export enum LogFormat {
  JSON = 'json',
  COMMON = 'common', // Apache Common Log Format
  COMBINED = 'combined', // Apache Combined Log Format
  NGINX = 'nginx', // Nginx format
  APACHE = 'apache', // Apache Extended
  CUSTOM = 'custom',
}

/**
 * Main log parser class
 */
export class ServerLogParser {
  private errors: string[] = [];

  /**
   * Auto-detect and parse log format
   */
  parseLog(content: string): ParsingResult {
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return {
        entries: [],
        errors: ['No log entries found'],
        successCount: 0,
        failureCount: 0,
        format: LogFormat.CUSTOM,
      };
    }

    // Detect format by examining first line
    const format = this.detectFormat(lines[0]);

    let entries: ParsedLogEntry[] = [];
    this.errors = [];

    switch (format) {
      case LogFormat.JSON:
        entries = this.parseJsonLog(lines);
        break;
      case LogFormat.COMMON:
        entries = this.parseCommonLog(lines);
        break;
      case LogFormat.COMBINED:
        entries = this.parseCombinedLog(lines);
        break;
      case LogFormat.NGINX:
        entries = this.parseNginxLog(lines);
        break;
      case LogFormat.APACHE:
        entries = this.parseApacheLog(lines);
        break;
      default:
        entries = this.parseCustomLog(lines);
    }

    return {
      entries: entries.filter(e => e !== null) as ParsedLogEntry[],
      errors: this.errors,
      successCount: entries.filter(e => e !== null).length,
      failureCount: this.errors.length,
      format,
    };
  }

  /**
   * Detect log format from first line
   */
  private detectFormat(line: string): LogFormat {
    // JSON format
    if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
      return LogFormat.JSON;
    }

    // Nginx format (typically has specific patterns)
    if (line.includes('"GET') || line.includes('"POST') || line.includes('"PUT')) {
      if (line.match(/\d+\.\d+\.\d+\.\d+\s+-\s+[-\w]*/)) {
        return LogFormat.NGINX;
      }
    }

    // Common Log Format: IP identity authuser [timestamp] "method path" status size
    const commonPattern = /\d+\.\d+\.\d+\.\d+\s+(-|[\w.-]+)\s+(-|[\w.-]+)\s+\[.*?\]\s+".*?"\s+\d+\s+(-|\d+)/;
    if (commonPattern.test(line)) {
      // Check if it has referrer/user-agent (Combined)
      if (line.match(/"[^"]*"\s+"[^"]*"\s*$/)) {
        return LogFormat.COMBINED;
      }
      return LogFormat.COMMON;
    }

    return LogFormat.CUSTOM;
  }

  /**
   * Parse JSON-formatted logs
   */
  private parseJsonLog(lines: string[]): ParsedLogEntry[] {
    return lines.map(line => {
      try {
        const json = JSON.parse(line);
        return {
          timestamp: new Date(json.timestamp || json.time || json.date),
          method: json.method || json.verb || 'UNKNOWN',
          endpoint: json.endpoint || json.path || json.url || 'unknown',
          statusCode: parseInt(json.statusCode || json.status || '0'),
          responseTime: parseInt(json.responseTime || json.duration || '0'),
          userAgent: json.userAgent || json.ua,
          ip: json.ip || json.ipAddress,
          error: json.error || json.errorMessage,
          userId: json.userId || json.user,
          requestSize: json.requestSize || json.req_size,
          responseSize: json.responseSize || json.res_size,
          raw: line,
        };
      } catch (e) {
        this.errors.push(`JSON parse error: ${(e as Error).message}`);
        return null as any;
      }
    });
  }

  /**
   * Parse Common Log Format (Apache CLF)
   * Format: IP ident authuser [timestamp] "method path protocol" status size
   */
  private parseCommonLog(lines: string[]): ParsedLogEntry[] {
    const pattern = /^([\d.]+)\s+(-|[\w.-]+)\s+(-|[\w.-]+)\s+\[(.*?)\]\s+"(\w+)\s+([^\s]+)\s+([^"]+)"\s+(\d+)\s+(-|\d+)/;

    return lines.map(line => {
      const match = line.match(pattern);
      if (!match) {
        this.errors.push(`Failed to parse common log format: ${line}`);
        return null as any;
      }

      const [, ip, , , timestamp, method, path, , status, size] = match;

      return {
        timestamp: this.parseTimestamp(timestamp),
        method: method || 'UNKNOWN',
        endpoint: path || 'unknown',
        statusCode: parseInt(status),
        responseTime: 0, // Not available in common format
        userAgent: undefined,
        ip: ip,
        error: undefined,
        userId: undefined,
        requestSize: undefined,
        responseSize: parseInt(size),
        raw: line,
      };
    });
  }

  /**
   * Parse Combined Log Format (Apache)
   * Common format + referrer + user-agent
   */
  private parseCombinedLog(lines: string[]): ParsedLogEntry[] {
    const pattern = /^([\d.]+)\s+(-|[\w.-]+)\s+(-|[\w.-]+)\s+\[(.*?)\]\s+"(\w+)\s+([^\s]+)\s+([^"]+)"\s+(\d+)\s+(-|\d+)\s+"([^"]*)"\s+"([^"]*)"/;

    return lines.map(line => {
      const match = line.match(pattern);
      if (!match) {
        this.errors.push(`Failed to parse combined log format: ${line}`);
        return null as any;
      }

      const [, ip, , , timestamp, method, path, , status, size, referrer, userAgent] = match;

      return {
        timestamp: this.parseTimestamp(timestamp),
        method: method || 'UNKNOWN',
        endpoint: path || 'unknown',
        statusCode: parseInt(status),
        responseTime: 0,
        userAgent: userAgent,
        ip: ip,
        error: undefined,
        userId: undefined,
        requestSize: undefined,
        responseSize: parseInt(size),
        raw: line,
      };
    });
  }

  /**
   * Parse Nginx log format
   */
  private parseNginxLog(lines: string[]): ParsedLogEntry[] {
    const pattern = /^([\d.]+)\s+-\s+-\s+\[(.*?)\]\s+"(\w+)\s+([^\s]+)\s+([^"]+)"\s+(\d+)\s+(\d+|-)\s+"([^"]*)"\s+"([^"]*)"\s+([\d.]+)/;

    return lines.map(line => {
      const match = line.match(pattern);
      if (!match) {
        this.errors.push(`Failed to parse nginx log format: ${line}`);
        return null as any;
      }

      const [, ip, timestamp, method, path, , status, size, referrer, userAgent, responseTime] = match;

      return {
        timestamp: this.parseTimestamp(timestamp),
        method: method || 'UNKNOWN',
        endpoint: path || 'unknown',
        statusCode: parseInt(status),
        responseTime: Math.round(parseFloat(responseTime) * 1000), // Convert seconds to ms
        userAgent: userAgent,
        ip: ip,
        error: undefined,
        userId: undefined,
        requestSize: undefined,
        responseSize: parseInt(size),
        raw: line,
      };
    });
  }

  /**
   * Parse Apache Extended Log Format
   */
  private parseApacheLog(lines: string[]): ParsedLogEntry[] {
    // Fall back to combined format for now
    return this.parseCombinedLog(lines);
  }

  /**
   * Parse custom/unstructured logs (best effort)
   */
  private parseCustomLog(lines: string[]): ParsedLogEntry[] {
    return lines.map(line => {
      try {
        // Try to extract common patterns
        const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+)/);
        const methodMatch = line.match(/\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/);
        const pathMatch = line.match(/\b\/[\w\-./]*\b/);
        const statusMatch = line.match(/\b([1-5]\d{2})\b/);
        const timeMatch = line.match(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/);

        return {
          timestamp: timeMatch ? new Date(timeMatch[0]) : new Date(),
          method: methodMatch ? methodMatch[1] : 'UNKNOWN',
          endpoint: pathMatch ? pathMatch[0] : 'unknown',
          statusCode: statusMatch ? parseInt(statusMatch[1]) : 0,
          responseTime: 0,
          userAgent: undefined,
          ip: ipMatch ? ipMatch[1] : undefined,
          error: line.includes('error') || line.includes('Error') ? line : undefined,
          userId: undefined,
          requestSize: undefined,
          responseSize: 0,
          raw: line,
        };
      } catch (e) {
        this.errors.push(`Custom parse error: ${(e as Error).message}`);
        return null as any;
      }
    });
  }

  /**
   * Parse various timestamp formats
   */
  private parseTimestamp(timestampStr: string): Date {
    // Apache format: 10/Oct/2000:13:55:36 +0000
    const apacheMatch = timestampStr.match(/(\d{2})\/(\w+)\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s+([\+\-]\d{4})/);
    if (apacheMatch) {
      const [, day, month, year, hour, min, sec] = apacheMatch;
      const monthIndex = this.getMonthIndex(month);
      return new Date(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${day}T${hour}:${min}:${sec}Z`);
    }

    // ISO format
    if (timestampStr.includes('T')) {
      return new Date(timestampStr);
    }

    // Common other formats
    return new Date(timestampStr);
  }

  /**
   * Get month index from name
   */
  private getMonthIndex(month: string): number {
    const months: { [key: string]: number } = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    return months[month] || 0;
  }

  /**
   * Parse logs from file content
   */
  static parseFile(content: string): ParsingResult {
    const parser = new ServerLogParser();
    return parser.parseLog(content);
  }

  /**
   * Parse from string array of log lines
   */
  static parseLines(lines: string[]): ParsingResult {
    const parser = new ServerLogParser();
    return parser.parseLog(lines.join('\n'));
  }
}
