export type TransactionStatus = 'Completed' | 'Failed' | 'Processing';

export type Transaction = {
  id: string;
  customer: string;
  amount: number;
  status: TransactionStatus;
  processingTimeMs: number;
  createdAt: string;
};

const DAY_MS = 86_400_000;

const daysAgo = (days: number): string => new Date(Date.now() - days * DAY_MS).toISOString();

export const transactions: Transaction[] = [
  { id: 'TX-1048', customer: 'Amina Yusuf', amount: 240, status: 'Completed', processingTimeMs: 820, createdAt: daysAgo(1) },
  { id: 'TX-1047', customer: 'David Okafor', amount: 89.5, status: 'Failed', processingTimeMs: 1_840, createdAt: daysAgo(1) },
  { id: 'TX-1046', customer: 'Maya Chen', amount: 1_250, status: 'Completed', processingTimeMs: 640, createdAt: daysAgo(2) },
  { id: 'TX-1045', customer: 'Luis Garcia', amount: 410, status: 'Processing', processingTimeMs: 1_120, createdAt: daysAgo(2) },
  { id: 'TX-1044', customer: 'Nia Williams', amount: 75, status: 'Completed', processingTimeMs: 910, createdAt: daysAgo(3) },
  { id: 'TX-1043', customer: 'Omar Hassan', amount: 630, status: 'Failed', processingTimeMs: 2_210, createdAt: daysAgo(3) },
];