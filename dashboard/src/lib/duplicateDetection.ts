import type { Transaction } from '../types/transaction';

export interface DuplicateGroup {
  key: string;
  transactions: Transaction[];
  reason: string;
}

/**
 * Build a stable key for a transaction so we can group likely duplicates.
 */
export function duplicateKey(tx: Transaction): string {
  const amount = Math.abs(tx.amount).toFixed(2);
  const date = (tx.date || '').slice(0, 10);
  const merchant = (tx.merchant || tx.description || '').trim().toLowerCase();
  return `${amount}|${date}|${merchant}`;
}

/**
 * Group transactions that look like duplicates of one another.
 */
export function findDuplicateGroups(transactions: Transaction[]): DuplicateGroup[] {
  const buckets = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    const key = duplicateKey(tx);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(tx);
    } else {
      buckets.set(key, [tx]);
    }
  }

  const groups: DuplicateGroup[] = [];
  for (const [key, txs] of buckets) {
    if (txs.length > 1) {
      groups.push({
        key,
        transactions: txs,
        reason: 'Same amount, date, and merchant',
      });
    }
  }

  return groups;
}

/**
 * Merge a set of duplicate transactions into a single canonical transaction.
 *
 * The canonical transaction is the first entry in the list. Its combined
 * status history is derived from every transaction in the group so that
 * downstream consumers (e.g. StatusTimeline) still have history to render.
 */
export function mergeTransactions(transactions: Transaction[]): Transaction {
  if (transactions.length === 0) {
    throw new Error('mergeTransactions requires at least one transaction');
  }

  const [canonical, ...rest] = transactions;

  const statusHistory = transactions.flatMap((tx) => tx.statusHistory ?? []);

  return {
    ...canonical,
    statusHistory,
    statusChanges: undefined,
    mergedFrom: rest.map((tx) => tx.id),
  };
}
