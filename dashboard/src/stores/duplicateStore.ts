import { create } from 'zustand'
import {
  DuplicateTransactionGroup,
  Transaction,
  TransactionFilters,
  proxyPayAPI,
} from '../services/api'
import {
  detectDuplicateTransactions,
  mergeTransactions as mergeTransactionData,
  TransactionMergeResult,
} from '../services/duplicateDetection'

interface DuplicateStore {
  groups: DuplicateTransactionGroup[]
  serverGroups: DuplicateTransactionGroup[]
  loading: boolean
  error: string | null
  markedTransactionIds: string[]
  mergedTransaction: Transaction | null
  fetchGroups: (filters?: TransactionFilters) => Promise<void>
  setLocalTransactions: (transactions: Transaction[]) => void
  markGroup: (
    group: DuplicateTransactionGroup,
    canonicalId?: string
  ) => Promise<void>
  mergeGroup: (group: DuplicateTransactionGroup, actor?: string) => Promise<TransactionMergeResult>
  clearError: () => void
}

const responseGroups = (
  response: DuplicateTransactionGroup | DuplicateTransactionGroup[]
): DuplicateTransactionGroup[] => (Array.isArray(response) ? response : [response])

const groupKey = (group: DuplicateTransactionGroup): string =>
  Array.from(new Set(group.transactionIds)).sort().join('|')

const combineGroups = (
  first: DuplicateTransactionGroup[],
  second: DuplicateTransactionGroup[]
): DuplicateTransactionGroup[] => {
  const combined = new Map<string, DuplicateTransactionGroup>()
  for (const group of [...second, ...first]) {
    const key = groupKey(group)
    const existing = combined.get(key)
    if (!existing) {
      combined.set(key, {
        ...group,
        transactionIds: Array.from(new Set(group.transactionIds)),
        transactions: group.transactions || [],
      })
      continue
    }
    const transactionsById = new Map(
      [...existing.transactions, ...(group.transactions || [])].map(
        (transaction) => [transaction.id, transaction]
      )
    )
    combined.set(key, {
      ...existing,
      id: existing.id || group.id,
      canonicalId: existing.canonicalId || group.canonicalId,
      transactionIds: Array.from(
        new Set([...existing.transactionIds, ...group.transactionIds])
      ),
      transactions: Array.from(transactionsById.values()),
      reason: existing.confidence >= group.confidence ? existing.reason : group.reason,
      confidence: Math.max(existing.confidence, group.confidence),
      markedAsDuplicate:
        existing.markedAsDuplicate || group.markedAsDuplicate || undefined,
    })
  }
  return Array.from(combined.values())
}

let latestGroupsRequest = 0

export const useDuplicateStore = create<DuplicateStore>((set, get) => ({
  groups: [],
  serverGroups: [],
  loading: false,
  error: null,
  markedTransactionIds: [],
  mergedTransaction: null,

  fetchGroups: async (filters) => {
    const requestId = ++latestGroupsRequest
    set({ loading: true, error: null })
    try {
      const groups = await proxyPayAPI.getDuplicateTransactions(filters)
      if (requestId !== latestGroupsRequest) return
      set((state) => ({
        groups: combineGroups(state.serverGroups, groups),
        serverGroups: groups,
        loading: false,
      }))
    } catch (error) {
      if (requestId !== latestGroupsRequest) return
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch duplicate transactions',
        loading: false,
      })
    }
  },

  setLocalTransactions: (transactions) => {
    set((state) => ({
      groups: combineGroups(
        state.serverGroups,
        detectDuplicateTransactions(transactions)
      ),
    }))
  },

  markGroup: async (group, canonicalId = group.canonicalId) => {
    const duplicateIds = group.transactionIds.filter((id) => id !== canonicalId)
    const previousMarkedIds = get().markedTransactionIds
    set((state) => ({
      markedTransactionIds: Array.from(
        new Set([...state.markedTransactionIds, ...duplicateIds, canonicalId])
      ),
      error: null,
    }))

    try {
      const response = await proxyPayAPI.markTransactionsAsDuplicates({
        transactionIds: duplicateIds,
        duplicateOfId: canonicalId,
        reason: `Manually marked from duplicate group ${group.id}`,
      })
      const groups = responseGroups(response)
      set((state) => {
        const markedGroups = state.groups.map((existing) =>
          existing.id === group.id
            ? { ...existing, markedAsDuplicate: true }
            : existing
        )
        const markedServerGroups = state.serverGroups.map((existing) =>
          existing.id === group.id
            ? { ...existing, markedAsDuplicate: true }
            : existing
        )
        return {
          groups: combineGroups(markedGroups, groups),
          serverGroups: combineGroups(markedServerGroups, groups),
        }
      })
    } catch (error) {
      set({
        markedTransactionIds: previousMarkedIds,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to mark duplicate transactions',
      })
    }
  },

  mergeGroup: async (group, actor = 'Current user') => {
    set({ error: null })
    const canonical = group.transactions.find(
      (transaction) => transaction.id === group.canonicalId
    )
    const duplicates = group.transactions.filter(
      (transaction) => transaction.id !== group.canonicalId
    )
    if (!canonical || duplicates.length === 0) {
      const error = new Error('A duplicate group must contain a canonical transaction')
      set({ error: error.message })
      throw error
    }

    const reason = 'Manually confirmed duplicate transactions'
    const localResult = mergeTransactionData(canonical, duplicates, actor, reason)
    try {
      const merged = await proxyPayAPI.mergeTransactions(
        canonical.id,
        duplicates.map((transaction) => transaction.id),
        { actor, reason }
      )
      const serverAuditTrail = merged.auditTrail || []
      const hasMergeEvent = serverAuditTrail.some(
        (event) =>
          event.event === localResult.auditEvent.event &&
          event.timestamp === localResult.auditEvent.timestamp
      )
      const mergedTransaction = {
        ...merged,
        statusHistory:
          merged.statusHistory && merged.statusHistory.length > 0
            ? merged.statusHistory
            : localResult.transaction.statusHistory,
        auditTrail: hasMergeEvent
          ? serverAuditTrail
          : [...serverAuditTrail, localResult.auditEvent],
      }
      const result: TransactionMergeResult = {
        transaction: mergedTransaction,
        mergedIds: duplicates.map((transaction) => transaction.id),
        auditEvent: localResult.auditEvent,
      }
      set((state) => ({
        groups: state.groups.filter((existing) => existing.id !== group.id),
        serverGroups: state.serverGroups.filter(
          (existing) => existing.id !== group.id
        ),
        mergedTransaction: result.transaction,
        error: null,
      }))
      return result
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to merge duplicate transactions',
      })
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))

export const useDuplicatesStore = useDuplicateStore
