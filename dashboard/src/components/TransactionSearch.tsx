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
 * Relevance tiers used to rank search results. Higher is more relevant.
 * Exact matches on structured fields rank above prefix matches, which in
 * turn rank above incidental substring matches.
 */
export const SEARCH_RANK = {
  EXACT: 3,
  PREFIX: 2,
  SUBSTRING: 1,
  NONE: 0,
} as const

/**
 * Scores a single field against the query, returning the best relevance tier.
 * Exact match > prefix match > substring match > no match.
 */
function scoreField(value: string, q: string): number {
  const v = value.toLowerCase()
  if (v === q) return SEARCH_RANK.EXACT
  if (v.startsWith(q)) return SEARCH_RANK.PREFIX
  if (v.includes(q)) return SEARCH_RANK.SUBSTRING
  return SEARCH_RANK.NONE
}

/**
 * Computes a relevance score for a transaction against the query.
 * Structured fields (id, reference, provider) are ranked by their best tier.
 * Returns 0 when the transaction does not match at all.
 */
export function searchRelevance(tx: Transaction, query: string): number {
  if (!query.trim()) return SEARCH_RANK.NONE
  const q = query.toLowerCase().trim()
  return Math.max(
    scoreField(tx.id, q),
    scoreField(tx.reference, q),
    scoreField(tx.provider, q)
  )
}

/**
 * Filters and ranks transactions by relevance to the query.
 * Preserves the existing inclusion behavior of `matchesSearch` while
 * ordering exact and prefix matches ahead of broad substring matches.
 * Ties are broken deterministically by id.
 */
export function rankTransactions(
  transactions: Transaction[],
  query: string
): Transaction[] {
  if (!query.trim()) return transactions
  return transactions
    .filter((tx) => matchesSearch(tx, query))
    .map((tx) => ({ tx, score: searchRelevance(tx, query) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.tx.id.localeCompare(b.tx.id)
    })
    .map(({ tx }) => tx)
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

interface TransactionSearchProps {
  onSelect?: (operation: Operation | null) => void;
}

const SEARCH_PARAM = 'q';
const OPERATION_PARAM = 'op';
const DEPRECATED_PARAM = 'deprecated';

const TransactionSearch: React.FC<TransactionSearchProps> = ({ onSelect }) => {
  const { operations } = useApiData();
  const history = useHistory();
  const location = useLocation();

// ── Portal page route index ───────────────────────────────────────────────────

export type PageCategory = 'Guides' | 'Dashboards' | 'Settings'

export interface PortalPage {
  title: string
  description: string
  path: string
  category: PageCategory
  keywords?: string[]
}

/**
 * Route index built from the portal's page metadata. Used by the
 * portal-wide search dialog to surface guides, dashboards, and settings.
 */
export const PORTAL_PAGES: PortalPage[] = [
  {
    title: 'Getting Started',
    description: 'Install the SDK and send your first request.',
    path: '/docs/getting-started',
    category: 'Guides',
    keywords: ['install', 'quickstart', 'setup'],
  },
  {
    title: 'Authentication',
    description: 'API keys, signing, and request authentication.',
    path: '/docs/authentication',
    category: 'Guides',
    keywords: ['api key', 'token', 'auth'],
  },
  {
    title: 'Endpoint Reference',
    description: 'Browse every available API endpoint.',
    path: '/docs/reference',
    category: 'Guides',
    keywords: ['api', 'endpoints', 'reference'],
  },
  {
    title: 'Transactions Dashboard',
    description: 'View and filter recent transactions.',
    path: '/dashboard/transactions',
    category: 'Dashboards',
    keywords: ['payments', 'history', 'activity'],
  },
  {
    title: 'Analytics Overview',
    description: 'Volume, success rate, and provider breakdown.',
    path: '/dashboard/analytics',
    category: 'Dashboards',
    keywords: ['metrics', 'charts', 'stats'],
  },
  {
    title: 'Account Settings',
    description: 'Manage profile, team, and billing details.',
    path: '/settings/account',
    category: 'Settings',
    keywords: ['profile', 'team', 'billing'],
  },
  {
    title: 'API Keys',
    description: 'Create and revoke API keys.',
    path: '/settings/api-keys',
    category: 'Settings',
    keywords: ['keys', 'secrets', 'tokens'],
  },
]

/**
 * Returns portal pages matching the query against title, description,
 * and keywords (case-insensitive). Empty query returns all pages.
 */
export function searchPortalPages(query: string): PortalPage[] {
  const q = query.toLowerCase().trim()
  if (!q) return PORTAL_PAGES
  return PORTAL_PAGES.filter((page) => {
    const haystack = [page.title, page.description, ...(page.keywords ?? [])]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

/**
 * Groups portal pages by category, preserving category order.
 */
export function groupPortalPages(
  pages: PortalPage[]
): Array<{ category: PageCategory; pages: PortalPage[] }> {
  const order: PageCategory[] = ['Guides', 'Dashboards', 'Settings']
  return order
    .map((category) => ({
      category,
      pages: pages.filter((p) => p.category === category),
    }))
    .filter((group) => group.pages.length > 0)
}

// ── Component ─────────────────────────────────────────────────────────────────

  const [inputValue, setInputValue] = useState(searchQuery);
  const [revealHidden, setRevealHidden] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(location.search);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      const query = next.toString();
      history.replace({ ...location, search: query ? `?${query}` : '' });
    },
    [history, location]
  );

  const matchesFilters = useCallback(
    (operation: Operation) => {
      if (!showDeprecated && operation.deprecated) {
        return false;
      }
      if (!searchQuery) {
        return true;
      }
      const haystack = [
        getOperationId(operation),
        getOperationPath(operation),
        operation.summary,
        operation.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(searchQuery.toLowerCase());
    },
    [searchQuery, showDeprecated]
  );

  const selectedOperation = useMemo(
    () => operations.find((op) => getOperationId(op) === selectedOperationId) ?? null,
    [operations, selectedOperationId]
  );

  const selectedIsHidden = selectedOperation !== null && !matchesFilters(selectedOperation);

  const visibleOperations = useMemo(() => {
    const filtered = operations.filter(matchesFilters);
    if (selectedOperation && selectedIsHidden && revealHidden) {
      return [selectedOperation, ...filtered];
    }
    return filtered;
  }, [operations, matchesFilters, selectedOperation, selectedIsHidden, revealHidden]);

  useEffect(() => {
    if (!selectedOperation || !listRef.current) {
      return;
    }
    const node = listRef.current.querySelector<HTMLElement>(
      `[data-operation-id="${CSS.escape(getOperationId(selectedOperation))}"]`
    );
    node?.scrollIntoView({ block: 'nearest' });
  }, [selectedOperation, visibleOperations]);

  const handleSelect = useCallback(
    (operation: Operation) => {
      const id = getOperationId(operation);
      const isSame = id === selectedOperationId;
      updateParams({ [OPERATION_PARAM]: isSame ? null : id });
      onSelect?.(isSame ? null : operation);
    },
    [selectedOperationId, updateParams, onSelect]
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setInputValue(value);
      setRevealHidden(false);
      updateParams({ [SEARCH_PARAM]: value || null });
    },
    [updateParams]
  );

  const handleDeprecatedToggle = useCallback(() => {
    setRevealHidden(false);
    updateParams({ [DEPRECATED_PARAM]: showDeprecated ? null : 'true' });
  }, [showDeprecated, updateParams]);

  const handleRevealSelected = useCallback(() => {
    setRevealHidden(true);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search endpoints..."
          value={inputValue}
          onChange={handleSearchChange}
          aria-label="Search endpoints"
        />
        <label className={styles.deprecatedToggle}>
          <input type="checkbox" checked={showDeprecated} onChange={handleDeprecatedToggle} />
          Show deprecated
        </label>
      </div>

      {selectedIsHidden && !revealHidden && (
        <div className={styles.hiddenNotice} role="status">
          <span>
            The selected endpoint <strong>{getOperationId(selectedOperation!)}</strong> is hidden by
            the active filters.
          </span>
          <button type="button" className={styles.revealButton} onClick={handleRevealSelected}>
            Reveal selected endpoint
          </button>
        </div>
      )}

      {visibleOperations.length === 0 ? (
        <p className={styles.emptyState}>No endpoints match the current filters.</p>
      ) : (
        <ul className={styles.list} ref={listRef}>
          {visibleOperations.map((operation) => {
            const id = getOperationId(operation);
            const isSelected = id === selectedOperationId;
            return (
              <li key={id}>
                <button
                  type="button"
                  data-operation-id={id}
                  className={clsx(styles.item, isSelected && styles.itemSelected)}
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() => handleSelect(operation)}
                >
                  <span className={styles.method}>{operation.method.toUpperCase()}</span>
                  <span className={styles.path}>{getOperationPath(operation)}</span>
                  {operation.summary && <span className={styles.summary}>{operation.summary}</span>}
                  {operation.deprecated && <span className={styles.deprecatedBadge}>Deprecated</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  )
}

// ── Portal-wide search dialog ─────────────────────────────────────────────────

interface PortalSearchDialogProps {
  open: boolean
  onClose: () => void
  /** Optional navigation handler; defaults to window.location assignment */
  onNavigate?: (path: string) => void
}

export const PortalSearchDialog: React.FC<PortalSearchDialogProps> = ({
  open,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = searchPortalPages(query)
  const groups = groupPortalPages(results)
  const flatResults = groups.flatMap((g) => g.pages)

  // Reset state and focus input when the dialog opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      inputRef.current?.focus()
    }
  }, [open])

  // Clamp active index when results change
  useEffect(() => {
    setActiveIndex((prev) =>
      flatResults.length === 0 ? 0 : Math.min(prev, flatResults.length - 1)
    )
  }, [flatResults.length])

  const navigate = useCallback(
    (path: string) => {
      if (onNavigate) {
        onNavigate(path)
      } else if (typeof window !== 'undefined') {
        window.location.assign(path)
      }
      onClose()
    },
    [onNavigate, onClose]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) =>
        flatResults.length === 0 ? 0 : (prev + 1) % flatResults.length
      )
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) =>
        flatResults.length === 0
          ? 0
          : (prev - 1 + flatResults.length) % flatResults.length
      )
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const target = flatResults[activeIndex]
      if (target) navigate(target.path)
    }
  }

  if (!open) return null

  let runningIndex = -1

  return (
    <div
      className="portal-search-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="portal-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Search portal pages"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            className="search-input"
            placeholder="Search guides, dashboards, settings…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            aria-label="Search portal pages"
            aria-controls="portal-search-results"
            aria-activedescendant={
              flatResults[activeIndex]
                ? `portal-search-result-${activeIndex}`
                : undefined
            }
            autoComplete="off"
          />
          <button
            className="search-clear"
            onClick={onClose}
            aria-label="Close search"
            type="button"
          >
            <X size={14} />
          </button>
        </div>

        <div
          className="portal-search-results"
          id="portal-search-results"
          role="listbox"
          aria-label="Portal search results"
        >
          {flatResults.length === 0 && (
            <p className="portal-search-empty" role="status">
              No pages match “{query}”.
            </p>
          )}
          {groups.map((group) => (
            <div key={group.category} className="portal-search-group">
              <div className="portal-search-group-heading" role="presentation">
                {group.category}
              </div>
              {group.pages.map((page) => {
                runningIndex += 1
                const index = runningIndex
                const isActive = index === activeIndex
                return (
                  <a
                    key={page.path}
                    id={`portal-search-result-${index}`}
                    href={page.path}
                    className={`portal-search-result${
                      isActive ? ' is-active' : ''
                    }`}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(page.path)
                    }}
                  >
                    <span className="portal-search-result-title">
                      <HighlightMatch text={page.title} query={query} />
                    </span>
                    <span className="portal-search-result-description">
                      {page.description}
                    </span>
                  </a>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
