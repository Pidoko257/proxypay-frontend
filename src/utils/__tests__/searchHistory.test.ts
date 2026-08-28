/**
 * Tests for the API Reference search history (issue #358).
 * Verifies localStorage persistence, the 20-entry cap, case-insensitive
 * de-duplication and autocomplete suggestions.
 */

import {
  MAX_SEARCH_HISTORY,
  SEARCH_HISTORY_KEY,
  addSearchTerm,
  clearSearchHistory,
  getSearchSuggestions,
  loadSearchHistory,
  type StorageLike,
} from '../searchHistory';

class MemoryStorage implements StorageLike {
  store: Record<string, string> = {};
  getItem(key: string): string | null {
    return key in this.store ? this.store[key] : null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
}

describe('searchHistory (#358)', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('persists searches to storage, most-recent first', () => {
    addSearchTerm('payments', storage);
    addSearchTerm('refunds', storage);

    expect(loadSearchHistory(storage)).toEqual(['refunds', 'payments']);
    expect(JSON.parse(storage.store[SEARCH_HISTORY_KEY])).toEqual([
      'refunds',
      'payments',
    ]);
  });

  it('survives a reload (reads back from storage)', () => {
    addSearchTerm('GET /charges', storage);
    const reloaded = loadSearchHistory(storage);
    expect(reloaded).toContain('GET /charges');
  });

  it('de-duplicates case-insensitively and bumps the entry to the front', () => {
    addSearchTerm('Payments', storage);
    addSearchTerm('refunds', storage);
    addSearchTerm('payments', storage);

    const history = loadSearchHistory(storage);
    expect(history).toEqual(['payments', 'refunds']);
    expect(history.filter((t) => t.toLowerCase() === 'payments')).toHaveLength(1);
  });

  it('caps the history at 20 entries', () => {
    for (let i = 0; i < 30; i++) {
      addSearchTerm(`query-${i}`, storage);
    }
    const history = loadSearchHistory(storage);
    expect(history).toHaveLength(MAX_SEARCH_HISTORY);
    // Newest kept, oldest dropped.
    expect(history[0]).toBe('query-29');
    expect(history).not.toContain('query-9');
  });

  it('ignores empty / whitespace-only terms', () => {
    addSearchTerm('   ', storage);
    addSearchTerm('', storage);
    expect(loadSearchHistory(storage)).toEqual([]);
  });

  it('clears the history', () => {
    addSearchTerm('payments', storage);
    clearSearchHistory(storage);
    expect(loadSearchHistory(storage)).toEqual([]);
  });

  it('tolerates corrupt storage payloads', () => {
    storage.store[SEARCH_HISTORY_KEY] = '{not json';
    expect(loadSearchHistory(storage)).toEqual([]);
  });

  it('suggests matching history entries for the current query', () => {
    ['payments', 'refunds', 'payment-methods', 'webhooks'].forEach((t) =>
      addSearchTerm(t, storage),
    );
    const history = loadSearchHistory(storage);

    const suggestions = getSearchSuggestions('pay', history);
    expect(suggestions).toEqual(
      expect.arrayContaining(['payments', 'payment-methods']),
    );
    expect(suggestions).not.toContain('webhooks');
  });

  it('returns recent entries for an empty query and excludes exact matches', () => {
    ['payments', 'refunds'].forEach((t) => addSearchTerm(t, storage));
    const history = loadSearchHistory(storage);

    expect(getSearchSuggestions('', history)).toEqual(['refunds', 'payments']);
    expect(getSearchSuggestions('payments', history)).not.toContain('payments');
  });

  it('works without any storage (returns in-memory result)', () => {
    const result = addSearchTerm('payments', undefined as unknown as StorageLike);
    // No storage available in the node test env → empty persisted list,
    // but the call itself must not throw.
    expect(Array.isArray(result)).toBe(true);
  });
});
