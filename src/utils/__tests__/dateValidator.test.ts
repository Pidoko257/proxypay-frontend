/**
 * Tests for date validation and formatting utilities.
 *
 * Coverage:
 * - Valid timestamps (ISO strings, Date objects, timestamps)
 * - Missing timestamps (null, undefined, empty string)
 * - Malformed timestamps (invalid strings, non-date values)
 * - Boundary cases (epoch, far future, very old dates)
 */

import {
  validateTimestamp,
  formatDate,
  formatDateISO,
  formatDateRelative,
  type DateValidationResult,
  type FormattedDate,
} from '../dateValidator';

// ── Test utilities ─────────────────────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`
    );
  }
}

function assertDeepEqual<T>(actual: T, expected: T, message: string): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(
      `Assertion failed: ${message}\nExpected: ${expectedStr}\nActual: ${actualStr}`
    );
  }
}

// ── validateTimestamp tests ────────────────────────────────────────────────

const validateTimestampTests: Record<string, () => void> = {};

validateTimestampTests['valid: ISO 8601 string'] = () => {
  const result = validateTimestamp('2026-09-30T08:02:11Z');
  assert(result.valid === true, 'should be valid');
  if (result.valid) {
    assert(result.date instanceof Date, 'should return Date object');
    assertEqual(result.date.getUTCFullYear(), 2026, 'should parse correct year');
  }
};

validateTimestampTests['valid: Date object'] = () => {
  const date = new Date('2026-09-30T08:02:11Z');
  const result = validateTimestamp(date);
  assert(result.valid === true, 'should be valid');
  if (result.valid) {
    assertEqual(result.date.getTime(), date.getTime(), 'should match input date');
  }
};

validateTimestampTests['valid: Unix timestamp (number)'] = () => {
  const timestamp = 1695974531000; // 2026-09-30T08:02:11Z in milliseconds
  const result = validateTimestamp(timestamp);
  assert(result.valid === true, 'should be valid');
};

validateTimestampTests['valid: date string (YYYY-MM-DD)'] = () => {
  const result = validateTimestamp('2026-09-30');
  assert(result.valid === true, 'should be valid');
};

validateTimestampTests['invalid: null'] = () => {
  const result = validateTimestamp(null);
  assert(result.valid === false, 'should be invalid');
  if (!result.valid) {
    assertEqual(result.reason, 'missing', 'reason should be "missing"');
  }
};

validateTimestampTests['invalid: undefined'] = () => {
  const result = validateTimestamp(undefined);
  assert(result.valid === false, 'should be invalid');
  if (!result.valid) {
    assertEqual(result.reason, 'missing', 'reason should be "missing"');
  }
};

validateTimestampTests['invalid: empty string'] = () => {
  const result = validateTimestamp('');
  assert(result.valid === false, 'should be invalid');
  if (!result.valid) {
    assertEqual(result.reason, 'missing', 'reason should be "missing"');
  }
};

validateTimestampTests['invalid: malformed string'] = () => {
  const result = validateTimestamp('not-a-date');
  assert(result.valid === false, 'should be invalid');
  if (!result.valid) {
    assertEqual(result.reason, 'malformed', 'reason should be "malformed"');
  }
};

validateTimestampTests['invalid: object'] = () => {
  const result = validateTimestamp({ year: 2026, month: 9, day: 30 });
  assert(result.valid === false, 'should be invalid');
  if (!result.valid) {
    assertEqual(result.reason, 'malformed', 'reason should be "malformed"');
  }
};

validateTimestampTests['invalid: array'] = () => {
  const result = validateTimestamp([2026, 9, 30]);
  assert(result.valid === false, 'should be invalid');
  if (!result.valid) {
    assertEqual(result.reason, 'malformed', 'reason should be "malformed"');
  }
};

validateTimestampTests['invalid: negative number'] = () => {
  const result = validateTimestamp(-1);
  assert(result.valid === false, 'should be invalid');
  if (!result.valid) {
    assertEqual(result.reason, 'invalid-range', 'reason should be "invalid-range"');
  }
};

validateTimestampTests['invalid: timestamp beyond year 9999'] = () => {
  const result = validateTimestamp(253402300800000); // Jan 1, 10000
  assert(result.valid === false, 'should be invalid');
  if (!result.valid) {
    assertEqual(result.reason, 'invalid-range', 'reason should be "invalid-range"');
  }
};

validateTimestampTests['valid: epoch start (Jan 1, 1970)'] = () => {
  const result = validateTimestamp(0);
  assert(result.valid === true, 'should be valid');
};

validateTimestampTests['valid: far future (Dec 31, 9999)'] = () => {
  const result = validateTimestamp(253402300799000);
  assert(result.valid === true, 'should be valid');
};

// ── formatDate tests ───────────────────────────────────────────────────────

const formatDateTests: Record<string, () => void> = {};

formatDateTests['formats valid ISO string'] = () => {
  const result = formatDate('2026-09-30T08:02:11Z');
  assert(result.isAvailable === true, 'should be available');
  assert(result.formatted.length > 0, 'should have formatted string');
  assert(result.validationReason === undefined, 'should have no validation reason');
};

formatDateTests['formats valid Date object'] = () => {
  const date = new Date('2026-09-30T08:02:11Z');
  const result = formatDate(date);
  assert(result.isAvailable === true, 'should be available');
  assert(result.date?.getTime() === date.getTime(), 'should preserve date');
};

formatDateTests['returns unavailable for null'] = () => {
  const result = formatDate(null);
  assert(result.isAvailable === false, 'should not be available');
  assertEqual(result.formatted, 'Date unavailable', 'should have unavailable message');
  assertEqual(result.validationReason, 'missing', 'should indicate missing reason');
};

formatDateTests['returns unavailable for undefined'] = () => {
  const result = formatDate(undefined);
  assert(result.isAvailable === false, 'should not be available');
  assertEqual(result.formatted, 'Date unavailable', 'should have unavailable message');
};

formatDateTests['returns unavailable for empty string'] = () => {
  const result = formatDate('');
  assert(result.isAvailable === false, 'should not be available');
  assertEqual(result.formatted, 'Date unavailable', 'should have unavailable message');
};

formatDateTests['returns unavailable for malformed string'] = () => {
  const result = formatDate('not-a-date');
  assert(result.isAvailable === false, 'should not be available');
  assertEqual(result.validationReason, 'malformed', 'should indicate malformed reason');
};

formatDateTests['returns unavailable for out-of-range timestamp'] = () => {
  const result = formatDate(999999999999999);
  assert(result.isAvailable === false, 'should not be available');
  assertEqual(result.validationReason, 'invalid-range', 'should indicate invalid-range reason');
};

// ── formatDateISO tests ────────────────────────────────────────────────────

const formatDateISOTests: Record<string, () => void> = {};

formatDateISOTests['formats valid ISO string to ISO'] = () => {
  const result = formatDateISO('2026-09-30T08:02:11Z');
  assert(result.includes('2026'), 'should contain year');
  assert(result.includes('09'), 'should contain month');
  assert(result.includes('30'), 'should contain day');
};

formatDateISOTests['returns "Invalid date" for null'] = () => {
  const result = formatDateISO(null);
  assertEqual(result, 'Invalid date', 'should return Invalid date message');
};

formatDateISOTests['returns "Invalid date" for malformed string'] = () => {
  const result = formatDateISO('not-a-date');
  assertEqual(result, 'Invalid date', 'should return Invalid date message');
};

// ── formatDateRelative tests ───────────────────────────────────────────────

const formatDateRelativeTests: Record<string, () => void> = {};

formatDateRelativeTests['formats recent date as "just now"'] = () => {
  const now = new Date();
  const result = formatDateRelative(now);
  assert(result.isAvailable === true, 'should be available');
  assertEqual(result.formatted, 'just now', 'should show "just now" for current time');
};

formatDateRelativeTests['formats date 5 minutes ago'] = () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const result = formatDateRelative(fiveMinutesAgo);
  assert(result.isAvailable === true, 'should be available');
  assert(result.formatted.includes('minute'), 'should mention minutes');
};

formatDateRelativeTests['formats date 2 hours ago'] = () => {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const result = formatDateRelative(twoHoursAgo);
  assert(result.isAvailable === true, 'should be available');
  assert(result.formatted.includes('hour'), 'should mention hours');
};

formatDateRelativeTests['formats date 3 days ago'] = () => {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const result = formatDateRelative(threeDaysAgo);
  assert(result.isAvailable === true, 'should be available');
  assert(result.formatted.includes('day'), 'should mention days');
};

formatDateRelativeTests['returns unavailable for null'] = () => {
  const result = formatDateRelative(null);
  assert(result.isAvailable === false, 'should not be available');
  assertEqual(result.formatted, 'Date unavailable', 'should have unavailable message');
};

formatDateRelativeTests['returns unavailable for malformed string'] = () => {
  const result = formatDateRelative('invalid');
  assert(result.isAvailable === false, 'should not be available');
  assertEqual(result.validationReason, 'malformed', 'should indicate malformed reason');
};

// ── Run all tests ──────────────────────────────────────────────────────────

function runTests(testSuite: Record<string, () => void>, suiteName: string): void {
  let passed = 0;
  let failed = 0;
  const failedTests: string[] = [];

  console.log(`\n📋 ${suiteName}\n`);

  Object.entries(testSuite).forEach(([testName, testFn]) => {
    try {
      testFn();
      console.log(`✓ ${testName}`);
      passed++;
    } catch (error) {
      console.error(`✗ ${testName}`);
      console.error(`  ${error instanceof Error ? error.message : String(error)}`);
      failed++;
      failedTests.push(testName);
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  return;
}

// Execute all test suites
export function runAllTests(): void {
  const allPassed = true;

  runTests(validateTimestampTests, 'validateTimestamp');
  runTests(formatDateTests, 'formatDate');
  runTests(formatDateISOTests, 'formatDateISO');
  runTests(formatDateRelativeTests, 'formatDateRelative');

  console.log('\n✅ All date validation tests completed');
}

// Run tests when module loads
runAllTests();
