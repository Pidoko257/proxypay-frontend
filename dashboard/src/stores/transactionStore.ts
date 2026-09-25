import { create } from 'zustand'
import { Transaction, TransactionFilters, proxyPayAPI } from '../services/api'

interface TransactionStore {
  transactions: Transaction[]
  selectedTransaction: Transaction | null
  loading: boolean
  error: string | null
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

export const useTransactionStore = create<TransactionStore>((set) => ({
  transactions: [],
  selectedTransaction: null,
  loading: false,
  error: null,
  total: 0,
  filters: defaultFilters,

  fetchTransactions: async (filters: TransactionFilters) => {
    set({ loading: true, error: null })
    try {
      const result = await proxyPayAPI.getTransactions(filters)
      set({
        transactions: result.data,
        total: result.total,
        filters,
        loading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch transactions',
        loading: false,
      })
    }
  },

  fetchTransactionDetail: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const transaction = await proxyPayAPI.getTransactionDetail(id)
      set({ selectedTransaction: transaction, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch transaction details',
        loading: false,
      })
    }
  },

  setSelectedTransaction: (tx: Transaction | null) => {
    set({ selectedTransaction: tx })
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
