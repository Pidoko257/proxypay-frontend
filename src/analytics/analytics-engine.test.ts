import { LogAnalyticsEngine, AnalyticsResult } from './analytics-engine';
import { ParsedLogEntry } from './log-parser';

function makeLog(
  timestamp: Date,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  ip = '192.168.1.1',
  userId?: string
): ParsedLogEntry {
  return {
    timestamp,
    method,
    endpoint,
    statusCode,
    responseTime,
    userAgent: 'test-agent',
    ip,
    userId,
    requestSize: 100,
    responseSize: 1000,
    error: statusCode >= 400 ? 'test error' : undefined,
    raw: '',
  };
}

function makeLogsForRange(start: Date, end: Date, count: number): ParsedLogEntry[] {
  const logs: ParsedLogEntry[] = [];
  const totalMs = end.getTime() - start.getTime();
  for (let i = 0; i < count; i++) {
    const ts = new Date(start.getTime() + (totalMs * i) / count);
    logs.push(
      makeLog(
        ts,
        '/api/test',
        'GET',
        i % 5 === 0 ? 500 : 200,
        100 + i * 5,
        `192.168.1.${i % 255}`
      )
    );
  }
  return logs;
}

describe('LogAnalyticsEngine - Daily Granularity (#412)', () => {
  it('should produce usageByDay with one entry per day', () => {
    const start = new Date('2026-08-20T00:00:00Z');
    const end = new Date('2026-08-22T23:59:59Z');
    const logs = makeLogsForRange(start, end, 60);
    const result = LogAnalyticsEngine.analyze(logs);

    expect(result.usageByDay).toBeDefined();
    expect(result.usageByDay.length).toBe(3);
    expect(result.usageByDay[0].date).toBe('2026-08-20');
    expect(result.usageByDay[1].date).toBe('2026-08-21');
    expect(result.usageByDay[2].date).toBe('2026-08-22');
  });

  it('should sort daily patterns chronologically', () => {
    const start = new Date('2026-08-20T12:00:00Z');
    const end = new Date('2026-08-23T06:00:00Z');
    const logs = makeLogsForRange(start, end, 90);
    const result = LogAnalyticsEngine.analyze(logs);

    const dates = result.usageByDay.map((d) => d.date);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it('should compute correct count and error rate per day', () => {
    const day1 = new Date('2026-08-20T10:00:00Z');
    const day2 = new Date('2026-08-20T14:00:00Z');
    const day3 = new Date('2026-08-21T10:00:00Z');
    const logs = [
      makeLog(day1, '/api/a', 'GET', 200, 50),
      makeLog(day2, '/api/a', 'GET', 500, 100),
      makeLog(day3, '/api/a', 'GET', 200, 50),
    ];
    const result = LogAnalyticsEngine.analyze(logs);

    expect(result.usageByDay.length).toBe(2);
    const d1 = result.usageByDay.find((d) => d.date === '2026-08-20');
    expect(d1).toBeDefined();
    expect(d1!.count).toBe(2);
    expect(d1!.errorRate).toBe(50);
    expect(d1!.avgResponseTime).toBe(75);
  });

  it('should always include usageByHour alongside usageByDay', () => {
    const logs = makeLogsForRange(
      new Date('2026-08-20T00:00:00Z'),
      new Date('2026-08-20T23:59:59Z'),
      24
    );
    const result = LogAnalyticsEngine.analyze(logs);

    expect(result.usageByHour.length).toBe(24);
    expect(result.usageByDay.length).toBe(1);
  });

  it('should return empty usageByDay for empty logs', () => {
    const result = LogAnalyticsEngine.analyze([]);
    expect(result.usageByDay).toEqual([]);
  });
});

describe('AnalyticsResult interface', () => {
  it('should include usageByDay field', () => {
    const logs = makeLogsForRange(
      new Date('2026-01-01T00:00:00Z'),
      new Date('2026-01-03T00:00:00Z'),
      30
    );
    const result: AnalyticsResult = LogAnalyticsEngine.analyze(logs);
    expect(Array.isArray(result.usageByDay)).toBe(true);
    expect(result.usageByDay.every((d) => 'date' in d && 'count' in d && 'avgResponseTime' in d && 'errorRate' in d)).toBe(true);
  });
});
