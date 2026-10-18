/**
 * ProviderFilter — Issue #495
 *
 * Multi-select provider filter dropdown for the Transactions Table.
 *
 * Features:
 * - Checkbox multi-select (vodafone / mtn / airtel)
 * - Transaction count per provider
 * - Active filter indicator badges
 * - Accessible keyboard navigation
 */

import React, { useRef, useState, useEffect } from 'react'
import { Transaction } from '../services/api'
import '../styles/ProviderFilter.css'

export type Provider = 'vodafone' | 'mtn' | 'airtel'

export const ALL_PROVIDERS: Provider[] = ['vodafone', 'mtn', 'airtel']

const PROVIDER_LABELS: Record<Provider, string> = {
  vodafone: '📱 Vodafone',
  mtn: '🟡 MTN',
  airtel: '🔴 Airtel',
}

export interface ProviderFilterProps {
  /** Currently selected providers (empty = all) */
  selectedProviders: Provider[]
  /** All transactions — used to compute per-provider counts */
  transactions: Transaction[]
  /** Called whenever the selection changes */
  onChange: (providers: Provider[]) => void
}

export const ProviderFilter: React.FC<ProviderFilterProps> = ({
  selectedProviders,
  transactions,
  onChange,
}) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Count transactions per provider
  const counts = ALL_PROVIDERS.reduce<Record<Provider, number>>(
    (acc, p) => {
      acc[p] = transactions.filter((t) => t.provider === p).length
      return acc
    },
    { vodafone: 0, mtn: 0, airtel: 0 }
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const toggle = (provider: Provider) => {
    if (selectedProviders.includes(provider)) {
      onChange(selectedProviders.filter((p) => p !== provider))
    } else {
      onChange([...selectedProviders, provider])
    }
  }

  const clearAll = () => onChange([])
  const selectAll = () => onChange([...ALL_PROVIDERS])

  const hasActiveFilters = selectedProviders.length > 0

  return (
    <div className="provider-filter" ref={containerRef} data-testid="provider-filter">
      {/* Trigger button */}
      <button
        type="button"
        className={`provider-filter__trigger${hasActiveFilters ? ' provider-filter__trigger--active' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid="provider-filter-trigger"
      >
        <span className="provider-filter__label">
          {hasActiveFilters
            ? `Provider: ${selectedProviders.length === 1 ? PROVIDER_LABELS[selectedProviders[0]].split(' ')[1] : `${selectedProviders.length} selected`}`
            : 'All Providers'}
        </span>
        <span className="provider-filter__arrow" aria-hidden="true">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="provider-filter__badges" data-testid="provider-filter-badges">
          {selectedProviders.map((p) => (
            <span key={p} className={`provider-filter__badge provider-filter__badge--${p}`}>
              {PROVIDER_LABELS[p]}
              <button
                type="button"
                className="provider-filter__badge-remove"
                onClick={() => toggle(p)}
                aria-label={`Remove ${p} filter`}
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            className="provider-filter__clear"
            onClick={clearAll}
            data-testid="provider-filter-clear"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Dropdown panel */}
      {open && (
        <div
          className="provider-filter__dropdown"
          role="listbox"
          aria-multiselectable="true"
          aria-label="Filter by provider"
          data-testid="provider-filter-dropdown"
        >
          <div className="provider-filter__actions">
            <button type="button" className="provider-filter__select-all" onClick={selectAll}>
              Select all
            </button>
            <button type="button" className="provider-filter__clear-all" onClick={clearAll}>
              Clear
            </button>
          </div>

          {ALL_PROVIDERS.map((provider) => {
            const checked = selectedProviders.includes(provider)
            return (
              <label
                key={provider}
                className={`provider-filter__option${checked ? ' provider-filter__option--checked' : ''}`}
                role="option"
                aria-selected={checked}
                data-testid={`provider-option-${provider}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(provider)}
                  aria-label={`${PROVIDER_LABELS[provider]} (${counts[provider]} transactions)`}
                />
                <span className="provider-filter__option-label">{PROVIDER_LABELS[provider]}</span>
                <span
                  className="provider-filter__count"
                  data-testid={`provider-count-${provider}`}
                >
                  {counts[provider]}
                </span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProviderFilter
