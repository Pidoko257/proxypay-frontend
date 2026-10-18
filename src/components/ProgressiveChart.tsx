import React, { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type ChartStage = 'loading' | 'preview' | 'complete';

const completedCharts = new Map<string, ReactNode>();

interface ProgressiveChartProps {
  cacheKey: string;
  preview: ReactNode;
  children: ReactNode;
}

export default function ProgressiveChart({
  cacheKey,
  preview,
  children,
}: ProgressiveChartProps): React.JSX.Element {
  const latestChart = useRef(children);
  const [progress, setProgress] = useState<{ cacheKey: string; stage: ChartStage }>(() => ({
    cacheKey,
    stage: completedCharts.has(cacheKey) ? 'complete' : 'loading',
  }));
  const stage = progress.cacheKey === cacheKey
    ? progress.stage
    : completedCharts.has(cacheKey)
      ? 'complete'
      : 'loading';

  useEffect(() => {
    latestChart.current = children;
  });

  useEffect(() => {
    const cachedChart = completedCharts.get(cacheKey);
    if (cachedChart) {
      setProgress({ cacheKey, stage: 'complete' });
      return;
    }

    setProgress({ cacheKey, stage: 'loading' });
    const previewTimer = window.setTimeout(() => {
      setProgress({ cacheKey, stage: 'preview' });
    }, 100);
    const completeTimer = window.setTimeout(() => {
      if (completedCharts.size >= 12) {
        const oldestKey = completedCharts.keys().next().value;
        if (oldestKey) completedCharts.delete(oldestKey);
      }
      completedCharts.set(cacheKey, latestChart.current);
      setProgress({ cacheKey, stage: 'complete' });
    }, 400);

    return () => {
      window.clearTimeout(previewTimer);
      window.clearTimeout(completeTimer);
    };
  }, [cacheKey]);

  return (
    <div className="progressive-chart" aria-busy={stage !== 'complete'}>
      {stage === 'loading' && (
        <div className="progressive-chart__placeholder" role="status">
          Loading chart data...
        </div>
      )}
      {stage === 'preview' && (
        <div className="progressive-chart__preview" aria-label="Low-resolution chart preview">
          {preview}
        </div>
      )}
      {stage === 'complete' && (
        <div className="progressive-chart__complete">
          {completedCharts.get(cacheKey) ?? children}
        </div>
      )}
    </div>
  );
}