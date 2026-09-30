/**
 * Persistent search history for the Integrated API Reference search box.
 *
 * Fix #358: searches were never remembered, so repeating a lookup meant
 * retyping it, and there were no suggestions.  History is stored in
 * `localStorage`, most-recent first, de-duplicated case-insensitively and
 * capped at {@link MAX_SEARCH_HISTORY} entries.  {@link getSearchSuggestions}
 * turns it into autocomplete options.
 */

export const SEARCH_HISTORY_KEY = 'proxypay:api-reference:search-history';
export const MAX_SEARCH_HISTORY = 20;

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function resolveStorage(explicit?: StorageLike): StorageLike | null {
  if (explicit) return explicit;
  try {
    return typeof window !== 'undefined' && window.localStorage
      ? window.localStorage
      : null;
  } catch {
    // Access to localStorage can throw (privacy mode, disabled storage).
    return null;
  }
}

/** Read the stored history. Always returns a sane array. */
export function loadSearchHistory(storage?: StorageLike): string[] {
  const store = resolveStorage(storage);
  if (!store) return [];

  try {
    const raw = store.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .slice(0, MAX_SEARCH_HISTORY);
  } catch {
    return [];
  }
}

/**
 * Add a term to the front of the history and persist it.
 * Returns the updated list (also when persistence is unavailable).
 */
export function addSearchTerm(term: string, storage?: StorageLike): string[] {
  const trimmed = term.trim();
  const current = loadSearchHistory(storage);
  if (!trimmed) return current;

  const deduped = current.filter(
    (t) => t.toLowerCase() !== trimmed.toLowerCase(),
  );
  const next = [trimmed, ...deduped].slice(0, MAX_SEARCH_HISTORY);

  const store = resolveStorage(storage);
  if (store) {
    try {
      store.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
    } catch {
      // Quota exceeded / unavailable — still return the in-memory list.
    }
  }
  return next;
}

/** Empty the stored history. */
export function clearSearchHistory(storage?: StorageLike): void {
  const store = resolveStorage(storage);
  try {
    store?.setItem(SEARCH_HISTORY_KEY, JSON.stringify([]));
  } catch {
    // ignore
  }
}

/**
 * Suggestions for the current query: history entries that contain the query
 * (case-insensitive), newest first, excluding an exact match.  An empty query
 * returns the most recent entries.
 */
export function getSearchSuggestions(
  query: string,
  history: string[],
  limit = 8,
): string[] {
  const q = query.trim().toLowerCase();
  const matches = q
    ? history.filter(
        (t) => t.toLowerCase().includes(q) && t.toLowerCase() !== q,
      )
    : history;
  return matches.slice(0, Math.max(0, limit));
}
