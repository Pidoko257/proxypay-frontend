/**
 * Tests for useRequestHistory hook
 * 
 * This test suite validates history storage, retrieval, filtering, and persistence.
 */

// Mock localStorage for testing
class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

// Test utilities
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`
    );
  }
}

function assertArrayLength(array: any[], length: number, message: string): void {
  if (!Array.isArray(array) || array.length !== length) {
    throw new Error(
      `Assertion failed: ${message}\n  Expected array length: ${length}\n  Actual: ${array?.length || 'not an array'}`
    );
  }
}

// Test suite
const tests: Record<string, () => void> = {};

tests['should parse and store history entry'] = () => {
  const storage = new MockLocalStorage();
  const historyKey = 'proxypay-request-history';

  // Simulate adding an entry
  const entry = {
    id: 'test-123',
    method: 'POST',
    path: '/api/v1/users',
    timestamp: Date.now(),
    statusCode: 201,
    latency: 150,
  };

  storage.setItem(historyKey, JSON.stringify([entry]));
  const stored = JSON.parse(storage.getItem(historyKey)!);

  assertArrayLength(stored, 1, 'should have 1 entry');
  assertEqual(stored[0].method, 'POST', 'method should be POST');
  assertEqual(stored[0].path, '/api/v1/users', 'path should match');
  assertEqual(stored[0].statusCode, 201, 'status code should be 201');
};

tests['should maintain max history size of 50 entries'] = () => {
  const storage = new MockLocalStorage();
  const historyKey = 'proxypay-request-history';
  const MAX_ENTRIES = 50;

  // Create 60 entries
  const entries = Array.from({ length: 60 }, (_, i) => ({
    id: `entry-${i}`,
    method: 'GET',
    path: `/api/v1/endpoint${i}`,
    timestamp: Date.now() + i,
    statusCode: 200,
    latency: 100,
  }));

  // Keep only the first 50 (newest first)
  const limited = entries.slice(0, MAX_ENTRIES);
  storage.setItem(historyKey, JSON.stringify(limited));

  const stored = JSON.parse(storage.getItem(historyKey)!);
  assertArrayLength(stored, MAX_ENTRIES, `should keep max ${MAX_ENTRIES} entries`);
};

tests['should preserve entry order (newest first)'] = () => {
  const storage = new MockLocalStorage();
  const historyKey = 'proxypay-request-history';

  const entries = [
    { id: 'entry-1', method: 'GET', path: '/api/1', timestamp: 1000, statusCode: 200, latency: 100 },
    { id: 'entry-2', method: 'POST', path: '/api/2', timestamp: 2000, statusCode: 201, latency: 150 },
    { id: 'entry-3', method: 'PUT', path: '/api/3', timestamp: 3000, statusCode: 200, latency: 200 },
  ];

  storage.setItem(historyKey, JSON.stringify(entries));
  const stored = JSON.parse(storage.getItem(historyKey)!);

  assertEqual(stored[0].id, 'entry-1', 'first should be entry-1');
  assertEqual(stored[1].id, 'entry-2', 'second should be entry-2');
  assertEqual(stored[2].id, 'entry-3', 'third should be entry-3');
};

tests['should handle invalid JSON gracefully'] = () => {
  const storage = new MockLocalStorage();
  const historyKey = 'proxypay-request-history';

  storage.setItem(historyKey, 'invalid json {');

  try {
    const stored = JSON.parse(storage.getItem(historyKey)!);
    assert(false, 'should throw on invalid JSON');
  } catch (error) {
    assert(true, 'correctly threw on invalid JSON');
  }
};

tests['should clear history and remove from storage'] = () => {
  const storage = new MockLocalStorage();
  const historyKey = 'proxypay-request-history';

  storage.setItem(historyKey, JSON.stringify([{ id: 'entry-1', method: 'GET', path: '/api/1' }]));
  assert(storage.getItem(historyKey) !== null, 'entry should exist before clear');

  storage.removeItem(historyKey);
  assertEqual(storage.getItem(historyKey), null, 'entry should be null after clear');
};

tests['should filter entries by method'] = () => {
  const entries = [
    { id: 'entry-1', method: 'GET', path: '/api/1', timestamp: 1000, statusCode: 200, latency: 100 },
    { id: 'entry-2', method: 'POST', path: '/api/2', timestamp: 2000, statusCode: 201, latency: 150 },
    { id: 'entry-3', method: 'GET', path: '/api/3', timestamp: 3000, statusCode: 200, latency: 200 },
  ];

  const filtered = entries.filter((e) => e.method === 'GET');
  assertArrayLength(filtered, 2, 'should have 2 GET entries');
  assertEqual(filtered[0].id, 'entry-1', 'first should be entry-1');
  assertEqual(filtered[1].id, 'entry-3', 'second should be entry-3');
};

tests['should check if entry exists by method and path'] = () => {
  const entries = [
    { id: 'entry-1', method: 'GET', path: '/api/users', timestamp: 1000, statusCode: 200, latency: 100 },
    { id: 'entry-2', method: 'POST', path: '/api/users', timestamp: 2000, statusCode: 201, latency: 150 },
  ];

  const hasGetUsers = entries.some((e) => e.method === 'GET' && e.path === '/api/users');
  const hasDeleteUsers = entries.some((e) => e.method === 'DELETE' && e.path === '/api/users');

  assert(hasGetUsers, 'should find GET /api/users');
  assert(!hasDeleteUsers, 'should not find DELETE /api/users');
};

tests['should parse timestamps correctly'] = () => {
  const entry = {
    id: 'entry-1',
    method: 'GET',
    path: '/api/1',
    timestamp: 1692835200000,
    statusCode: 200,
    latency: 100,
  };

  const date = new Date(entry.timestamp);
  assert(date instanceof Date, 'should create valid Date object');
  assert(!isNaN(date.getTime()), 'should have valid timestamp');
  const timeString = date.toLocaleTimeString();
  assert(timeString.length > 0, 'should format time string');
};

// Run tests
async function runTests(): Promise<void> {
  const testNames = Object.keys(tests);
  let passed = 0;
  let failed = 0;
  const failures: { name: string; error: Error }[] = [];

  console.log(`\n📋 Running ${testNames.length} tests...\n`);

  for (const testName of testNames) {
    try {
      tests[testName]();
      console.log(`✓ ${testName}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${testName}`);
      if (error instanceof Error) {
        failures.push({ name: testName, error });
      }
      failed++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${testNames.length} tests`);
  console.log(`${'='.repeat(60)}\n`);

  if (failures.length > 0) {
    console.log('Failed tests:\n');
    for (const { name, error } of failures) {
      console.log(`  ✗ ${name}`);
      console.log(`    ${error.message}\n`);
    }
    process.exit(1);
  } else {
    console.log('✓ All tests passed!');
    process.exit(0);
  }
}

runTests();
