import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Clock } from 'lucide-react'
import { Transaction } from '../services/api'
import '../styles/TransactionSearch.css'

const SEARCH_HISTORY_KEY = 'proxypay_search_history'
const MAX_HISTORY_ITEMS = 8

// ── Utility: exported so TransactionsTable can use it ────────────────────────

/**
 * Returns true if the transaction matches the given search query.
 * Matches against id, reference, and provider (case-insensitive).
 */
export function matchesSearch(tx: Transaction, query: string): boolean {
  if (!query.trim()) return true
  const q = query.toLowerCase().trim()
  return (
    tx.id.toLowerCase().includes(q) ||
    tx.reference.toLowerCase().includes(q) ||
    tx.provider.toLowerCase().includes(q)
  )
}

/**
 * Wraps any portion of `text` that matches `query` in a <mark> element.
 */
export function HighlightMatch({
  text,
  query,
}: {
  text: string
  query: string
}): React.ReactElement {
  if (!query.trim()) return <>{text}</>

  const q = query.trim()
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return <>{text}</>

  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}

// ── Search history helpers ────────────────────────────────────────────────────

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function saveHistory(history: string[]): void {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history))
  } catch {
    // localStorage may be unavailable (e.g. private mode quota)
  }
}

function addToHistory(query: string, existing: string[]): string[] {
  const q = query.trim()
  if (!q) return existing
  const deduped = [q, ...existing.filter((h) => h !== q)].slice(
    0,
    MAX_HISTORY_ITEMS
  )
  saveHistory(deduped)
  return deduped
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TransactionSearchProps {
  /** Called with the debounced query string whenever it changes */
  onSearch: (query: string) => void
  /** Number of results currently visible after filtering */
  resultCount: number
  /** Total unfiltered transaction count */
  totalCount: number
}

export const TransactionSearch: React.FC<TransactionSearchProps> = ({
  onSearch,
  resultCount,
  totalCount,
}) => {
  const [inputValue, setInputValue] = useState('')
  const [history, setHistory] = useState<string[]>(loadHistory)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounce: fire onSearch 300 ms after the last keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(inputValue)
    }, 300)
    return () => clearTimeout(timer)
  }, [inputValue, onSearch])

  // Close suggestion list on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setShowSuggestions(e.target.value === '' && history.length > 0)
  }

  const handleFocus = () => {
    if (inputValue === '' && history.length > 0) {
      setShowSuggestions(true)
    }
  }

  const handleClear = useCallback(() => {
    setInputValue('')
    onSearch('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }, [onSearch])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const updated = addToHistory(inputValue, history)
      setHistory(updated)
      setShowSuggestions(false)
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const applyHistoryItem = (term: string) => {
    setInputValue(term)
    onSearch(term)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const removeHistoryItem = (
    e: React.MouseEvent,
    term: string
  ) => {
    e.stopPropagation()
    const updated = history.filter((h) => h !== term)
    setHistory(updated)
    saveHistory(updated)
  }

  const isFiltered = inputValue.trim().length > 0

  return (
    <div className="transaction-search" ref={containerRef}>
      <div className="search-input-wrapper">
        <Search size={16} className="search-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          className="search-input"
          placeholder="Search by ID, reference, provider…"
          value={inputValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          aria-label="Search transactions"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          autoComplete="off"
        />
        {inputValue && (
          <button
            className="search-clear"
            onClick={handleClear}
            aria-label="Clear search"
            type="button"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Result count pill */}
      {isFiltered && (
        <span className="search-result-count" aria-live="polite" role="status">
          {resultCount} of {totalCount} result{totalCount !== 1 ? 's' : ''}
        </span>
      )}

      {/* History suggestions */}
      {showSuggestions && history.length > 0 && (
        <ul className="search-suggestions" role="listbox" aria-label="Search history">
          <li className="suggestions-heading">
            <Clock size={12} aria-hidden="true" />
            Recent searches
          </li>
          {history.map((term) => (
            <li
              key={term}
              className="suggestion-item"
              role="option"
              aria-selected={false}
              onClick={() => applyHistoryItem(term)}
            >
              <Clock size={12} className="suggestion-icon" aria-hidden="true" />
              <span>{term}</span>
              <button
                className="suggestion-remove"
                onClick={(e) => removeHistoryItem(e, term)}
                aria-label={`Remove "${term}" from history`}
                type="button"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
