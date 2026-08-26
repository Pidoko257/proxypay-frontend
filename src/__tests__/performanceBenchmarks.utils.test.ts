import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSlaStatus,
  isValidSlaTarget,
  loadCustomSlaTargets,
  saveCustomSlaTarget,
  applyCustomSlaTargets,
  SLA_STORAGE_KEY,
} from '../components/performanceBenchmarks.utils.ts';

function memoryStore() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    _map: map,
  };
}

test('computeSlaStatus classifies against the target', () => {
  assert.equal(computeSlaStatus(400, 500), 'ok');
  assert.equal(computeSlaStatus(600, 500), 'warn'); // within 1.5x
  assert.equal(computeSlaStatus(800, 500), 'breach'); // beyond 1.5x
  assert.equal(computeSlaStatus(999, 0), 'ok'); // invalid target -> ok
});

test('isValidSlaTarget rejects non-positive / absurd values', () => {
  assert.equal(isValidSlaTarget(250), true);
  assert.equal(isValidSlaTarget(0), false);
  assert.equal(isValidSlaTarget(-5), false);
  assert.equal(isValidSlaTarget(700000), false);
  assert.equal(isValidSlaTarget('250' as unknown), false);
});

test('saveCustomSlaTarget persists and loadCustomSlaTargets reads it back', () => {
  const store = memoryStore();
  saveCustomSlaTarget('POST /payments', 300, store);
  assert.deepEqual(loadCustomSlaTargets(store), { 'POST /payments': 300 });
  assert.ok(store._map.get(SLA_STORAGE_KEY));
});

test('saveCustomSlaTarget with null clears an endpoint override', () => {
  const store = memoryStore();
  saveCustomSlaTarget('GET /wallets/{id}', 120, store);
  saveCustomSlaTarget('GET /wallets/{id}', null, store);
  assert.deepEqual(loadCustomSlaTargets(store), {});
});

test('loadCustomSlaTargets ignores corrupt / invalid stored data', () => {
  const store = memoryStore();
  store.setItem(SLA_STORAGE_KEY, '{ not json');
  assert.deepEqual(loadCustomSlaTargets(store), {});
  store.setItem(SLA_STORAGE_KEY, JSON.stringify({ a: -1, b: 200 }));
  assert.deepEqual(loadCustomSlaTargets(store), { b: 200 });
});

test('applyCustomSlaTargets overrides target and recomputes status', () => {
  const rows = [
    { endpoint: 'GET /momo/lookup', p95: 1250, slaTarget: 800, slaStatus: 'warn' as const },
    { endpoint: 'GET /wallets/{id}', p95: 95, slaTarget: 100, slaStatus: 'ok' as const },
  ];
  const out = applyCustomSlaTargets(rows, { 'GET /momo/lookup': 2000 });
  assert.equal(out[0].slaTarget, 2000);
  assert.equal(out[0].slaStatus, 'ok');
  assert.equal(out[1].slaTarget, 100); // untouched
});
