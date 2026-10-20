import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from 'react'
import { recordComponentRender } from '../services/performance'

interface RenderProfilerProps {
  id: string
  children: ReactNode
}

const handleRender: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration) => {
  recordComponentRender(id, actualDuration, baseDuration, phase)
}

export const RenderProfiler = ({ id, children }: RenderProfilerProps) => (
  <Profiler id={id} onRender={handleRender}>
    {children}
  </Profiler>
)
