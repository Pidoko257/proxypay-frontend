import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isWithinResponseTime,
  filterByResponseTime,
  coerceResponseTime,
  formatResponseTimeRange,
} from '../responseTimeFilter.ts';

const logs = [
  { responseTime: 0 },
  { responseTime: 100 },
  { responseTime: 250 },
  { responseTime: 500 },
  { responseTime: 1000 },
];

test('bounds are inclusive on both ends', () => {
  assert.equal(isWithinResponseTime(100, 100, 500), true);
  assert.equal(isWithinResponseTime(500, 100, 500), true);
  assert.equal(isWithinResponseTime(99, 100, 500), false);
  assert.equal(isWithinResponseTime(501, 100, 500), false);
});

test('filterByResponseTime keeps rows exactly on the min and max', () => {
  const result = filterByResponseTime(logs, 100, 500);
  assert.deepEqual(
    result.map((l) => l.responseTime),
    [100, 250, 500],
  );
});

test('filterByResponseTime with full range keeps everything', () => {
  assert.equal(filterByResponseTime(logs, 0, 10000).length, logs.length);
});

test('coerceResponseTime falls back on empty / NaN input', () => {
  assert.equal(coerceResponseTime('', 0), 0);
  assert.equal(coerceResponseTime('abc', 10000), 10000);
  assert.equal(coerceResponseTime('350', 0), 350);
});

test('formatResponseTimeRange spells out that the range is inclusive', () => {
  assert.equal(formatResponseTimeRange(0, 10000), '0–10,000 ms (inclusive)');
});
