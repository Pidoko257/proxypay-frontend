export interface PerformanceMetric {
  name: string
  value: number
  recordedAt: string
  tags?: Record<string, string>
}

export interface ComponentRenderSummary {
  component: string
  renderCount: number
  rendersPerMinute: number
  averageDuration: number
  maxDuration: number
  latestDuration: number
  slow: boolean
  excessive: boolean
  recommendations: string[]
}

const STORAGE_KEY = 'proxypay.performance.metrics'
const METRIC_EVENT = 'proxypay:performance-metric'
const MAX_METRICS = 1000
const SLOW_RENDER_THRESHOLD_MS = 16.7
const EXCESSIVE_RENDER_THRESHOLD = 10
const RECENT_RENDER_WINDOW_MS = 60_000
let metricCache: PerformanceMetric[] | undefined
let componentMetricFlushTimer: ReturnType<typeof setTimeout> | undefined

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
  if (metricCache) return [...metricCache]
  if (typeof localStorage === 'undefined') {
    metricCache = []
    return []
  }
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    metricCache = Array.isArray(saved) ? (saved as PerformanceMetric[]) : []
  } catch {
    metricCache = []
  }
  return [...metricCache]
}

const appendMetric = (metric: PerformanceMetric, persistImmediately: boolean, reportToDatadog: boolean) => {
  metricCache = [...readPerformanceMetrics(), metric].slice(-MAX_METRICS)
  if (persistImmediately) {
    persistMetrics(metricCache)
  } else if (typeof window !== 'undefined') {
    if (componentMetricFlushTimer) window.clearTimeout(componentMetricFlushTimer)
    componentMetricFlushTimer = window.setTimeout(() => {
      componentMetricFlushTimer = undefined
      persistMetrics(metricCache || [])
    }, 1000)
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(METRIC_EVENT, { detail: metric }))
    if (reportToDatadog) window.DD_RUM?.addAction?.('proxypay.performance.metric', metric)
  }
}

export const recordPerformanceMetric = (
  name: string,
  value: number,
  tags?: Record<string, string>
) => {
  if (!Number.isFinite(value) || value < 0) return
  appendMetric({ name, value, recordedAt: new Date().toISOString(), tags }, true, true)
}

export const recordComponentRender = (
  component: string,
  actualDuration: number,
  baseDuration: number,
  phase: string
) => {
  if (!component.trim() || !Number.isFinite(actualDuration) || actualDuration < 0 ||
    !Number.isFinite(baseDuration) || baseDuration < 0) return

  appendMetric({
    name: 'component-render',
    value: actualDuration,
    recordedAt: new Date().toISOString(),
    tags: { component, baseDuration: baseDuration.toFixed(2), phase },
  }, false, false)
  if (import.meta.env.DEV) {
    console.debug(`[render-profile] ${component}: ${actualDuration.toFixed(2)}ms (${phase})`)
  }
}

export const clearComponentRenderMetrics = () => {
  metricCache = readPerformanceMetrics().filter((metric) => metric.name !== 'component-render')
  if (componentMetricFlushTimer && typeof window !== 'undefined') {
    window.clearTimeout(componentMetricFlushTimer)
    componentMetricFlushTimer = undefined
  }
  persistMetrics(metricCache)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(METRIC_EVENT))
  }
}

export const summarizeComponentRenders = (
  metrics: PerformanceMetric[],
  now = Date.now()
): ComponentRenderSummary[] => {
  const components = new Map<string, PerformanceMetric[]>()
  for (const metric of metrics) {
    const component = metric.name === 'component-render' ? metric.tags?.component : undefined
    if (!component) continue
    const records = components.get(component) || []
    records.push(metric)
    components.set(component, records)
  }

  return [...components.entries()]
    .map(([component, records]) => {
      const durations = records.map((record) => record.value)
      const averageDuration = durations.reduce((total, duration) => total + duration, 0) / durations.length
      const recentRenders = records.filter((record) => {
        const recordedAt = Date.parse(record.recordedAt)
        return Number.isFinite(recordedAt) && now - recordedAt >= 0 && now - recordedAt < RECENT_RENDER_WINDOW_MS
      }).length
      const slow = averageDuration >= SLOW_RENDER_THRESHOLD_MS
      const excessive = recentRenders >= EXCESSIVE_RENDER_THRESHOLD
      const recommendations: string[] = []

      if (slow) {
        recommendations.push('Average render time exceeds 16.7ms; split expensive work or memoize stable calculations.')
      }
      if (excessive) {
        recommendations.push('Rendered 10 or more times in the last minute; check parent updates and unstable props.')
      }
      if (!recommendations.length) recommendations.push('Render timing and update frequency are within current targets.')

      const latest = records.reduce((current, record) =>
        Date.parse(record.recordedAt) >= Date.parse(current.recordedAt) ? record : current
      )

      return {
        component,
        renderCount: records.length,
        rendersPerMinute: recentRenders,
        averageDuration,
        maxDuration: Math.max(...durations),
        latestDuration: latest.value,
        slow,
        excessive,
        recommendations,
      }
    })
    .sort((left, right) => right.averageDuration - left.averageDuration || right.rendersPerMinute - left.rendersPerMinute)
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