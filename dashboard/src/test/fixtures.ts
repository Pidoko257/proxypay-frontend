import { Transaction } from '../services/api'

export const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1',
  reference: 'REF-1',
  stellarHash: 'hash-1',
  mobileMoneyReference: 'mm-1',
  amount: 25,
  fee: 1,
  feeBreakdown: { platformFee: 0.5, networkFee: 0.3, providerFee: 0.2 },
  status: 'pending',
  provider: 'mtn',
  timestamp: '2026-01-01T10:00:00.000Z',
  auditTrail: [],
  ...overrides,
})
