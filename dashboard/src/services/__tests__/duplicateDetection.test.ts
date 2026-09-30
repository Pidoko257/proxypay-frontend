import { describe, expect, it } from 'vitest'
import { makeTransaction } from '../../test/fixtures'
import {
  detectDuplicateTransactions,
  mergeTransactions,
} from '../duplicateDetection'

describe('duplicate transaction detection', () => {
  it('groups transactions with the same Stellar hash', () => {
    const groups = detectDuplicateTransactions([
      makeTransaction({ id: 'a', stellarHash: 'same-hash', mobileMoneyReference: 'mm-a', reference: 'REF-A' }),
      makeTransaction({ id: 'b', stellarHash: 'same-hash', mobileMoneyReference: 'mm-b', reference: 'REF-B' }),
      makeTransaction({ id: 'c', stellarHash: 'other-hash', mobileMoneyReference: 'mm-c', reference: 'REF-C', amount: 200, timestamp: '2026-01-02T10:00:00Z' }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].transactionIds).toEqual(['a', 'b'])
    expect(groups[0].reason).toBe('stellarHash')
  })

  it('does not classify matching amounts alone as duplicates', () => {
    const groups = detectDuplicateTransactions([
      makeTransaction({ id: 'a', amount: 100, reference: 'REF-A', stellarHash: 'hash-a', mobileMoneyReference: 'mm-a', timestamp: '2026-01-01T10:00:00Z' }),
      makeTransaction({ id: 'b', amount: 100, reference: 'REF-B', stellarHash: 'hash-b', mobileMoneyReference: 'mm-b', timestamp: '2026-02-01T10:00:00Z' }),
    ])

    expect(groups).toHaveLength(0)
  })

  it('uses a conservative fingerprint for nearby provider and amount matches', () => {
    const groups = detectDuplicateTransactions([
      makeTransaction({ id: 'a', amount: 100, reference: 'REF-A', stellarHash: 'hash-a', mobileMoneyReference: 'mm-a', timestamp: '2026-01-01T10:00:00Z' }),
      makeTransaction({ id: 'b', amount: 100, reference: 'REF-B', stellarHash: 'hash-b', mobileMoneyReference: 'mm-b', timestamp: '2026-01-01T10:05:00Z' }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].reason).toBe('transactionFingerprint')
  })

  it('merges audit trails and records the merge event', () => {
    const canonical = makeTransaction({
      id: 'canonical',
      auditTrail: [
        {
          timestamp: '2026-01-01T10:00:00Z',
          event: 'Created',
          details: 'Created',
          actor: 'system',
        },
      ],
    })
    const duplicate = makeTransaction({
      id: 'duplicate',
      auditTrail: [
        {
          timestamp: '2026-01-01T10:01:00Z',
          event: 'Created',
          details: 'Created',
          actor: 'system',
        },
      ],
    })

    const result = mergeTransactions(canonical, [duplicate], 'reviewer', 'Confirmed match')

    expect(result.mergedIds).toEqual(['duplicate'])
    expect(result.transaction.auditTrail).toHaveLength(3)
    expect(result.auditEvent.event).toBe('Transactions merged')
    expect(result.auditEvent.actor).toBe('reviewer')
    expect(result.auditEvent.reason).toBe('Confirmed match')
  })
})
