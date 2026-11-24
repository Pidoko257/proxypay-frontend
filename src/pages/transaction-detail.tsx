import React, { useState } from 'react';
import Layout from '@theme/Layout';
import { TransactionDetail } from '../components/TransactionDetail';
import type { Transaction } from '../components/TransactionDetail';

const DEMO_TRANSACTIONS: Transaction[] = [
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
    metadata: {
      corridor: 'KE→GH',
      provider: 'M-Pesa',
      'original-currency': 'KES',
      'exchange-rate': '0.0027',
    },
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
    metadata: {
      corridor: 'NG→KE',
      provider: 'Airtel Money',
    },
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
    metadata: { reason: 'insufficient_funds' },
  },
];

export default function TransactionDetailPage(): React.JSX.Element {
  const [selected, setSelected] = useState<string>(DEMO_TRANSACTIONS[0].id);
  const transaction = DEMO_TRANSACTIONS.find((t) => t.id === selected) ?? DEMO_TRANSACTIONS[0];

  return (
    <Layout title="Transaction Detail" description="Collapsible transaction detail sections">
      <div style={{ padding: '1.5rem 1.5rem 0' }}>
        <label style={{ fontWeight: 600 }}>
          Select demo transaction:{' '}
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          >
            {DEMO_TRANSACTIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} — {t.status}
              </option>
            ))}
          </select>
        </label>
      </div>
      <TransactionDetail transaction={transaction} />
    </Layout>
  );
}
