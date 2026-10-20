import { create } from 'zustand'
import { Transaction, TransactionFilters, proxyPayAPI } from '../services/api'
import { showRetryToast } from '../components/RetryToast'

interface TransactionStore {
  transactions: Transaction[]
  selectedTransaction: Transaction | null
  loading: boolean
  retrying: boolean
  detailLoading: boolean
  error: string | null
  detailError: string | null
  total: number
  filters: TransactionFilters
  
  // Actions
  fetchTransactions: (filters: TransactionFilters) => Promise<void>
  retryTransactions: () => Promise<void>
  fetchTransactionDetail: (id: string) => Promise<void>
  setSelectedTransaction: (tx: Transaction | null) => void
  setFilters: (filters: Partial<TransactionFilters>) => void
  resetFilters: () => void
  clearError: () => void
}

const defaultFilters: TransactionFilters = {
  limit: 50,
  offset: 0,
}

// Filter keys that, when changed, invalidate the current pagination offset.
const paginationResetKeys: (keyof TransactionFilters)[] = [
  'search',
  'status',
  'startDate',
  'endDate',
  'provider',
]

let latestDetailRequest = 0
let latestListRequest = 0

/**
 * Filters that are applied server-side. When any of these are set, the
 * server `total` reflects the filtered result set, not the unfiltered
 * dataset. Client-side counts (e.g. `transactions.length`) only ever
 * reflect the rows currently loaded in the client.
 */
const REMOTE_FILTER_KEYS: (keyof TransactionFilters)[] = [
  'status',
  'provider',
  'currency',
  'startDate',
  'endDate',
  'search',
]

export const hasRemoteFilters = (filters: TransactionFilters): boolean =>
  REMOTE_FILTER_KEYS.some((key) => {
    const value = filters[key]
    return value !== undefined && value !== null && value !== ''
  })

export const useTransactionStore = create<TransactionStore>((set) => ({
  transactions: [],
  selectedTransaction: null,
  loading: false,
  retrying: false,
  detailLoading: false,
  error: null,
  detailError: null,
  total: 0,
  filters: defaultFilters,

  fetchTransactions: async (filters: TransactionFilters) => {
    const requestId = ++latestListRequest
    set({ loading: true, retrying: false, error: null })
    try {
      const result = await proxyPayAPI.getTransactions(filters)
      if (requestId !== latestListRequest) return
      set({
        transactions: result.data,
        total: result.total,
        filters,
        loading: false,
      })
    } catch (error) {
      if (requestId !== latestListRequest) return
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch transactions'
      set({ error: errorMessage, loading: false })

      // Issue #600 — show error toast with retry button
      showRetryToast({
        message: 'Failed to load transactions.',
        label: 'GET /transactions',
        onRetry: () => proxyPayAPI.getTransactions(filters),
        onSuccess: (result) => {
          set({
            transactions: result.data,
            total: result.total,
            filters,
            loading: false,
            error: null,
          })
        },
      })
    }
  },

  retryTransactions: async () => {
    const { filters, transactions } = get()
    const requestId = ++latestListRequest
    // Distinguish retry loading from the initial skeleton: keep existing rows
    // visible and only flag `retrying` when there is data already on screen.
    set({ retrying: transactions.length > 0, loading: transactions.length === 0, error: null })
    try {
      const result = await proxyPayAPI.getTransactions(filters)
      if (requestId !== latestListRequest) return
      set({
        transactions: result.data,
        // `total` is the server-reported count for the current filter set.
        // It is NOT the number of rows loaded in the client.
        total: result.total,
        filters,
        loading: false,
        retrying: false,
      })
    } catch (error) {
      if (requestId !== latestListRequest) return
      // Preserve existing rows when a retry fails and rows are already present.
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch transactions',
        loading: false,
        retrying: false,
      })
    }
  },

  fetchTransactionDetail: async (id: string) => {
    const requestId = ++latestDetailRequest
    set({ detailLoading: true, detailError: null })
    try {
      const transaction = await proxyPayAPI.getTransactionDetail(id)
      let statusHistory = transaction.statusHistory || []
      if (statusHistory.length === 0) {
        try {
          statusHistory = await proxyPayAPI.getStatusHistory(id)
        } catch {
          statusHistory = transaction.statusHistory || []
        }
      }
      if (requestId !== latestDetailRequest) return
      set({
        selectedTransaction: { ...transaction, statusHistory },
        detailLoading: false,
      })
    } catch (error) {
      if (requestId !== latestDetailRequest) return
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch transaction details'
      set({ detailError: errorMessage, detailLoading: false })

      // Issue #600 — retry button for detail fetch failures
      showRetryToast({
        message: 'Failed to load transaction details.',
        label: `GET /transactions/${id}`,
        onRetry: () => proxyPayAPI.getTransactionDetail(id),
        onSuccess: (transaction) => {
          set({ selectedTransaction: transaction, detailLoading: false, detailError: null })
        },
      })
    }
  },

  setSelectedTransaction: (tx: Transaction | null) => {
    latestDetailRequest += 1
    set({ selectedTransaction: tx, detailError: null })
  },

  setFilters: (newFilters: Partial<TransactionFilters>) => {
    set((state) => {
      const filterChanged = paginationResetKeys.some(
        (key) => key in newFilters && newFilters[key] !== state.filters[key]
      )

      // Reset to the first page when a meaningful filter changes, unless the
      // caller explicitly provides an offset (e.g. pagination navigation).
      const offset =
        newFilters.offset ?? (filterChanged ? 0 : state.filters.offset)

      return {
        filters: { ...state.filters, ...newFilters, offset },
      }
    })
  },

  resetFilters: () => {
    set({ filters: defaultFilters })
  },

  clearError: () => {
    set({ error: null })
  },
}))
