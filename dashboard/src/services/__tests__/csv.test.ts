import { describe, expect, it } from 'vitest'
import { CSVExporter } from '../csv'
import type { Transaction } from '../api'

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1',
  reference: 'REF-1',
  stellarHash: 'HASH-1',
  mobileMoneyReference: 'MOMO-1',
  amount: -25,
  fee: 0,
  feeBreakdown: { platformFee: 0, networkFee: 0, providerFee: 0 },
  status: 'settled',
  provider: 'mtn',
  timestamp: '2026-01-01T00:00:00.000Z',
  auditTrail: [],
  ...overrides,
})

describe('CSVExporter', () => {
  it.each(['=', '+', '-', '@', '\t='])('neutralizes text starting with %s', (prefix) => {
    const reference = `${prefix}SUM(1,2)`
    const tx = transaction({ reference })
    const csv = CSVExporter.generateCSV([tx])

    expect(csv).toContain(`"'${reference}"`)
    expect(tx.reference).toBe(reference)
    expect(csv).toContain(',-25,')
  })

  it('quotes commas, doubles quotes, and preserves embedded newlines', () => {
    const tx = transaction({ reference: 'memo, "quoted"\nsecond line' })
    const csv = CSVExporter.generateCSV([tx])

    expect(csv).toContain('"memo, ""quoted""\nsecond line"')
    expect(tx.reference).toBe('memo, "quoted"\nsecond line')
  })
})