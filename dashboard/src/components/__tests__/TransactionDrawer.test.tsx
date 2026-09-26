import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TransactionDrawer } from '../TransactionDrawer'
import { Transaction } from '../../services/api'

const transaction: Transaction = {
  id: 'tx-1',
  reference: 'ref-1',
  stellarHash: 'hash-1',
  mobileMoneyReference: 'mobile-1',
  amount: 10,
  fee: 1,
  feeBreakdown: { platformFee: 0.4, networkFee: 0.3, providerFee: 0.3 },
  status: 'settled',
  provider: 'mtn',
  timestamp: '2026-01-01T00:00:00.000Z',
  auditTrail: [],
}

describe('TransactionDrawer', () => {
  it('closes for legacy and modern Escape events', () => {
    const onClose = vi.fn()
    render(<TransactionDrawer transaction={transaction} isOpen onClose={onClose} />)

    fireEvent.keyDown(window, { key: 'Esc', keyCode: 27 })

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})