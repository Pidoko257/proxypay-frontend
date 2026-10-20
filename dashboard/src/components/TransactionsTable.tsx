import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { TableVirtuoso, type TableVirtuosoHandle } from 'react-virtuoso'
import { useTransactionStore } from '../stores/transactionStore'
import { trackFeatureFlagEvaluation, useFeatureFlagStore } from '../stores/featureFlagStore'
import { useViewPreferencesStore } from '../stores/viewPreferencesStore'
import { ViewPreferencesPanel } from './ViewPreferencesPanel'
import { Transaction } from '../services/api'
import { TransactionTableSkeleton } from './TransactionTableSkeleton'
import { TransactionSearch, matchesSearch, HighlightMatch } from './TransactionSearch'
import { DateRangePicker, DateRange, matchesDateRange } from './DateRangePicker'
import { StatusFilter, TransactionStatus, matchesStatus } from './StatusFilter'
import { TransactionRowPreview } from './TransactionRowPreview'
import { usePreviewState } from '../hooks/usePreviewState'
import '../styles/TransactionsTable.css'

interface SortState {
  column: keyof Transaction | null
  direction: 'asc' | 'desc'
}

interface TransactionPreviewPosition {
  top: number
  left: number
}

interface PreviewState {
  transaction: Transaction
  position: TransactionPreviewPosition
}

/**
 * #726 — Normalized sort value. `null` marks a missing/invalid value so it can
 * be placed deterministically (always last) regardless of sort direction.
 */
type NormalizedSortValue =
  | { kind: 'number'; value: number }
  | { kind: 'date'; value: number }
  | { kind: 'string'; value: string }
  | null

const DATE_LIKE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/

/**
 * #727 — Parse a transaction timestamp defensively.
 *
 * Returns the epoch milliseconds for a valid timestamp, or `null` for
 * missing/invalid values. Date-only strings (e.g. `2024-01-15`) are
 * interpreted as UTC midnight so filtering is consistent across browser time
 * zones; strings with an explicit offset (`Z`, `+hh:mm`, `-hh:mm`) are honored
 * as-is. This is the single normalization point used before any date-range
 * comparison.
 */
const parseTimestamp = (raw: unknown): number | null => {
  if (raw === null || raw === undefined) return null

  if (raw instanceof Date) {
    const time = raw.getTime()
    return Number.isNaN(time) ? null : time
  }

  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null
  }

  if (typeof raw !== 'string') return null

  const trimmed = raw.trim()
  if (trimmed === '') return null

  // Date-only strings are treated as UTC midnight for cross-timezone stability.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const time = Date.parse(`${trimmed}T00:00:00Z`)
    return Number.isNaN(time) ? null : time
  }

  const time = Date.parse(trimmed)
  return Number.isNaN(time) ? null : time
}

/**
 * #726 — Normalize a raw transaction field into a comparable value.
 * Numbers (and numeric strings) compare numerically, date-like strings compare
 * by timestamp, everything else compares as a lowercased string. Empty,
 * null, undefined, NaN and unparseable date-like values normalize to `null`.
 */
const normalizeSortValue = (raw: unknown): NormalizedSortValue => {
  if (raw === null || raw === undefined) return null

  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? { kind: 'number', value: raw } : null
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (trimmed === '') return null

    if (DATE_LIKE.test(trimmed)) {
      const time = parseTimestamp(trimmed)
      return time === null ? null : { kind: 'date', value: time }
    }

    // Numeric strings (e.g. amounts serialized as strings) sort numerically.
    const asNumber = Number(trimmed)
    if (Number.isFinite(asNumber)) {
      return { kind: 'number', value: asNumber }
    }

    return { kind: 'string', value: trimmed.toLowerCase() }
  }

  return null
}

/**
 * #726 — Compare two normalized values. Missing values always sort last,
 * independent of direction. Mixed kinds fall back to a stable string compare.
 */
const compareNormalized = (
  a: NormalizedSortValue,
  b: NormalizedSortValue
): number => {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1

  if (a.kind === b.kind) {
    if (a.kind === 'string' && b.kind === 'string') {
      return a.value.localeCompare(b.value)
    }
    if (a.kind !== 'string' && b.kind !== 'string') {
      return a.value - b.value
    }
  }

  // Mixed kinds: deterministic string comparison of the raw normalized form.
  return String(a.value).localeCompare(String(b.value))
}

const VirtualizedTable = React.forwardRef<
  HTMLTableElement,
  React.ComponentProps<'table'>
>(({ style, ...props }, ref) => (
  <table
    {...props}
    ref={ref}
    className="transactions-table"
    style={{ ...style, borderCollapse: 'separate', borderSpacing: 0 }}
  />
))

VirtualizedTable.displayName = 'VirtualizedTable'

const virtuosoComponents = { Table: VirtualizedTable }

const previewForRow = (
  row: HTMLTableRowElement
): TransactionPreviewPosition => {
  const rect = row.getBoundingClientRect()
  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight
  const previewWidth = Math.min(310, Math.max(240, viewportWidth - 32))
  const left = Math.min(
    Math.max(8, rect.left),
    Math.max(8, viewportWidth - previewWidth - 8)
  )
  const estimatedHeight = 250
  const below = rect.bottom + 8
  const top =
    below + estimatedHeight > viewportHeight
      ? Math.max(8, rect.top - estimatedHeight - 8)
      : below

  return { top, left }
}

/** #722 — Match a transaction against the selected provider set. */
const matchesProviders = (
  tx: Transaction,
  providers: Provider[]
): boolean => {
  if (providers.length === 0) return true
  return providers.some((provider) => provider === tx.provider)
}

export const TransactionsTable: React.FC<{
  onRowClick: (tx: Transaction) => void
}> = ({ onRowClick }) => {
  const { transactions, loading, error, fetchTransactions } = useTransactionStore()
  // #723 — Server-reported total, distinct from the number of loaded rows.
  const serverTotal = useTransactionStore((state) => state.total)

  const [sort, setSort] = useState<SortState>({ column: (viewPrefs.sortColumn as keyof Transaction) || null, direction: viewPrefs.sortDirection })
  const [preview, setPreview] = useState<PreviewState | null>(null)
  /** #495 — Multi-select provider filter state (persisted in component state) */
  const [selectedProviders, setSelectedProviders] = useState<Provider[]>([])
  /** #725 — Tracks a retry triggered from the error state so we can show a
   *  distinct "retrying" indicator instead of the initial skeleton. */
  const [retrying, setRetrying] = useState(false)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)
  const virtuosoRef = useRef<TableVirtuosoHandle>(null)
  const pendingFocusIndex = useRef<number | null>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  // ── Filter state ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: 'all',
    startDate: '',
    endDate: '',
  })
  const [selectedStatuses, setSelectedStatuses] = useState<TransactionStatus[]>([])

  // ── Fetch on mount — pass empty filters so store defaults are preserved ─────
  useEffect(() => {
    if (transactions.length === 0) {
      fetchTransactions({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTransactions])

  // ── #725 — Retry the active filter request ─────────────────────────────────
  const handleRetry = useCallback(async () => {
    setRetrying(true)
    try {
      await fetchTransactions({
        search: searchQuery || undefined,
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        statuses: selectedStatuses.length ? selectedStatuses : undefined,
        providers: selectedProviders.length ? selectedProviders : undefined,
      })
    } finally {
      setRetrying(false)
    }
  }, [
    fetchTransactions,
    searchQuery,
    dateRange.startDate,
    dateRange.endDate,
    selectedStatuses,
    selectedProviders,
  ])

  // ── Sorting ─────────────────────────────────────────────────────────────────
  const handleSort = (column: keyof Transaction) => {
    setSort((prev) => {
      const newDir = prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
      setSortColumn(column)
      setSortDirection(newDir)
      return { column, direction: newDir }
    })
  }

  // ── Filter callbacks (stable references via useCallback) ────────────────────
  // #724 — Any meaningful filter change resets pagination to the first page so
  // the table never stays on an offset that no longer has results.
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleDateRange = useCallback((range: DateRange) => {
    setDateRange(range)
  }, [])

  const handleStatusChange = useCallback((statuses: TransactionStatus[]) => {
    setSelectedStatuses(statuses)
  }, [])

  // ── Provider selection — reset paging when the provider set changes ─────────
  const handleProviderChange = useCallback((providers: Provider[]) => {
    setSelectedProviders(providers)
    setActiveRowIndex(0)
    virtuosoRef.current?.scrollToIndex({ index: 0, align: 'start' })
  }, [])

  // ── Composed filtering + sorting (AND logic) ─────────────────────────────────
  const filteredAndSorted = useMemo(() => {
    const filtered = (transactions ?? []).filter(
      (tx) =>
        matchesSearch(tx, searchQuery) &&
        matchesDateRange(tx, dateRange) &&
        matchesStatus(tx, selectedStatuses) &&
        matchesProviders(tx, selectedProviders)
    )

    if (!sort.column) return filtered

    return [...filtered].sort((a, b) => {
      const col = sort.column as keyof Transaction
      const aVal = a[col]
      const bVal = b[col]
      if (aVal === bVal) return 0
      const result =
        typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal))
      return sort.direction === 'asc' ? result : -result
    })
  }, [transactions, searchQuery, dateRange, selectedStatuses, selectedProviders, sort])

  // #723 — Distinguish the server total from the number of loaded rows.
  // `serverTotal` reflects the full result set on the server; `loadedCount`
  // is only what the client currently holds. When filters are applied
  // remotely the server total already reflects them; when filters are applied
  // client-side (search/date/status/provider) the server total is the
  // unfiltered total and the filtered count is derived from loaded rows.
  const loadedCount = (transactions ?? []).length
  const visibleCount = filteredAndSorted.length
  const hasClientFilters =
    searchQuery.trim() !== '' ||
    dateRange.preset !== 'all' ||
    selectedStatuses.length > 0 ||
    selectedProviders.length > 0
  const unfilteredTotal = serverTotal ?? loadedCount
  const totalCount = hasClientFilters ? visibleCount : unfilteredTotal
  const totalLabel = hasClientFilters
    ? `Showing ${visibleCount} of ${loadedCount} loaded (filtered)`
    : `Total: ${unfilteredTotal}`

  // ── SortHeader sub-component ─────────────────────────────────────────────────
  const SortHeader: React.FC<{
    column: keyof Transaction
    label: string
  }> = ({ column, label }) => {
    const direction = sort.column === column
      ? sort.direction === 'asc' ? 'ascending' : 'descending'
      : 'none'

    return (
      <th scope="col" aria-sort={direction}>
        <button type="button" onClick={() => handleSort(column)} className="sortable-header">
          <span className="header-content">
            {label}
            {sort.column === column &&
              (sort.direction === 'asc' ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              ))}
          </span>
        </button>
      </th>
    )
  }

  const renderTableHeader = () => (
    <tr>
      <SortHeader column="reference" label="Reference" />
      <SortHeader column="amount" label="Amount" />
      <SortHeader column="status" label="Status" />
      <SortHeader column="provider" label="Provider" />
      <SortHeader column="timestamp" label="Date" />
      <th scope="col">Actions</th>
    </tr>
  )

  const handleDateRange = useCallback((range: DateRange) => {
    setDateRange((prev) => {
      if (
        prev.preset !== range.preset ||
        prev.startDate !== range.startDate ||
        prev.endDate !== range.endDate
      ) {
        resetPagination()
      }
    },
    onMouseEnter: (event: React.MouseEvent<HTMLTableCellElement>) => {
      const row = event.currentTarget.closest('tr')
      if (row) schedulePreview(tx, row)
    },
    onMouseLeave: (event: React.MouseEvent<HTMLTableCellElement>) => {
      const row = event.currentTarget.closest('tr')
      if (
        !row ||
        !(event.relatedTarget instanceof Node) ||
        !row.contains(event.relatedTarget)
      ) hidePreview()
    },
    onFocus: (event: React.FocusEvent<HTMLTableCellElement>) => {
      setActiveRowIndex(index)
      const row = event.currentTarget.closest('tr')
      if (row) schedulePreview(tx, row)
