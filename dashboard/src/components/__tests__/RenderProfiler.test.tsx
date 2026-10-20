import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ComponentRenderDebugPanel } from '../ComponentRenderDebugPanel'
import { RenderProfiler } from '../RenderProfiler'
import {
  clearComponentRenderMetrics,
  readPerformanceMetrics,
  recordComponentRender,
  summarizeComponentRenders,
} from '../../services/performance'

describe('component render profiling', () => {
  beforeEach(() => {
    localStorage.clear()
    clearComponentRenderMetrics()
  })

  it('records timing for nested and sibling component hierarchies and updates render counts', () => {
    function Counter() {
      const [count, setCount] = useState(0)
      return <button onClick={() => setCount((value) => value + 1)}>Update {count}</button>
    }

    render(
      <RenderProfiler id="Dashboard">
        <div>
          <RenderProfiler id="Transaction list">
            <RenderProfiler id="Transaction row">
              <Counter />
            </RenderProfiler>
          </RenderProfiler>
          <RenderProfiler id="Notifications">
            <span>Notifications</span>
          </RenderProfiler>
        </div>
      </RenderProfiler>
    )

    const initialSummaries = summarizeComponentRenders(readPerformanceMetrics())
    expect(initialSummaries.map(({ component }) => component)).toEqual(
      expect.arrayContaining(['Dashboard', 'Transaction list', 'Transaction row', 'Notifications'])
    )
    const initialRowSamples = initialSummaries.find(({ component }) => component === 'Transaction row')?.renderCount

    fireEvent.click(screen.getByRole('button', { name: 'Update 0' }))

    const updatedRow = summarizeComponentRenders(readPerformanceMetrics())
      .find(({ component }) => component === 'Transaction row')
    expect(updatedRow?.renderCount).toBeGreaterThan(initialRowSamples || 0)
  })

  it('highlights slow components with excessive update frequency and recommendations', () => {
    const now = Date.now()
    const metrics = Array.from({ length: 10 }, (_, index) => ({
      name: 'component-render',
      value: 20,
      recordedAt: new Date(now - index * 1000).toISOString(),
      tags: { component: 'Frequently updated table' },
    }))
    const [summary] = summarizeComponentRenders(metrics, now)

    expect(summary).toMatchObject({
      component: 'Frequently updated table',
      renderCount: 10,
      rendersPerMinute: 10,
      averageDuration: 20,
      slow: true,
      excessive: true,
    })
    expect(summary.recommendations).toHaveLength(2)
  })

  it('shows render metrics and profiling recommendations in the debug panel', () => {
    for (let index = 0; index < 10; index += 1) {
      recordComponentRender('TransactionTable', 20, 24, 'update')
    }

    render(<ComponentRenderDebugPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Toggle component render profiler' }))

    expect(screen.getByRole('dialog', { name: 'Component render profiler' })).toBeInTheDocument()
    expect(screen.getByText('TransactionTable')).toBeInTheDocument()
    expect(screen.getAllByText('20.00 ms')).toHaveLength(3)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText(/check parent updates and unstable props/)).toBeInTheDocument()
  })
})
