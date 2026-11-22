import React from 'react';
import Layout from '@theme/Layout';
import { TransactionComparison } from '../components/TransactionComparison';
import type { ComparisonTransaction } from '../components/TransactionComparison';

const DEMO_TRANSACTIONS: ComparisonTransaction[] = [
  {
    id: 'TXN-2024-001',
    status: 'completed',
    type: 'send',
    amount: 250.0,
    fee: 0.005,
    currency: 'XLM',
    network: 'Stellar',
    sender: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZQ',
    recipient: 'GBHXGGEKJNVTAEZWKCA5VLDNRLN3RPRJMRZOX3',
    stellarTxHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    mobilemoneyRef: 'MM-20240101-00001',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:01:30Z',
    completedAt: '2024-01-01T10:01:30Z',
  },
  {
    id: 'TXN-2024-002',
    status: 'pending',
    type: 'receive',
    amount: 100.0,
    fee: 0.003,
    currency: 'USDC',
    network: 'Stellar',
    sender: 'GBHXGGEKJNVTAEZWKCA5VLDNRLN3RPRJMRZOX3',
    recipient: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZQ',
    stellarTxHash: 'f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5',
    mobilemoneyRef: 'MM-20240102-00042',
    createdAt: '2024-01-02T14:22:00Z',
    updatedAt: '2024-01-02T14:22:00Z',
    completedAt: null,
  },
  {
    id: 'TXN-2024-003',
    status: 'failed',
    type: 'exchange',
    amount: 50.0,
    fee: 0.001,
    currency: 'XLM',
    network: 'Stellar',
    sender: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZQ',
    recipient: 'GBHXGGEKJNVTAEZWKCA5VLDNRLN3RPRJMRZOX3',
    stellarTxHash: '0000000000000000000000000000000000000000000000000000000000000000',
    mobilemoneyRef: '',
    createdAt: '2024-01-03T09:10:00Z',
    updatedAt: '2024-01-03T09:10:45Z',
    completedAt: null,
  },
  {
    id: 'TXN-2024-004',
    status: 'completed',
    type: 'send',
    amount: 1000.0,
    fee: 0.012,
    currency: 'USDC',
    network: 'Stellar',
    sender: 'GBHXGGEKJNVTAEZWKCA5VLDNRLN3RPRJMRZOX3',
    recipient: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZQ',
    stellarTxHash: 'c9d8e7f6a5b4c9d8e7f6a5b4c9d8e7f6a5b4c9d8e7f6a5b4c9d8e7f6a5b4c9d8',
    mobilemoneyRef: 'MM-20240104-00099',
    createdAt: '2024-01-04T18:00:00Z',
    updatedAt: '2024-01-04T18:00:55Z',
    completedAt: '2024-01-04T18:00:55Z',
  },
  {
    id: 'TXN-2024-005',
    status: 'processing',
    type: 'send',
    amount: 75.5,
    fee: 0.002,
    currency: 'XLM',
    network: 'Stellar',
    sender: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZQ',
    recipient: 'GBHXGGEKJNVTAEZWKCA5VLDNRLN3RPRJMRZOX3',
    stellarTxHash: '1111111111111111111111111111111111111111111111111111111111111111',
    mobilemoneyRef: 'MM-20240105-00007',
    createdAt: '2024-01-05T08:30:00Z',
    updatedAt: '2024-01-05T08:30:00Z',
    completedAt: null,
  },
];

export default function TransactionComparisonPage(): React.JSX.Element {
  return (
    <Layout title="Transaction Comparison" description="Compare two transactions side-by-side">
      <TransactionComparison transactions={DEMO_TRANSACTIONS} />
    </Layout>
  );
}
