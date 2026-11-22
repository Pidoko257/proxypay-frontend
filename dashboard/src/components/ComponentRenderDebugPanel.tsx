import { useEffect, useMemo, useState } from 'react'
import {
  clearComponentRenderMetrics,
  performanceMetricEvent,
  readPerformanceMetrics,
  summarizeComponentRenders,
} from '../services/performance'
import '../styles/ComponentRenderDebugPanel.css'

export const ComponentRenderDebugPanel = () => {
  const [open, setOpen] = useState(false)
  const [metrics, setMetrics] = useState(readPerformanceMetrics)
  const components = useMemo(() => summarizeComponentRenders(metrics), [metrics])

  useEffect(() => {
    const update = () => setMetrics(readPerformanceMetrics())
    window.addEventListener(performanceMetricEvent, update)
    return () => window.removeEventListener(performanceMetricEvent, update)
  }, [])

  useEffect(() => {
    if (!open) return
    const interval = window.setInterval(() => setMetrics(readPerformanceMetrics()), 10_000)
    return () => window.clearInterval(interval)
  }, [open])

  return (
    <>
      <button
        className="render-debug-trigger"
        type="button"
        aria-label="Toggle component render profiler"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        ⚡
      </button>
      {open && (
        <section className="render-debug-panel" role="dialog" aria-label="Component render profiler">
          <header className="render-debug-header">
            <div>
              <strong>Component renders</strong>
              <span>{components.length} profiled components</span>
            </div>
            <div className="render-debug-actions">
              <button type="button" onClick={() => clearComponentRenderMetrics()}>Clear</button>
              <button type="button" aria-label="Close component render profiler" onClick={() => setOpen(false)}>×</button>
            </div>
          </header>
          <div className="render-debug-body">
            {components.length === 0 ? (
              <p className="render-debug-empty">Waiting for profiled components to render.</p>
            ) : (
              <ol>
                {components.map((component) => (
                  <li
                    className={component.slow || component.excessive ? 'render-debug-warning' : ''}
                    key={component.component}
                  >
                    <div className="render-debug-component">
                      <strong>{component.component}</strong>
                      {(component.slow || component.excessive) && <span>Needs attention</span>}
                    </div>
                    <dl>
                      <div><dt>Average</dt><dd>{component.averageDuration.toFixed(2)} ms</dd></div>
                      <div><dt>Latest</dt><dd>{component.latestDuration.toFixed(2)} ms</dd></div>
                      <div><dt>Maximum</dt><dd>{component.maxDuration.toFixed(2)} ms</dd></div>
                      <div><dt>Renders / min</dt><dd>{component.rendersPerMinute}</dd></div>
                      <div><dt>Total samples</dt><dd>{component.renderCount}</dd></div>
                    </dl>
                    <p>{component.recommendations.join(' ')}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      )}
    </>
  )
}
