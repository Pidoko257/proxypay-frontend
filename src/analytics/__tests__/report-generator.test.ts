/**
 * Report Generator Tests
 * Comprehensive tests for CSV/JSON export functionality with filter preservation
 */

import { ReportGenerator, ExportOptions, FilterMetadata } from '../report-generator';
import { AnalyticsResult, EndpointMetrics, ErrorAnalysis, UsagePattern, UserAnalysis, IPAnalysis, StatusCodeAnalysis } from '../analytics-engine';

describe('ReportGenerator', () => {
  // Create mock analytics data
  const createMockAnalytics = (): AnalyticsResult => ({
    totalRequests: 1000,
    totalErrors: 50,
    errorRate: 5.0,
    dateRange: {
      start: new Date('2026-08-20T00:00:00Z'),
      end: new Date('2026-08-25T23:59:59Z'),
    },
    topEndpoints: [
      {
        endpoint: '/api/users',
        method: 'GET',
        count: 500,
        avgResponseTime: 125.5,
        minResponseTime: 50,
        maxResponseTime: 800,
        errorCount: 10,
        errorRate: 2.0,
        statusCodes: { 200: 490, 500: 10 },
        successRate: 98.0,
        p95ResponseTime: 250.0,
        p99ResponseTime: 400.0,
      },
      {
        endpoint: '/api/transactions',
        method: 'POST',
        count: 300,
        avgResponseTime: 250.75,
        minResponseTime: 100,
        maxResponseTime: 1500,
        errorCount: 25,
        errorRate: 8.33,
        statusCodes: { 201: 275, 400: 20, 500: 5 },
        successRate: 91.67,
        p95ResponseTime: 600.0,
        p99ResponseTime: 1000.0,
      },
    ],
    topErrors: [
      {
        error: 'Database connection timeout',
        count: 30,
        percentage: 3.0,
        endpoints: ['/api/users', '/api/transactions'],
        statusCodes: [500],
        firstOccurrence: new Date('2026-08-20T08:30:00Z'),
        lastOccurrence: new Date('2026-08-25T15:45:00Z'),
      },
      {
        error: 'Invalid request format',
        count: 20,
        percentage: 2.0,
        endpoints: ['/api/transactions'],
        statusCodes: [400],
        firstOccurrence: new Date('2026-08-21T10:00:00Z'),
        lastOccurrence: new Date('2026-08-25T14:20:00Z'),
      },
    ],
    usageByHour: [
      { hour: 0, count: 20, avgResponseTime: 100, errorRate: 2.0 },
      { hour: 1, count: 15, avgResponseTime: 110, errorRate: 1.5 },
      { hour: 8, count: 200, avgResponseTime: 150, errorRate: 6.0 },
    ],
    statusCodeBreakdown: [
      { code: 200, count: 800, percentage: 80.0, avgResponseTime: 120, endpoints: ['/api/users'] },
      { code: 201, count: 100, percentage: 10.0, avgResponseTime: 200, endpoints: ['/api/transactions'] },
      { code: 500, count: 50, percentage: 5.0, avgResponseTime: 300, endpoints: ['/api/users', '/api/transactions'] },
      { code: 400, count: 50, percentage: 5.0, avgResponseTime: 150, endpoints: ['/api/transactions'] },
    ],
    topUsers: [
      { userId: 'user123', requestCount: 200, uniqueEndpoints: 3, errorCount: 5, lastActivity: new Date('2026-08-25T23:00:00Z') },
      { userId: 'user456', requestCount: 150, uniqueEndpoints: 2, errorCount: 2, lastActivity: new Date('2026-08-25T22:30:00Z') },
    ],
    topIPs: [
      { ip: '192.168.1.100', requestCount: 300, uniqueEndpoints: 4, statusCodes: { 200: 280, 500: 20 }, errorCount: 20 },
      { ip: '192.168.1.101', requestCount: 250, uniqueEndpoints: 3, statusCodes: { 200: 240, 400: 10 }, errorCount: 10 },
    ],
    avgResponseTime: 175.0,
    p95ResponseTime: 400.0,
    p99ResponseTime: 800.0,
  });

  describe('generateJsonReport', () => {
    it('should generate valid JSON with analytics data', () => {
      const analytics = createMockAnalytics();
      const json = ReportGenerator.generateJsonReport(analytics);

      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('analytics');
      expect(parsed).toHaveProperty('metadata');
      expect(parsed.metadata).toHaveProperty('generatedAt');
      expect(parsed.analytics.totalRequests).toBe(1000);
    });

    it('should include filter metadata in JSON when provided', () => {
      const analytics = createMockAnalytics();
      const filters: FilterMetadata = {
        startDate: '2026-08-20',
        endDate: '2026-08-25',
        endpoint: '/api/users',
        method: 'GET',
        statusCode: '2',
        minResponseTime: 0,
        maxResponseTime: 500,
      };

      const json = ReportGenerator.generateJsonReport(analytics, filters);
      const parsed = JSON.parse(json);

      expect(parsed.metadata.filters).toEqual(filters);
      expect(parsed.metadata.filters.endpoint).toBe('/api/users');
      expect(parsed.metadata.filters.method).toBe('GET');
    });

    it('should handle null filters gracefully', () => {
      const analytics = createMockAnalytics();
      const json = ReportGenerator.generateJsonReport(analytics);
      const parsed = JSON.parse(json);

      expect(parsed.metadata.filters).toBeNull();
    });

    it('should preserve complete analytics structure', () => {
      const analytics = createMockAnalytics();
      const json = ReportGenerator.generateJsonReport(analytics);
      const parsed = JSON.parse(json);

      expect(parsed.analytics.topEndpoints).toHaveLength(2);
      expect(parsed.analytics.topErrors).toHaveLength(2);
      expect(parsed.analytics.topUsers).toHaveLength(2);
      expect(parsed.analytics.topIPs).toHaveLength(2);
      expect(parsed.analytics.statusCodeBreakdown).toHaveLength(4);
    });
  });

  describe('generateCsvReport', () => {
    it('should generate CSV with proper structure', () => {
      const analytics = createMockAnalytics();
      const csv = ReportGenerator.generateCsvReport(analytics);

      expect(csv).toBeTruthy();
      expect(csv).toContain('SERVER LOGS ANALYTICS REPORT');
      expect(csv).toContain('SUMMARY');
      expect(csv).toContain('TOP ENDPOINTS');
      expect(csv).toContain('TOP ERRORS');
      expect(csv).toContain('STATUS CODE BREAKDOWN');
      expect(csv).toContain('HOURLY USAGE PATTERN');
      expect(csv).toContain('TOP USERS');
      expect(csv).toContain('TOP IPs');
    });

    it('should include filter metadata section when filters provided', () => {
      const analytics = createMockAnalytics();
      const filters: FilterMetadata = {
        startDate: '2026-08-20',
        endDate: '2026-08-25',
        endpoint: '/api',
        method: 'POST',
        statusCode: '5',
        minResponseTime: 100,
        maxResponseTime: 1000,
      };

      const csv = ReportGenerator.generateCsvReport(analytics, filters);

      expect(csv).toContain('FILTERS APPLIED');
      expect(csv).toContain('Start Date,2026-08-20');
      expect(csv).toContain('End Date,2026-08-25');
      expect(csv).toContain('Endpoint Filter,/api');
      expect(csv).toContain('Method Filter,POST');
      expect(csv).toContain('Status Code Filter,5');
      expect(csv).toContain('Min Response Time (ms),100');
      expect(csv).toContain('Max Response Time (ms),1000');
    });

    it('should include all summary metrics', () => {
      const analytics = createMockAnalytics();
      const csv = ReportGenerator.generateCsvReport(analytics);

      expect(csv).toContain('Total Requests,1000');
      expect(csv).toContain('Total Errors,50');
      expect(csv).toContain('Error Rate (%)');
      expect(csv).toContain('Average Response Time (ms)');
      expect(csv).toContain('P95 Response Time (ms)');
      expect(csv).toContain('P99 Response Time (ms)');
    });

    it('should include endpoint data with P95/P99 metrics', () => {
      const analytics = createMockAnalytics();
      const csv = ReportGenerator.generateCsvReport(analytics);

      expect(csv).toContain('TOP ENDPOINTS');
      expect(csv).toContain('/api/users');
      expect(csv).toContain('GET');
      expect(csv).toContain('P95 Response Time (ms)');
      expect(csv).toContain('P99 Response Time (ms)');
    });

    it('should properly escape CSV special characters', () => {
      const analytics = {
        ...createMockAnalytics(),
        topErrors: [
          {
            error: 'Error with "quotes" and, commas',
            count: 10,
            percentage: 1.0,
            endpoints: ['/api/test'],
            statusCodes: [500],
            firstOccurrence: new Date(),
            lastOccurrence: new Date(),
          },
        ],
      };

      const csv = ReportGenerator.generateCsvReport(analytics);

      // CSV escaping rule: quotes should be doubled
      expect(csv).toContain('Error with ""quotes"" and');
    });

    it('should include user and IP data with last activity timestamps', () => {
      const analytics = createMockAnalytics();
      const csv = ReportGenerator.generateCsvReport(analytics);

      expect(csv).toContain('TOP USERS');
      expect(csv).toContain('user123');
      expect(csv).toContain('TOP IPs');
      expect(csv).toContain('192.168.1.100');
    });

    it('should format dates as ISO strings', () => {
      const analytics = createMockAnalytics();
      const csv = ReportGenerator.generateCsvReport(analytics);

      expect(csv).toContain('2026-08-20T00:00:00');
      expect(csv).toContain('2026-08-25T23:59:59');
    });
  });

  describe('exportReport', () => {
    // Mock DOM methods
    let mockLink: any;
    let originalCreateElement: any;
    let originalRevokeObjectURL: any;

    beforeEach(() => {
      mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      };

      originalCreateElement = document.createElement;
      originalRevokeObjectURL = URL.revokeObjectURL;

      document.createElement = jest.fn((tag: string) => {
        if (tag === 'a') return mockLink;
        return originalCreateElement.call(document, tag);
      });

      URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
      document.createElement = originalCreateElement;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('should export JSON format with correct mime type', () => {
      const analytics = createMockAnalytics();
      const options: ExportOptions = {
        format: 'json',
        filename: 'test-report.json',
      };

      ReportGenerator.exportReport(analytics, options);

      expect(mockLink.download).toBe('test-report.json');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should export CSV format with correct mime type', () => {
      const analytics = createMockAnalytics();
      const options: ExportOptions = {
        format: 'csv',
        filename: 'test-report.csv',
      };

      ReportGenerator.exportReport(analytics, options);

      expect(mockLink.download).toBe('test-report.csv');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should include filters in export options', () => {
      const analytics = createMockAnalytics();
      const filters: FilterMetadata = {
        startDate: '2026-08-20',
        endDate: '2026-08-25',
        endpoint: '',
        method: '',
        statusCode: '5',
        minResponseTime: 200,
        maxResponseTime: 1000,
      };

      const options: ExportOptions = {
        format: 'json',
        filename: 'filtered-report.json',
        filters,
      };

      ReportGenerator.exportReport(analytics, options);

      const json = ReportGenerator.generateJsonReport(analytics, filters);
      const parsed = JSON.parse(json);

      expect(parsed.metadata.filters).toEqual(filters);
    });

    it('should generate timestamp in filename when not provided', () => {
      const analytics = createMockAnalytics();
      const options: ExportOptions = {
        format: 'json',
      };

      ReportGenerator.exportReport(analytics, options);

      // Filename should contain timestamp
      expect(mockLink.download).toMatch(/logs-report-\d+\.json/);
    });

    it('should use provided filename when specified', () => {
      const analytics = createMockAnalytics();
      const timestamp = '2026-08-25';
      const options: ExportOptions = {
        format: 'csv',
        filename: `logs-analytics-${timestamp}.csv`,
      };

      ReportGenerator.exportReport(analytics, options);

      expect(mockLink.download).toBe(`logs-analytics-${timestamp}.csv`);
    });
  });

  describe('CSV Export Data Integrity', () => {
    it('should preserve all metrics in CSV output', () => {
      const analytics = createMockAnalytics();
      const csv = ReportGenerator.generateCsvReport(analytics);
      const lines = csv.split('\n');

      // Count the number of section headers
      const summaryLine = lines.find(l => l === 'SUMMARY');
      const endpointsLine = lines.find(l => l === 'TOP ENDPOINTS');
      const errorsLine = lines.find(l => l === 'TOP ERRORS');
      const statusLine = lines.find(l => l === 'STATUS CODE BREAKDOWN');
      const usageLine = lines.find(l => l === 'HOURLY USAGE PATTERN');
      const usersLine = lines.find(l => l === 'TOP USERS');
      const ipsLine = lines.find(l => l === 'TOP IPs');

      expect(summaryLine).toBeDefined();
      expect(endpointsLine).toBeDefined();
      expect(errorsLine).toBeDefined();
      expect(statusLine).toBeDefined();
      expect(usageLine).toBeDefined();
      expect(usersLine).toBeDefined();
      expect(ipsLine).toBeDefined();
    });

    it('should correctly format numbers and percentages', () => {
      const analytics = createMockAnalytics();
      const csv = ReportGenerator.generateCsvReport(analytics);

      expect(csv).toContain('1000'); // Total requests
      expect(csv).toContain('5.00'); // Error rate with 2 decimals
      expect(csv).toContain('175.00'); // Avg response time
    });

    it('should handle empty error list gracefully', () => {
      const analytics = {
        ...createMockAnalytics(),
        topErrors: [],
      };

      const csv = ReportGenerator.generateCsvReport(analytics);

      expect(csv).toContain('TOP ERRORS');
      expect(() => csv).not.toThrow();
    });

    it('should handle empty users list gracefully', () => {
      const analytics = {
        ...createMockAnalytics(),
        topUsers: [],
      };

      const csv = ReportGenerator.generateCsvReport(analytics);

      expect(csv).toContain('TOP USERS');
      expect(() => csv).not.toThrow();
    });
  });

  describe('Filter Preservation', () => {
    it('should preserve all filter fields in JSON export', () => {
      const analytics = createMockAnalytics();
      const filters: FilterMetadata = {
        startDate: '2026-08-20',
        endDate: '2026-08-25',
        endpoint: '/api/users',
        method: 'GET',
        statusCode: '2',
        minResponseTime: 50,
        maxResponseTime: 500,
      };

      const json = ReportGenerator.generateJsonReport(analytics, filters);
      const parsed = JSON.parse(json);

      expect(parsed.metadata.filters.startDate).toBe('2026-08-20');
      expect(parsed.metadata.filters.endDate).toBe('2026-08-25');
      expect(parsed.metadata.filters.endpoint).toBe('/api/users');
      expect(parsed.metadata.filters.method).toBe('GET');
      expect(parsed.metadata.filters.statusCode).toBe('2');
      expect(parsed.metadata.filters.minResponseTime).toBe(50);
      expect(parsed.metadata.filters.maxResponseTime).toBe(500);
    });

    it('should include generation timestamp in metadata', () => {
      const analytics = createMockAnalytics();
      const json = ReportGenerator.generateJsonReport(analytics);
      const parsed = JSON.parse(json);

      expect(parsed.metadata).toHaveProperty('generatedAt');
      expect(new Date(parsed.metadata.generatedAt)).toBeInstanceOf(Date);
    });

    it('should handle partial filter state', () => {
      const analytics = createMockAnalytics();
      const filters: FilterMetadata = {
        startDate: '2026-08-20',
        endDate: '2026-08-25',
        endpoint: '',
        method: '',
        statusCode: '',
        minResponseTime: 0,
        maxResponseTime: 10000,
      };

      const csv = ReportGenerator.generateCsvReport(analytics, filters);

      expect(csv).toContain('Start Date,2026-08-20');
      expect(csv).toContain('End Date,2026-08-25');
      // Empty filters should not be included in CSV output
    });
  });

  describe('Timestamp and Date Handling', () => {
    it('should format dates correctly in CSV', () => {
      const analytics = createMockAnalytics();
      const csv = ReportGenerator.generateCsvReport(analytics);

      // Check for ISO date format in CSV
      expect(csv).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include generation timestamp in exported data', () => {
      const analytics = createMockAnalytics();
      const csv = ReportGenerator.generateCsvReport(analytics);

      expect(csv).toContain('Generated:');
    });

    it('should use consistent date format across formats', () => {
      const analytics = createMockAnalytics();
      const json = ReportGenerator.generateJsonReport(analytics);
      const csv = ReportGenerator.generateCsvReport(analytics);

      const jsonParsed = JSON.parse(json);
      const dateFromJson = jsonParsed.analytics.dateRange.start;

      // Both should use ISO format
      expect(dateFromJson).toMatch(/\d{4}-\d{2}-\d{2}T/);
      expect(csv).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });
  });
});
