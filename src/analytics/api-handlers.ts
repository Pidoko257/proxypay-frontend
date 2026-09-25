/**
 * API Handlers for Logs Analytics
 * Express/Node.js endpoints for serving log analytics data
 */

import { ServerLogParser } from './log-parser';
import { LogAnalyticsEngine, AnalyticsResult } from './analytics-engine';
import { SampleLogGenerator } from './sample-logs';

interface LogAnalyticsRequest {
  logs?: string; // Raw log content
  startDate?: string;
  endDate?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
}

/**
 * Parse logs and return analytics
 */
export async function analyzeLogs(request: LogAnalyticsRequest): Promise<AnalyticsResult> {
  if (!request.logs) {
    throw new Error('No log content provided');
  }

  // Parse logs
  const parsingResult = ServerLogParser.parseFile(request.logs);

  if (parsingResult.successCount === 0) {
    throw new Error('Failed to parse logs');
  }

  let logs = parsingResult.entries;

  // Apply filters
  if (request.startDate || request.endDate) {
    const startDate = request.startDate ? new Date(request.startDate) : new Date(0);
    const endDate = request.endDate ? new Date(request.endDate) : new Date();

    logs = logs.filter(log => log.timestamp >= startDate && log.timestamp <= endDate);
  }

  if (request.endpoint) {
    const regex = new RegExp(request.endpoint);
    logs = logs.filter(log => regex.test(log.endpoint));
  }

  if (request.method) {
    logs = logs.filter(log => log.method === request.method);
  }

  if (request.statusCode) {
    logs = logs.filter(log => log.statusCode === request.statusCode);
  }

  // Run analytics
  const analytics = LogAnalyticsEngine.analyze(logs);

  return analytics;
}

/**
 * Get sample analytics (for demo/testing)
 */
export async function getSampleAnalytics(): Promise<AnalyticsResult> {
  const sampleLogs = SampleLogGenerator.generateSampleLogs(1000);
  const analytics = LogAnalyticsEngine.analyze(sampleLogs);
  return analytics;
}

/**
 * Generate sample log content
 */
export function generateSampleLogs(
  format: 'json' | 'apache' | 'nginx' | 'combined' = 'combined',
  count: number = 500
): string {
  return SampleLogGenerator.generateSampleLogsInFormat(format, count);
}

/**
 * Express middleware for log analytics API
 * Usage: app.post('/api/logs/analyze', handleAnalyzeLogs)
 */
export async function handleAnalyzeLogs(req: any, res: any) {
  try {
    const { logs, startDate, endDate, endpoint, method, statusCode } = req.body;

    if (!logs) {
      return res.status(400).json({
        error: 'No log content provided',
        message: 'Provide raw log content in the "logs" field',
      });
    }

    const analytics = await analyzeLogs({
      logs,
      startDate,
      endDate,
      endpoint,
      method,
      statusCode,
    });

    res.json(analytics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to analyze logs',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get sample analytics
 * Usage: app.get('/api/logs/sample', handleGetSampleAnalytics)
 */
export async function handleGetSampleAnalytics(req: any, res: any) {
  try {
    const analytics = await getSampleAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate sample analytics',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Generate sample logs
 * Usage: app.get('/api/logs/generate', handleGenerateSampleLogs)
 */
export async function handleGenerateSampleLogs(req: any, res: any) {
  try {
    const { format = 'combined', count = 500 } = req.query;

    if (count > 10000) {
      return res.status(400).json({
        error: 'Count too large',
        message: 'Maximum 10000 logs can be generated at once',
      });
    }

    const logs = generateSampleLogs(format as any, parseInt(count));

    res.setHeader('Content-Type', 'text/plain');
    res.send(logs);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate sample logs',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Express setup helper
 * Usage: setupLogsAPI(app)
 */
export function setupLogsAPI(app: any) {
  app.post('/api/logs/analyze', handleAnalyzeLogs);
  app.get('/api/logs/sample', handleGetSampleAnalytics);
  app.get('/api/logs/generate', handleGenerateSampleLogs);
}
