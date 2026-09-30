import { describe, expect, it } from 'vitest'
import { calculateNextRun } from '../exportSchedule'

describe('export schedule calculations', () => {
  const from = new Date('2026-01-05T08:00:00.000Z')

  it('calculates the next daily run in the selected timezone', () => {
    const next = calculateNextRun(
      { frequency: 'daily', time: '09:00', timezone: 'UTC' },
      from
    )

    expect(next?.toISOString()).toBe('2026-01-05T09:00:00.000Z')
  })

  it('moves a passed daily time to the next calendar day', () => {
    const next = calculateNextRun(
      { frequency: 'daily', time: '07:00', timezone: 'UTC' },
      from
    )

    expect(next?.toISOString()).toBe('2026-01-06T07:00:00.000Z')
  })

  it('calculates weekly and monthly schedules', () => {
    const weekly = calculateNextRun(
      { frequency: 'weekly', time: '09:00', timezone: 'UTC', dayOfWeek: 1 },
      from
    )
    const monthly = calculateNextRun(
      { frequency: 'monthly', time: '09:00', timezone: 'UTC', dayOfMonth: 15 },
      from
    )

    expect(weekly?.toISOString()).toBe('2026-01-05T09:00:00.000Z')
    expect(monthly?.toISOString()).toBe('2026-01-15T09:00:00.000Z')
  })

  it('clamps month-end schedules to the last day of shorter months', () => {
    const next = calculateNextRun(
      { frequency: 'monthly', time: '09:00', timezone: 'UTC', dayOfMonth: 31 },
      new Date('2026-01-31T10:00:00.000Z')
    )

    expect(next?.toISOString()).toBe('2026-02-28T09:00:00.000Z')
  })

  it('handles leap-day month-end schedules', () => {
    const next = calculateNextRun(
      { frequency: 'monthly', time: '09:00', timezone: 'UTC', dayOfMonth: 31 },
      new Date('2028-01-31T10:00:00.000Z')
    )

    expect(next?.toISOString()).toBe('2028-02-29T09:00:00.000Z')
  })

  it('moves a nonexistent daylight-saving time to the next valid time', () => {
    const next = calculateNextRun(
      { frequency: 'daily', time: '02:30', timezone: 'America/New_York' },
      new Date('2026-03-07T12:00:00.000Z')
    )

    expect(next?.toISOString()).toBe('2026-03-08T07:30:00.000Z')
  })

  it('rolls monthly schedules into the next year', () => {
    const next = calculateNextRun(
      { frequency: 'monthly', time: '09:00', timezone: 'UTC', dayOfMonth: 15 },
      new Date('2026-12-31T10:00:00.000Z')
    )

    expect(next?.toISOString()).toBe('2027-01-15T09:00:00.000Z')
  })
})
