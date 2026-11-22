import { useState, useCallback, useEffect } from 'react';

export interface HistoryEntry {
  id: string;
  method: string;
  path: string;
  timestamp: number;
  statusCode: number;
  latency: number;
  /** Request query/body params captured at call time (#597) */
  params?: Record<string, unknown>;
  /** Key response headers captured at call time (#597) */
  responseHeaders?: Record<string, string>;
}

const HISTORY_STORAGE_KEY = 'proxypay-request-history';
const MAX_HISTORY_ENTRIES = 50;
/** 24-hour retention window (#597) */
const RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * Custom hook for managing request history with localStorage persistence.
 *
 * Extended for Issue #597:
 * - Stores params and response headers alongside existing fields.
 * - Enforces 24-hour retention on load and on add.
 * - Exposes filterByEndpoint / filterByMethod helpers.
 * - Exposes exportToJson for downloading logs.
 */
export function useRequestHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Load history from localStorage on mount, purging stale entries
  useEffect(() => {
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (stored) {
          const parsed: HistoryEntry[] = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const cutoff = Date.now() - RETENTION_MS;
            setHistory(parsed.filter((e) => e.timestamp > cutoff));
          }
        }
      } catch (error) {
        console.error('Failed to load request history:', error);
      }
    };

    loadHistory();
  }, []);

  /**
   * Add a new entry to the history.
   * Old entries (>24 h) are automatically pruned.
   */
  const addEntry = useCallback(
    (
      method: string,
      path: string,
      statusCode: number,
      latency: number,
      params?: Record<string, unknown>,
      responseHeaders?: Record<string, string>,
    ) => {
      const newEntry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        method,
        path,
        timestamp: Date.now(),
        statusCode,
        latency,
        params,
        responseHeaders,
      };

      const cutoff = Date.now() - RETENTION_MS;
      const updated = [newEntry, ...history]
        .filter((e) => e.timestamp > cutoff)
        .slice(0, MAX_HISTORY_ENTRIES);

      setHistory(updated);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save request history:', error);
      }
    },
    [history]
  );

  /**
   * Clear all history entries.
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear request history:', error);
    }
  }, []);

  /**
   * Remove a specific entry by ID.
   */
  const removeEntry = useCallback(
    (id: string) => {
      const updated = history.filter((entry) => entry.id !== id);
      setHistory(updated);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to update request history:', error);
      }
    },
    [history]
  );

  /**
   * Get recent entries, optionally filtered by method.
   */
  const getRecentEntries = useCallback(
    (method?: string, limit: number = 10): HistoryEntry[] => {
      let filtered = history;
      if (method) {
        filtered = filtered.filter((entry) => entry.method === method);
      }
      return filtered.slice(0, limit);
    },
    [history]
  );

  /**
   * Filter entries by endpoint substring (#597).
   */
  const filterByEndpoint = useCallback(
    (endpoint: string): HistoryEntry[] => {
      const term = endpoint.toLowerCase();
      return history.filter((entry) => entry.path.toLowerCase().includes(term));
    },
    [history]
  );

  /**
   * Filter entries by HTTP method (#597).
   */
  const filterByMethod = useCallback(
    (method: string): HistoryEntry[] => {
      return history.filter(
        (entry) => entry.method.toUpperCase() === method.toUpperCase()
      );
    },
    [history]
  );

  /**
   * Export current history as a JSON string for download (#597).
   */
  const exportToJson = useCallback(
    (filter?: { endpoint?: string; method?: string }): string => {
      let entries = history;
      if (filter?.method) {
        entries = entries.filter(
          (e) => e.method.toUpperCase() === filter.method!.toUpperCase()
        );
      }
      if (filter?.endpoint) {
        const term = filter.endpoint.toLowerCase();
        entries = entries.filter((e) => e.path.toLowerCase().includes(term));
      }
      return JSON.stringify(entries, null, 2);
    },
    [history]
  );

  /**
   * Check if a given request exists in history.
   */
  const hasEntry = useCallback(
    (method: string, path: string): boolean => {
      return history.some((entry) => entry.method === method && entry.path === path);
    },
    [history]
  );

  return {
    history,
    addEntry,
    clearHistory,
    removeEntry,
    getRecentEntries,
    filterByEndpoint,
    filterByMethod,
    exportToJson,
    hasEntry,
  };
}
