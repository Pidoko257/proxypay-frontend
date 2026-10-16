/**
 * Tests for API Caching Strategy (ApiCacheService)
 * 
 * Runs with: npx ts-node --transpile-only src/caching/__tests__/apiCache.test.ts
 */

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

if (typeof global !== 'undefined' && !global.localStorage) {
  (global as any).localStorage = new MockLocalStorage();
}

import { ApiCacheService } from '../apiCacheService';

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

async function runTests() {
  console.log('Running API Cache Service tests...');

  // 1. Test cache hit & miss
  {
    const storage = new MockLocalStorage();
    (global as any).localStorage = storage;

    const service = ApiCacheService.resetInstance({
      defaultTtl: 1000,
      storageKey: 'test-cache',
    });

    const key = 'GET:/transactions';
    const data = [{ id: '1', amount: 100 }];

    // Miss
    assert(service.get(key) === null, 'Should return null on cache miss');
    assertEqual(service.getStats().misses, 1, 'Misses count should be 1');

    // Set & Hit
    service.set(key, '/transactions', data);
    const retrieved = service.get(key);
    assert(retrieved !== null, 'Should retrieve cached data');
    assertEqual(retrieved.length, 1, 'Data length should be 1');
    assertEqual(service.getStats().hits, 1, 'Hits count should be 1');
  }

  // 2. Test TTL expiration
  {
    const storage = new MockLocalStorage();
    (global as any).localStorage = storage;

    const service = ApiCacheService.resetInstance({
      defaultTtl: 50, // 50ms TTL
      storageKey: 'test-cache-ttl',
    });

    const key = 'GET:/fast';
    service.set(key, '/fast', { ok: true }, 30);

    assert(service.get(key) !== null, 'Should be valid before TTL expires');

    await new Promise((resolve) => setTimeout(resolve, 40));

    assert(service.get(key) === null, 'Should be expired after TTL');
  }

  // 3. Test mutation invalidation
  {
    const storage = new MockLocalStorage();
    (global as any).localStorage = storage;

    const service = ApiCacheService.resetInstance({
      storageKey: 'test-cache-mutation',
    });

    service.set('GET:/transactions', '/transactions', [1, 2]);
    service.set('GET:/health', '/health', { status: 'ok' });

    assert(service.get('GET:/transactions') !== null, 'Transactions should be cached');
    assert(service.get('GET:/health') !== null, 'Health should be cached');

    // Mutation POST /transactions
    service.invalidateOnMutation('/transactions', 'POST');

    assert(service.get('GET:/transactions') === null, 'Transactions cache should be invalidated on mutation');
    assert(service.get('GET:/health') !== null, 'Health cache should remain');
  }

  // 4. Test manual invalidation and clear
  {
    const storage = new MockLocalStorage();
    (global as any).localStorage = storage;

    const service = ApiCacheService.resetInstance({
      storageKey: 'test-cache-manual',
    });

    service.set('GET:/a', '/a', 1);
    service.set('GET:/b', '/b', 2);

    assert(service.invalidate('GET:/a') === true, 'Should invalidate key');
    assert(service.get('GET:/a') === null, 'Key a should be null');
    assert(service.get('GET:/b') !== null, 'Key b should still exist');

    service.clear();
    assertEqual(service.getStats().totalEntries, 0, 'Total entries should be 0 after clear');
  }

  console.log('✅ All API Cache Service tests passed successfully!');
}

runTests().catch((err) => {
  console.error('❌ API Cache tests failed:', err);
  process.exit(1);
});
