import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  EXPANDED_TAGS_STORAGE_KEY,
  VIRTUALIZE_THRESHOLD,
  computeVisibleRange,
  readExpandedTags,
  writeExpandedTags,
} from '../apiSidebarNavState.ts';

/** Minimal in-memory localStorage + window stub for the persistence tests. */
function installWindowStub(): void {
  const store = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
  };
}

describe('apiSidebarNavState persistence (#359)', () => {
  beforeEach(installWindowStub);
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it('returns an empty list when nothing is stored', () => {
    assert.deepEqual(readExpandedTags(), []);
  });

  it('persists and restores expanded tags', () => {
    writeExpandedTags(['Payments', 'Webhooks']);
    assert.deepEqual(readExpandedTags(), ['Payments', 'Webhooks']);
  });

  it('accepts a Set and stores it under the documented key', () => {
    writeExpandedTags(new Set(['Auth']));
    const raw = (globalThis as { window: { localStorage: Storage } }).window.localStorage.getItem(
      EXPANDED_TAGS_STORAGE_KEY,
    );
    assert.equal(raw, JSON.stringify(['Auth']));
  });

  it('ignores corrupt stored data instead of throwing', () => {
    (globalThis as { window: { localStorage: Storage } }).window.localStorage.setItem(
      EXPANDED_TAGS_STORAGE_KEY,
      '{not json',
    );
    assert.deepEqual(readExpandedTags(), []);
  });

  it('is SSR-safe when window is undefined', () => {
    delete (globalThis as { window?: unknown }).window;
    assert.deepEqual(readExpandedTags(), []);
    assert.doesNotThrow(() => writeExpandedTags(['x']));
  });
});

describe('apiSidebarNavState virtualization (#360)', () => {
  const ROWS = 2000;

  it('renders only a small window of a large list', () => {
    const { first, last } = computeVisibleRange(0, ROWS);
    assert.equal(first, 0);
    assert.ok(last - first < 60, `expected a small window, got ${last - first}`);
    assert.ok(last < ROWS);
  });

  it('moves the window as the list scrolls', () => {
    const top = computeVisibleRange(0, ROWS);
    const mid = computeVisibleRange(10_000, ROWS);
    assert.ok(mid.first > top.first);
    assert.equal(mid.offsetY, mid.first * 34);
    assert.equal(mid.totalHeight, ROWS * 34);
  });

  it('clamps the window to the list bounds', () => {
    const end = computeVisibleRange(1_000_000, ROWS);
    assert.equal(end.last, ROWS);
    assert.ok(end.first >= 0 && end.first <= ROWS);
  });

  it('threshold is >100 as required by the issue', () => {
    assert.equal(VIRTUALIZE_THRESHOLD, 100);
  });

  it('keeps the rendered window tiny even for 1000+ endpoints', () => {
    const { first, last } = computeVisibleRange(5_000, 5000);
    assert.ok(last - first <= 40);
  });
});
