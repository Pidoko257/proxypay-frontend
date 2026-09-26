import { useEffect, useState } from 'react'
import { trackFeatureFlagEvaluation, useFeatureFlagStore } from '../stores/featureFlagStore'
import {
  PerformanceMetric,
  performanceMetricEvent,
  readPerformanceMetrics,
} from '../services/performance'
import '../styles/PerformanceDashboard.css'

const metricNames = [
  { key: 'lcp', label: 'Largest Contentful Paint', unit: 'ms', threshold: 2500 },
  { key: 'cls', label: 'Cumulative Layout Shift', unit: '', threshold: 0.1 },
  { key: 'inp', label: 'Interaction to Next Paint', unit: 'ms', threshold: 200 },
  { key: 'page-load', label: 'Page load', unit: 'ms', threshold: 3000 },
  { key: 'ttfb', label: 'Time to first byte', unit: 'ms', threshold: 800 },
  { key: 'api-response', label: 'API response time', unit: 'ms', threshold: 1000 },
  { key: 'component-render', label: 'Dashboard render', unit: 'ms', threshold: 50 },
]

const displayValue = (value: number, unit: string) =>
  `${value.toFixed(unit ? 0 : 3)}${unit ? ` ${unit}` : ''}`

export const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>(readPerformanceMetrics)
  const alertsEnabled = useFeatureFlagStore((state) => state.isEnabled('performance-alerts'))

  useEffect(() => {
    trackFeatureFlagEvaluation('performance-alerts')
    const update = () => setMetrics(readPerformanceMetrics())
    window.addEventListener(performanceMetricEvent, update)
    return () => window.removeEventListener(performanceMetricEvent, update)
  }, [alertsEnabled])

  const latestByName = new Map<string, PerformanceMetric>()
  for (const metric of metrics) latestByName.set(metric.name, metric)

  const recentMetrics = metrics.filter((metric) =>
    Date.now() - new Date(metric.recordedAt).getTime() <= 7 * 24 * 60 * 60 * 1000
  )
  const dailyAverages = new Map<string, number[]>()
  for (const metric of recentMetrics.filter((item) => item.name === 'api-response' || item.name === 'page-load')) {
    const day = metric.recordedAt.slice(0, 10)
    const values = dailyAverages.get(day) || []
    values.push(metric.value)
    dailyAverages.set(day, values)
  }
  const trend = [...dailyAverages.entries()].sort(([left], [right]) => left.localeCompare(right))
  const maxAverage = Math.max(1, ...trend.map(([, values]) => values.reduce((sum, value) => sum + value, 0) / values.length))
  const hasDatadog = typeof window !== 'undefined' && Boolean(window.DD_RUM?.addAction)

  return (
    <section className="performance-page" aria-labelledby="performance-title">
      <header className="performance-header">
        <div>
          <h1 id="performance-title">Performance Monitoring</h1>
          <p>Browser metrics and instrumented dashboard operations.</p>
        </div>
        <span className={`monitoring-connection ${hasDatadog ? 'connected' : ''}`}>
          {hasDatadog ? 'Datadog RUM connected' : 'Local monitoring'}
        </span>
      </header>

      <div className="performance-metrics" aria-label="Latest performance metrics">
        {metricNames.map((definition) => {
          const metric = latestByName.get(definition.key)
          const degraded = Boolean(metric && metric.value > definition.threshold)
          return (
            <article className={`performance-metric ${degraded && alertsEnabled ? 'degraded' : ''}`} key={definition.key}>
              <span>{definition.label}</span>
              <strong>{metric ? displayValue(metric.value, definition.unit) : 'Waiting for data'}</strong>
              {degraded && alertsEnabled && <small role="status">Above target</small>}
            </article>
          )
        })}
      </div>

      <section className="performance-trend" aria-labelledby="performance-trend-title">
        <div className="trend-heading">
          <h2 id="performance-trend-title">Seven-day response trend</h2>
          <span>{trend.length ? `${recentMetrics.length} measurements` : 'No history yet'}</span>
        </div>
        {trend.length ? (
          <ol>
            {trend.map(([day, values]) => {
              const average = values.reduce((sum, value) => sum + value, 0) / values.length
              return (
                <li key={day}>
                  <time dateTime={day}>{day}</time>
                  <span className="trend-bar-track"><span style={{ width: `${Math.max(3, average / maxAverage * 100)}%` }} /></span>
                  <strong>{Math.round(average)} ms</strong>
                </li>
              )
            })}
          </ol>
        ) : <p>Measurements will appear as dashboard operations run.</p>}
      </section>
    </section>
  )
}