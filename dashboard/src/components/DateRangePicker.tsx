import React, { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { Transaction } from '../services/api'
import '../styles/DateRangePicker.css'

export type PresetRange = 'today' | 'last7' | 'last30' | 'custom' | 'all'

export interface DateRange {
  preset: PresetRange
  startDate: string // ISO date string YYYY-MM-DD or ''
  endDate: string   // ISO date string YYYY-MM-DD or ''
}

// ── Utility helpers ───────────────────────────────────────────────────────────

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getPresetRange(preset: PresetRange): { startDate: string; endDate: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toISODate(today)

  switch (preset) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr }
    case 'last7': {
      const d = new Date(today)
      d.setDate(d.getDate() - 6)
      return { startDate: toISODate(d), endDate: todayStr }
    }
    case 'last30': {
      const d = new Date(today)
      d.setDate(d.getDate() - 29)
      return { startDate: toISODate(d), endDate: todayStr }
    }
    default:
      return { startDate: '', endDate: '' }
  }
}

/**
 * Returns true if the transaction falls within the given date range (inclusive).
 */
export function matchesDateRange(tx: Transaction, range: DateRange): boolean {
  if (range.preset === 'all' || (!range.startDate && !range.endDate)) return true

  const txDate = toISODate(new Date(tx.timestamp))

  if (range.startDate && txDate < range.startDate) return false
  if (range.endDate && txDate > range.endDate) return false
  return true
}

// ── URL param persistence helpers ─────────────────────────────────────────────

function readRangeFromURL(): DateRange | null {
  const params = new URLSearchParams(window.location.search)
  const preset = params.get('datePreset') as PresetRange | null
  if (!preset) return null

  return {
    preset,
    startDate: params.get('dateFrom') ?? '',
    endDate: params.get('dateTo') ?? '',
  }
}

function writeRangeToURL(range: DateRange): void {
  const params = new URLSearchParams(window.location.search)
  if (range.preset === 'all') {
    params.delete('datePreset')
    params.delete('dateFrom')
    params.delete('dateTo')
  } else {
    params.set('datePreset', range.preset)
    if (range.startDate) params.set('dateFrom', range.startDate)
    else params.delete('dateFrom')
    if (range.endDate) params.set('dateTo', range.endDate)
    else params.delete('dateTo')
  }
  const newUrl = `${window.location.pathname}${params.size > 0 ? '?' + params.toString() : ''}`
  window.history.replaceState(null, '', newUrl)
}

function buildInitialRange(): DateRange {
  const fromURL = readRangeFromURL()
  if (fromURL) return fromURL
  return { preset: 'all', startDate: '', endDate: '' }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DateRangePickerProps {
  transactions: Transaction[]
  onRangeChange: (range: DateRange) => void
  filteredCount: number
}

const PRESETS: { value: PresetRange; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom' },
]

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  transactions,
  onRangeChange,
  filteredCount,
}) => {
  const [range, setRange] = useState<DateRange>(buildInitialRange)
  const [customStart, setCustomStart] = useState(range.preset === 'custom' ? range.startDate : '')
  const [customEnd, setCustomEnd] = useState(range.preset === 'custom' ? range.endDate : '')
  const [validationError, setValidationError] = useState<string | null>(null)

  // Notify parent of initial range on mount
  useEffect(() => {
    onRangeChange(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyRange = (newRange: DateRange) => {
    setRange(newRange)
    writeRangeToURL(newRange)
    onRangeChange(newRange)
  }

  const handlePresetClick = (preset: PresetRange) => {
    setValidationError(null)
    if (preset === 'custom') {
      const newRange: DateRange = { preset: 'custom', startDate: customStart, endDate: customEnd }
      applyRange(newRange)
    } else {
      const dates = getPresetRange(preset)
      applyRange({ preset, ...dates })
    }
  }

  const handleCustomApply = () => {
    if (customStart && customEnd && customStart > customEnd) {
      setValidationError('Start date must be on or before end date.')
      return
    }
    setValidationError(null)
    applyRange({ preset: 'custom', startDate: customStart, endDate: customEnd })
  }

  const handleCustomStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomStart(e.target.value)
    setValidationError(null)
  }

  const handleCustomEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomEnd(e.target.value)
    setValidationError(null)
  }

  const isActive = range.preset !== 'all'
  const totalCount = transactions.length

  return (
    <div className={`date-range-picker${isActive ? ' date-range-picker--active' : ''}`}>
      <div className="drp-label">
        <Calendar size={15} aria-hidden="true" />
        <span>Date</span>
        {isActive && (
          <span className="drp-count-badge" aria-label={`${filteredCount} transactions in range`}>
            {filteredCount}
          </span>
        )}
      </div>

      <div className="drp-presets" role="group" aria-label="Date range presets">
        {PRESETS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`drp-preset-btn${range.preset === value ? ' drp-preset-btn--active' : ''}`}
            onClick={() => handlePresetClick(value)}
            aria-pressed={range.preset === value}
          >
            {label}
          </button>
        ))}
      </div>

      {range.preset === 'custom' && (
        <div className="drp-custom">
          <div className="drp-custom-inputs">
            <label className="drp-date-label">
              <span>From</span>
              <input
                type="date"
                className="drp-date-input"
                value={customStart}
                onChange={handleCustomStartChange}
                aria-label="Start date"
              />
            </label>
            <span className="drp-custom-sep" aria-hidden="true">—</span>
            <label className="drp-date-label">
              <span>To</span>
              <input
                type="date"
                className="drp-date-input"
                value={customEnd}
                min={customStart || undefined}
                onChange={handleCustomEndChange}
                aria-label="End date"
              />
            </label>
            <button
              type="button"
              className="drp-apply-btn"
              onClick={handleCustomApply}
            >
              Apply
            </button>
          </div>
          {validationError && (
            <p className="drp-validation-error" role="alert">
              {validationError}
            </p>
          )}
        </div>
      )}

      {isActive && (
        <span className="drp-summary">
          Showing {filteredCount} of {totalCount} transaction{totalCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}
