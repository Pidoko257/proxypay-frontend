import {
  ExportSchedule,
  ExportFrequency,
  TransactionFilters,
} from './api'

export const DEFAULT_EXPORT_TIME = '09:00'
export const DEFAULT_EXPORT_TIMEZONE = 'UTC'
export const DEFAULT_DELIVERY_EMAIL = ''

const timeParts = (time: string): { hour: number; minute: number } => {
  const [hourText, minuteText] = time.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return { hour: 0, minute: 0 }
  }
  return { hour, minute }
}

const datePartsInTimezone = (
  date: Date,
  timezone: string
): { year: number; month: number; day: number; hour: number; minute: number } => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  )
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  }
}

const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate()

const addCalendarDays = (
  year: number,
  month: number,
  day: number,
  amount: number
): { year: number; month: number; day: number } => {
  const date = new Date(Date.UTC(year, month - 1, day + amount))
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

const addCalendarMonths = (
  year: number,
  month: number,
  day: number
): { year: number; month: number; day: number } => {
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return {
    year: nextYear,
    month: nextMonth,
    day: Math.min(day, daysInMonth(nextYear, nextMonth)),
  }
}

const localDateTimeToUtc = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date => {
  const target = Date.UTC(year, month - 1, day, hour, minute)
  const offsets = new Set<number>()

  for (let minutes = -48 * 60; minutes <= 48 * 60; minutes += 30) {
    const instant = target + minutes * 60 * 1000
    const parts = datePartsInTimezone(new Date(instant), timezone)
    const represented = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute
    )
    offsets.add(represented - instant)
  }

  const candidates = Array.from(offsets)
    .map((offset) => {
      const instant = target - offset
      const parts = datePartsInTimezone(new Date(instant), timezone)
      const represented = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute
      )
      return { instant, represented }
    })
    .sort((first, second) => first.instant - second.instant)
  const exact = candidates.find((candidate) => candidate.represented === target)
  if (exact) return new Date(exact.instant)

  const nextValid = candidates.find((candidate) => candidate.represented > target)
  return new Date((nextValid || candidates[candidates.length - 1]).instant)
}

const validTimezone = (timezone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
    return true
  } catch {
    return false
  }
}

export const calculateNextRun = (
  schedule: Pick<ExportSchedule, 'frequency' | 'time' | 'timezone' | 'dayOfWeek' | 'dayOfMonth'>,
  from: Date = new Date()
): Date | null => {
  const timezone = validTimezone(schedule.timezone) ? schedule.timezone : 'UTC'
  const current = datePartsInTimezone(from, timezone)
  const { hour, minute } = timeParts(schedule.time || DEFAULT_EXPORT_TIME)
  let year = current.year
  let month = current.month
  let day = current.day

  if (schedule.frequency === 'daily') {
    const today = localDateTimeToUtc(year, month, day, hour, minute, timezone)
    if (today.getTime() <= from.getTime()) {
      const next = addCalendarDays(year, month, day, 1)
      year = next.year
      month = next.month
      day = next.day
    }
  } else if (schedule.frequency === 'weekly') {
    const targetDay = schedule.dayOfWeek ?? 1
    const currentDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    let delta = (targetDay - currentDay + 7) % 7
    const candidate = localDateTimeToUtc(
      ...addCalendarObject(year, month, day + delta),
      hour,
      minute,
      timezone
    )
    if (candidate.getTime() <= from.getTime()) delta += 7
    const next = addCalendarDays(year, month, day, delta)
    year = next.year
    month = next.month
    day = next.day
  } else if (schedule.frequency === 'monthly') {
    const targetDay = Math.min(
      Math.max(1, schedule.dayOfMonth || 1),
      daysInMonth(year, month)
    )
    const thisMonth = localDateTimeToUtc(year, month, targetDay, hour, minute, timezone)
    if (thisMonth.getTime() <= from.getTime()) {
      const nextMonth = addCalendarMonths(year, month, targetDay)
      year = nextMonth.year
      month = nextMonth.month
      day = nextMonth.day
    } else {
      day = targetDay
    }
  } else {
    return null
  }

  return localDateTimeToUtc(year, month, day, hour, minute, timezone)
}

const addCalendarObject = (
  year: number,
  month: number,
  day: number
): [number, number, number] => {
  const result = addCalendarDays(year, month, day, 0)
  return [result.year, result.month, result.day]
}

export const getNextRunDate = calculateNextRun

export const formatNextRun = (
  schedule: Pick<ExportSchedule, 'nextRunAt' | 'frequency' | 'time' | 'timezone' | 'dayOfWeek' | 'dayOfMonth'>,
  locale?: string
): string => {
  const nextRun =
    schedule.nextRunAt && !Number.isNaN(new Date(schedule.nextRunAt).getTime())
      ? new Date(schedule.nextRunAt)
      : calculateNextRun(schedule)
  if (!nextRun) return 'Not scheduled'
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: schedule.timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(nextRun)
  } catch {
    return nextRun.toLocaleString()
  }
}

export const getDefaultTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_EXPORT_TIMEZONE
  } catch {
    return DEFAULT_EXPORT_TIMEZONE
  }
}

export const getAvailableTimezones = (): string[] => {
  const supportedValuesOf = (
    Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf
  const supported =
    typeof supportedValuesOf === 'function' ? supportedValuesOf('timeZone') : []
  return Array.from(
    new Set([
      'UTC',
      getDefaultTimezone(),
      ...supported,
      ...(supported.length === 0
        ? [
            'Africa/Lagos',
            'Africa/Nairobi',
            'Europe/London',
            'America/New_York',
            'America/Los_Angeles',
            'Asia/Dubai',
          ]
        : []),
    ])
  )
}

export const createDefaultSchedule = (
  filters?: TransactionFilters
): Omit<ExportSchedule, 'id'> => ({
  name: 'Transaction export',
  frequency: 'daily',
  time: DEFAULT_EXPORT_TIME,
  timezone: getDefaultTimezone(),
  format: 'csv',
  includeAuditTrail: true,
  filters,
  delivery: { type: 'email', email: '' },
  notifyOnCompletion: true,
  active: true,
})

export const frequencyLabel = (frequency: ExportFrequency): string => {
  const labels: Record<ExportFrequency, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
  }
  return labels[frequency]
}
