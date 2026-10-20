import React from 'react';
import Layout from '@theme/Layout';
import { LiveFilterPreview } from '../components/LiveFilterPreview';
import type { FilterTransaction } from '../components/LiveFilterPreview';

const DEMO_TRANSACTIONS: FilterTransaction[] = [
  {
    id: 'TXN-2024-001',
    status: 'completed',
    type: 'send',
    amount: 250.0,
    currency: 'XLM',
    createdAt: '2024-01-01T10:00:00Z',
    sender: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZQ',
    recipient: 'GBHXGGEKJNVTAEZWKCA5VLDNRLN3RPRJMRZOX3',
  },
  {
    id: 'TXN-2024-002',
    status: 'pending',
    type: 'receive',
    amount: 100.0,
    currency: 'USDC',
    createdAt: '2024-01-02T14:22:00Z',
    sender: 'GBHXGGEKJNVTAEZWKCA5VLDNRLN3RPRJMRZOX3',
    recipient: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZQ',
  },
  {
    id: 'TXN-2024-003',
    status: 'failed',
    type: 'exchange',
    amount: 50.0,
    currency: 'XLM',
    createdAt: '2024-01-03T09:10:00Z',
    sender: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZQ',
    recipient: 'GBHXGGEKJNVTAEZWKCA5VLDNRLN3RPRJMRZOX3',
  },
  {
    id: 'TXN-2024-004',
    status: 'completed',
    type: 'send',
    amount: 1000.0,
    currency: 'USDC',
    createdAt: '2024-01-04T18:00:00Z',
    sender: 'GBHXGGEKJNVTAEZWKCA5VLDNRLN3RPRJMRZOX3',
    recipient: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZQ',
  },
  {
    id: 'TXN-2024-005',
    status: 'processing',
    type: 'send',
    amount: 75.5,
    currency: 'XLM',
    createdAt: '2024-01-05T08:30:00Z',
    sender: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZQ',
    recipient: 'GBHXGGEKJNVTAEZWKCA5VLDNRLN3RPRJMRZOX3',
  },
  {
    id: 'TXN-2024-006',
    status: 'completed',
    type: 'receive',
    amount: 340.0,
    currency: 'XLM',
    createdAt: '2024-01-06T12:15:00Z',
    sender: 'GBHXGGEKJNVTAEZWKCA5VLDNRLN3RPRJMRZOX3',
    recipient: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZQ',
  },
  {
    id: 'TXN-2024-007',
    status: 'completed',
    type: 'exchange',
    amount: 500.0,
    currency: 'USDC',
    createdAt: '2024-01-07T07:45:00Z',
    sender: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZQ',
    recipient: 'GBHXGGEKJNVTAEZWKCA5VLDNRLN3RPRJMRZOX3',
  },
  {
    id: 'TXN-2024-008',
    status: 'failed',
    type: 'send',
    amount: 20.0,
    currency: 'XLM',
    createdAt: '2024-01-08T22:00:00Z',
    sender: 'GBHXGGEKJNVTAEZWKCA5VLDNRLN3RPRJMRZOX3',
    recipient: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZQ',
  },
];

export default function LiveFilterPage(): React.JSX.Element {
  return (
    <Layout title="Live Filter Preview" description="Real-time transaction filter preview">
      <LiveFilterPreview transactions={DEMO_TRANSACTIONS} />
    </Layout>
  );
}
