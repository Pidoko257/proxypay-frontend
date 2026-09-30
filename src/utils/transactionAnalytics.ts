import type { Transaction } from '../data/transactions';

export function getTransactionAnalytics(items: Transaction[]) {
  const total = items.length;
  const failed = items.filter((transaction) => transaction.status === 'Failed').length;
  const averageProcessingTime = total === 0
    ? 0
    : Math.round(items.reduce((sum, transaction) => sum + transaction.processingTimeMs, 0) / total);
  const volumeByDay = items.reduce<Record<string, number>>((volume, transaction) => {
    volume[transaction.createdAt] = (volume[transaction.createdAt] ?? 0) + 1;
    return volume;
  }, {});

  return {
    averageProcessingTime,
    failureRate: total === 0 ? 0 : Math.round((failed / total) * 100),
    totalVolume: items.reduce((sum, transaction) => sum + transaction.amount, 0),
    volumeByDay: Object.entries(volumeByDay).sort(([left], [right]) => left.localeCompare(right)),
  };
}
