import { create } from 'zustand'
import { Transaction, TransactionFilters, proxyPayAPI } from '../services/api'

interface TransactionStore {
  transactions: Transaction[]
  selectedTransaction: Transaction | null
  loading: boolean
  detailLoading: boolean
  error: string | null
  detailError: string | null
  total: number
  filters: TransactionFilters
  
  // Actions
  fetchTransactions: (filters: TransactionFilters) => Promise<void>
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

let latestDetailRequest = 0
let latestListRequest = 0

export const useTransactionStore = create<TransactionStore>((set) => ({
  transactions: [],
  selectedTransaction: null,
  loading: false,
  detailLoading: false,
  error: null,
  detailError: null,
  total: 0,
  filters: defaultFilters,

  fetchTransactions: async (filters: TransactionFilters) => {
    const requestId = ++latestListRequest
    set({ loading: true, error: null })
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
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch transactions',
        loading: false,
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
      set({
        detailError:
          error instanceof Error ? error.message : 'Failed to fetch transaction details',
        detailLoading: false,
      })
    }
  },

  setSelectedTransaction: (tx: Transaction | null) => {
    latestDetailRequest += 1
    set({ selectedTransaction: tx, detailError: null })
  },

  setFilters: (newFilters: Partial<TransactionFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters, offset: 0 }, // Reset to first page
    }))
  },

  resetFilters: () => {
    set({ filters: defaultFilters })
  },

  clearError: () => {
    set({ error: null })
  },
}))
