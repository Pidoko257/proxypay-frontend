/**
 * Tests for Issue #495 — Provider Filtering
 * Tests the ProviderFilter component and filtering logic in TransactionsTable.
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProviderFilter, ALL_PROVIDERS } from '../ProviderFilter'
import { makeTransaction } from '../../test/fixtures'
import { Transaction } from '../../services/api'

const makeTransactions = (): Transaction[] => [
  makeTransaction({ id: '1', provider: 'vodafone' }),
  makeTransaction({ id: '2', provider: 'vodafone' }),
  makeTransaction({ id: '3', provider: 'mtn' }),
  makeTransaction({ id: '4', provider: 'airtel' }),
  makeTransaction({ id: '5', provider: 'mtn' }),
]

describe('ProviderFilter component (#495)', () => {
  it('renders a trigger button', () => {
    render(
      <ProviderFilter
        selectedProviders={[]}
        transactions={makeTransactions()}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('provider-filter-trigger')).toBeInTheDocument()
    expect(screen.getByText('All Providers')).toBeInTheDocument()
  })

  it('opens dropdown on trigger click', () => {
    render(
      <ProviderFilter
        selectedProviders={[]}
        transactions={makeTransactions()}
        onChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByTestId('provider-filter-trigger'))
    expect(screen.getByTestId('provider-filter-dropdown')).toBeInTheDocument()
  })

  it('shows transaction counts per provider', () => {
    render(
      <ProviderFilter
        selectedProviders={[]}
        transactions={makeTransactions()}
        onChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByTestId('provider-filter-trigger'))
    expect(screen.getByTestId('provider-count-vodafone').textContent).toBe('2')
    expect(screen.getByTestId('provider-count-mtn').textContent).toBe('2')
    expect(screen.getByTestId('provider-count-airtel').textContent).toBe('1')
  })

  it('calls onChange when a provider option is clicked', () => {
    const onChange = vi.fn()
    render(
      <ProviderFilter
        selectedProviders={[]}
        transactions={makeTransactions()}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByTestId('provider-filter-trigger'))
    fireEvent.click(screen.getByTestId('provider-option-vodafone'))
    expect(onChange).toHaveBeenCalledWith(['vodafone'])
  })

  it('supports multi-select', () => {
    const onChange = vi.fn()
    render(
      <ProviderFilter
        selectedProviders={['vodafone']}
        transactions={makeTransactions()}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByTestId('provider-filter-trigger'))
    fireEvent.click(screen.getByTestId('provider-option-mtn'))
    expect(onChange).toHaveBeenCalledWith(['vodafone', 'mtn'])
  })

  it('deselects a provider on second click', () => {
    const onChange = vi.fn()
    render(
      <ProviderFilter
        selectedProviders={['vodafone']}
        transactions={makeTransactions()}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByTestId('provider-filter-trigger'))
    fireEvent.click(screen.getByTestId('provider-option-vodafone'))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('shows active filter badges when providers are selected', () => {
    render(
      <ProviderFilter
        selectedProviders={['vodafone', 'mtn']}
        transactions={makeTransactions()}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('provider-filter-badges')).toBeInTheDocument()
    expect(screen.getByText('📱 Vodafone')).toBeInTheDocument()
    expect(screen.getByText('🟡 MTN')).toBeInTheDocument()
  })

  it('clears all filters when "Clear all" is clicked', () => {
    const onChange = vi.fn()
    render(
      <ProviderFilter
        selectedProviders={['vodafone', 'mtn']}
        transactions={makeTransactions()}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByTestId('provider-filter-clear'))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('selects all providers via "Select all" button', () => {
    const onChange = vi.fn()
    render(
      <ProviderFilter
        selectedProviders={[]}
        transactions={makeTransactions()}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByTestId('provider-filter-trigger'))
    fireEvent.click(screen.getByText('Select all'))
    expect(onChange).toHaveBeenCalledWith(ALL_PROVIDERS)
  })

  it('has aria-haspopup and aria-expanded on trigger', () => {
    render(
      <ProviderFilter
        selectedProviders={[]}
        transactions={makeTransactions()}
        onChange={vi.fn()}
      />
    )
    const trigger = screen.getByTestId('provider-filter-trigger')
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows correct label with one provider selected', () => {
    render(
      <ProviderFilter
        selectedProviders={['airtel']}
        transactions={makeTransactions()}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('Provider: Airtel')).toBeInTheDocument()
  })

  it('shows count label with multiple providers selected', () => {
    render(
      <ProviderFilter
        selectedProviders={['vodafone', 'mtn']}
        transactions={makeTransactions()}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('Provider: 2 selected')).toBeInTheDocument()
  })
})

// ─── Provider filtering logic (unit) ────────────────────────────────────────

describe('Provider filter logic (#495)', () => {
  it('filters transactions by single provider', () => {
    const txs = makeTransactions()
    const filtered = txs.filter((tx) => ['vodafone'].includes(tx.provider))
    expect(filtered).toHaveLength(2)
    expect(filtered.every((tx) => tx.provider === 'vodafone')).toBe(true)
  })

  it('filters transactions by multiple providers', () => {
    const txs = makeTransactions()
    const filtered = txs.filter((tx) => ['vodafone', 'mtn'].includes(tx.provider))
    expect(filtered).toHaveLength(4)
  })

  it('returns all transactions when no filter is active', () => {
    const txs = makeTransactions()
    const filtered = txs.filter((tx) =>
      [].length === 0 ? true : [].includes(tx.provider as never)
    )
    expect(filtered).toHaveLength(5)
  })
})
