import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/api', () => ({
  proxyPayAPI: {
    getTransactions: vi.fn(),
    getTransactionDetail: vi.fn(),
    getStatusHistory: vi.fn(),
  },
}))

import { proxyPayAPI } from '../../services/api'
import { useTransactionStore } from '../transactionStore'

describe('transactionStore pagination', () => {
  beforeEach(() => {
    useTransactionStore.setState({ filters: { limit: 2, offset: 0 } })
  })

  it('preserves an explicit offset when changing pages', () => {
    useTransactionStore.getState().setFilters({ offset: 2 })

    expect(useTransactionStore.getState().filters.offset).toBe(2)
  })

  it('resets the offset when changing a filter', () => {
    useTransactionStore.getState().setFilters({ status: 'settled' })

    expect(useTransactionStore.getState().filters).toEqual({ limit: 2, offset: 0, status: 'settled' })
  })
})

describe('transactionStore stale response handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTransactionStore.setState({ filters: { limit: 2, offset: 0 }, transactions: [], loading: false, error: null })
  })

  it('ignores a stale response that resolves after a newer request', async () => {
    let resolveFirst: (value: unknown) => void = () => {}
    let resolveSecond: (value: unknown) => void = () => {}

    const first = new Promise((resolve) => {
      resolveFirst = resolve
    })
    const second = new Promise((resolve) => {
      resolveSecond = resolve
    })

    vi.mocked(proxyPayAPI.getTransactions)
      .mockReturnValueOnce(first as never)
      .mockReturnValueOnce(second as never)

    const firstFetch = useTransactionStore.getState().fetchTransactions()
    const secondFetch = useTransactionStore.getState().fetchTransactions()

    // Newer request resolves first, then the older (stale) one resolves late.
    resolveSecond({ transactions: [{ id: 'newer' }], total: 1 })
    await secondFetch

    resolveFirst({ transactions: [{ id: 'older' }], total: 1 })
    await firstFetch

    expect(useTransactionStore.getState().transactions).toEqual([{ id: 'newer' }])
  })

  it('applies the latest response when requests resolve in order', async () => {
    vi.mocked(proxyPayAPI.getTransactions)
      .mockResolvedValueOnce({ transactions: [{ id: 'first' }], total: 1 } as never)
      .mockResolvedValueOnce({ transactions: [{ id: 'second' }], total: 1 } as never)

    await useTransactionStore.getState().fetchTransactions()
    await useTransactionStore.getState().fetchTransactions()

    expect(useTransactionStore.getState().transactions).toEqual([{ id: 'second' }])
  })
})

describe('transactionStore server totals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTransactionStore.setState({
      filters: { limit: 2, offset: 0 },
      transactions: [],
      total: 0,
      loading: false,
      error: null,
    })
  })

  it('stores the server total rather than the loaded row count', async () => {
    vi.mocked(proxyPayAPI.getTransactions).mockResolvedValueOnce({
      transactions: [{ id: 'a' }, { id: 'b' }],
      total: 137,
    } as never)

    await useTransactionStore.getState().fetchTransactions()

    const state = useTransactionStore.getState()
    expect(state.transactions).toHaveLength(2)
    expect(state.total).toBe(137)
  })

  it('keeps the server total when filters are applied remotely', async () => {
    vi.mocked(proxyPayAPI.getTransactions).mockResolvedValueOnce({
      transactions: [{ id: 'a' }],
      total: 42,
    } as never)

    useTransactionStore.getState().setFilters({ status: 'settled' })
    await useTransactionStore.getState().fetchTransactions()

    const state = useTransactionStore.getState()
    expect(state.filters.status).toBe('settled')
    expect(state.transactions).toHaveLength(1)
    // The server total reflects the filtered result set, not the loaded rows.
    expect(state.total).toBe(42)
  })

  it('does not overwrite the server total with the loaded row count', async () => {
    vi.mocked(proxyPayAPI.getTransactions).mockResolvedValueOnce({
      transactions: [{ id: 'a' }, { id: 'b' }],
      total: 500,
    } as never)

    await useTransactionStore.getState().fetchTransactions()

    expect(useTransactionStore.getState().total).not.toBe(
      useTransactionStore.getState().transactions.length,
    )
  })
})
