import { useState, useCallback, useEffect } from 'react';

export interface HistoryEntry {
  id: string;
  method: string;
  path: string;
  timestamp: number;
  statusCode: number;
  latency: number;
}

const HISTORY_STORAGE_KEY = 'proxypay-request-history';
const MAX_HISTORY_ENTRIES = 50;

/**
 * Custom hook for managing request history with localStorage persistence
 */
export function useRequestHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setHistory(Array.isArray(parsed) ? parsed : []);
        }
      } catch (error) {
        console.error('Failed to load request history:', error);
      }
    };

    loadHistory();
  }, []);

  /**
   * Add a new entry to the history
   */
  const addEntry = useCallback(
    (method: string, path: string, statusCode: number, latency: number) => {
      const newEntry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        method,
        path,
        timestamp: Date.now(),
        statusCode,
        latency,
      };

      const updated = [newEntry, ...history].slice(0, MAX_HISTORY_ENTRIES);
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
   * Clear all history entries
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
   * Remove a specific entry by ID
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
   * Get recent entries, optionally filtered by method
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
   * Check if a given request exists in history
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
    hasEntry,
  };
}
