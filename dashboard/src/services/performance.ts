export interface PerformanceMetric {
  name: string
  value: number
  recordedAt: string
  tags?: Record<string, string>
}

const STORAGE_KEY = 'proxypay.performance.metrics'
const METRIC_EVENT = 'proxypay:performance-metric'
const MAX_METRICS = 1000

const persistMetrics = (metrics: PerformanceMetric[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics))
  } catch {
    return
  }
}

declare global {
  interface Window {
    DD_RUM?: {
      addAction?: (name: string, context?: Record<string, unknown>) => void
    }
  }
}

export const readPerformanceMetrics = (): PerformanceMetric[] => {
  if (typeof localStorage === 'undefined') return []
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(saved) ? (saved as PerformanceMetric[]) : []
  } catch {
    return []
  }
}

export const recordPerformanceMetric = (
  name: string,
  value: number,
  tags?: Record<string, string>
) => {
  if (!Number.isFinite(value) || value < 0) return
  const metric: PerformanceMetric = { name, value, recordedAt: new Date().toISOString(), tags }
  const next = [...readPerformanceMetrics(), metric].slice(-MAX_METRICS)
  persistMetrics(next)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(METRIC_EVENT, { detail: metric }))
    window.DD_RUM?.addAction?.('proxypay.performance.metric', metric)
  }
}

export const startPerformanceMonitoring = () => {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return () => undefined
  }

  const observers: PerformanceObserver[] = []
  const observe = (
    type: string,
    onEntries: (entries: PerformanceEntry[]) => void
  ) => {
    try {
      const observer = new PerformanceObserver((list) => onEntries(list.getEntries()))
      observer.observe({ type, buffered: true } as PerformanceObserverInit)
      observers.push(observer)
    } catch {
      return
    }
  }

  observe('navigation', (entries) => {
    const navigation = entries[entries.length - 1] as PerformanceNavigationTiming | undefined
    if (!navigation) return
    recordPerformanceMetric('page-load', navigation.loadEventEnd - navigation.startTime)
    recordPerformanceMetric('ttfb', navigation.responseStart - navigation.requestStart)
  })
  observe('largest-contentful-paint', (entries) => {
    const entry = entries[entries.length - 1]
    if (entry) recordPerformanceMetric('lcp', entry.startTime)
  })

  let cumulativeLayoutShift = 0
  observe('layout-shift', (entries) => {
    for (const entry of entries) {
      const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean }
      if (!shift.hadRecentInput) cumulativeLayoutShift += shift.value || 0
    }
    recordPerformanceMetric('cls', cumulativeLayoutShift)
  })

  let highestInteractionDuration = 0
  observe('event', (entries) => {
    for (const entry of entries) {
      const duration = (entry as PerformanceEntry & { duration?: number }).duration || 0
      highestInteractionDuration = Math.max(highestInteractionDuration, duration)
    }
    if (highestInteractionDuration) recordPerformanceMetric('inp', highestInteractionDuration)
  })

  return () => observers.forEach((observer) => observer.disconnect())
}

export const performanceMetricEvent = METRIC_EVENT