import {
  DuplicateMatchReason,
  DuplicateTransactionGroup,
  Transaction,
} from './api'

export const DUPLICATE_TIME_WINDOW_MS = 10 * 60 * 1000

const normalized = (value: string | undefined): string =>
  (value || '').trim().toLowerCase()

const timestampValue = (transaction: Transaction): number => {
  const value = new Date(transaction.timestamp).getTime()
  return Number.isNaN(value) ? 0 : value
}

const pairReason = (
  first: Transaction,
  second: Transaction
): { reason: DuplicateMatchReason; confidence: number } | null => {
  if (
    normalized(first.stellarHash) &&
    normalized(first.stellarHash) === normalized(second.stellarHash)
  ) {
    return { reason: 'stellarHash', confidence: 1 }
  }

  if (
    normalized(first.mobileMoneyReference) &&
    normalized(first.mobileMoneyReference) ===
      normalized(second.mobileMoneyReference)
  ) {
    return { reason: 'mobileMoneyReference', confidence: 0.98 }
  }

  if (
    normalized(first.reference) &&
    normalized(first.reference) === normalized(second.reference) &&
    first.provider === second.provider &&
    Math.round(first.amount * 100) === Math.round(second.amount * 100)
  ) {
    return { reason: 'reference', confidence: 0.94 }
  }

  const sameAmount = Math.round(first.amount * 100) === Math.round(second.amount * 100)
  const sameProvider = first.provider === second.provider
  const closeInTime =
    Math.abs(timestampValue(first) - timestampValue(second)) <=
    DUPLICATE_TIME_WINDOW_MS

  if (sameAmount && sameProvider && closeInTime) {
    return { reason: 'transactionFingerprint', confidence: 0.75 }
  }

  return null
}

class UnionFind {
  private parent: number[]

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index)
  }

  find(index: number): number {
    if (this.parent[index] !== index) {
      this.parent[index] = this.find(this.parent[index])
    }
    return this.parent[index]
  }

  union(first: number, second: number): void {
    const firstRoot = this.find(first)
    const secondRoot = this.find(second)
    if (firstRoot !== secondRoot) this.parent[secondRoot] = firstRoot
  }
}

export const detectDuplicateTransactions = (
  transactions: Transaction[]
): DuplicateTransactionGroup[] => {
  const groups = new UnionFind(transactions.length)
  const reasons = new Map<number, { reason: DuplicateMatchReason; confidence: number }>()

  for (let firstIndex = 0; firstIndex < transactions.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < transactions.length;
      secondIndex += 1
    ) {
      const match = pairReason(transactions[firstIndex], transactions[secondIndex])
      if (!match) continue
      groups.union(firstIndex, secondIndex)
      const root = groups.find(firstIndex)
      const current = reasons.get(root)
      if (!current || match.confidence > current.confidence) {
        reasons.set(root, match)
      }
    }
  }

  const members = new Map<number, number[]>()
  transactions.forEach((_, index) => {
    const root = groups.find(index)
    const indexes = members.get(root) || []
    indexes.push(index)
    members.set(root, indexes)
  })

  return Array.from(members.values())
    .filter((indexes) => indexes.length > 1)
    .map((indexes) => {
      const groupedTransactions = indexes
        .map((index) => transactions[index])
        .sort((first, second) => timestampValue(first) - timestampValue(second))
      const root = groups.find(indexes[0])
      const match = reasons.get(root) || {
        reason: 'manual' as DuplicateMatchReason,
        confidence: 0.5,
      }
      const transactionIds = groupedTransactions.map((transaction) => transaction.id)
      const canonical = groupedTransactions.find((transaction) => !transaction.duplicateOf) || groupedTransactions[0]

      return {
        id: `duplicate-${[...transactionIds].sort().join('-')}`,
        transactionIds,
        canonicalId: canonical.id,
        transactions: groupedTransactions,
        reason: match.reason,
        confidence: match.confidence,
        markedAsDuplicate: groupedTransactions.some(
          (transaction) => transaction.isDuplicate || transaction.duplicateOf
        ),
      }
    })
    .sort((first, second) => second.confidence - first.confidence)
}

export const detectDuplicates = detectDuplicateTransactions
export const findDuplicateTransactions = detectDuplicateTransactions

export interface TransactionMergeResult {
  transaction: Transaction
  mergedIds: string[]
  auditEvent: Transaction['auditTrail'][number]
}

export const mergeTransactions = (
  canonical: Transaction,
  duplicates: Transaction[],
  actor = 'Current user',
  reason = 'Manually confirmed duplicate transactions'
): TransactionMergeResult => {
  const duplicateIds = duplicates.map((transaction) => transaction.id)
  const auditTrail = [
    ...canonical.auditTrail,
    ...duplicates.flatMap((transaction) => transaction.auditTrail || []),
  ]
    .sort(
      (first, second) =>
        new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime()
    )
  const statusHistory = [
    ...(canonical.statusHistory || []),
    ...duplicates.flatMap((transaction) =>
      transaction.statusHistory || transaction.statusChanges || []
    ),
  ]
    .filter(
      (transition, index, transitions) =>
        transitions.findIndex(
          (candidate) =>
            candidate.timestamp === transition.timestamp &&
            candidate.toStatus === transition.toStatus
        ) === index
    )
    .sort(
      (first, second) =>
        new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime()
    )
  const mergedAt = new Date().toISOString()
  const auditEvent: Transaction['auditTrail'][number] = {
    timestamp: mergedAt,
    event: 'Transactions merged',
    details: `${duplicateIds.length} duplicate transaction${duplicateIds.length === 1 ? '' : 's'} merged into ${canonical.id}`,
    actor,
    reason,
  }

  return {
    transaction: {
      ...canonical,
      statusHistory,
      statusChanges: undefined,
      duplicateOf: undefined,
      isDuplicate: false,
      mergedIntoId: undefined,
      auditTrail: [...auditTrail, auditEvent],
    },
    mergedIds: duplicateIds,
    auditEvent,
  }
}

export const mergeDuplicateTransactions = mergeTransactions
