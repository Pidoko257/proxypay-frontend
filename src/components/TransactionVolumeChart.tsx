import React, { useState, useMemo, useRef, useEffect } from 'react';

interface DataPoint {
  date: string;
  currency: string;
  volume: number;
  count: number;
}

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateMockData(): DataPoint[] {
  const currencies = ['NGN', 'KES', 'GHS', 'ZAR'];
  const bases: Record<string, number> = { NGN: 900000, ZAR: 700000, KES: 350000, GHS: 280000 };
  const data: DataPoint[] = [];
  const rand = seededRand(42);
  for (let i = 29; i >= 0; i--) {
    const d = new Date('2026-06-30');
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split('T')[0];
    currencies.forEach(c => {
      const base = bases[c];
      data.push({ date, currency: c, volume: Math.floor(rand() * base + base * 0.15), count: Math.floor(rand() * 180 + 20) });
    });
  }
  return data;
}

const ALL_DATA = generateMockData();
const ALL_DATES = [...new Set(ALL_DATA.map(d => d.date))].sort();
const CURRENCIES = ['NGN', 'KES', 'GHS', 'ZAR'];
const COLORS: Record<string, string> = { NGN: '#2e8555', KES: '#f59e0b', GHS: '#3b82f6', ZAR: '#ef4444' };

const PAD = { top: 24, right: 24, bottom: 52, left: 74 };
const H = 320;

function fmt(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return `${v}`;
}
function fmtDate(s: string): string {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TransactionVolumeChart(): React.JSX.Element {
  const [mode, setMode] = useState<'bar' | 'line'>('bar');
  const [currencies, setCurrencies] = useState<string[]>(CURRENCIES);
  const [start, setStart] = useState(ALL_DATES[0]);
  const [end, setEnd] = useState(ALL_DATES[ALL_DATES.length - 1]);
  const [tooltip, setTooltip] = useState<{ xi: number; date: string; breakdown: Record<string, number>; total: number } | null>(null);
  const [width, setWidth] = useState(700);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(e => setWidth(e[0].contentRect.width || 700));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const toggleCurrency = (c: string) =>
    setCurrencies(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const dates = useMemo(
    () => ALL_DATES.filter(d => d >= start && d <= end),
    [start, end],
  );

  const daily = useMemo(() =>
    dates.map(date => {
      const breakdown: Record<string, number> = {};
      let total = 0;
      ALL_DATA.filter(d => d.date === date && currencies.includes(d.currency)).forEach(d => {
        breakdown[d.currency] = d.volume;
        total += d.volume;
      });
      return { date, breakdown, total };
    }), [dates, currencies]);

  const cumulative = useMemo(() => {
    let acc = 0;
    return daily.map(d => { acc += d.total; return { ...d, cum: acc }; });
  }, [daily]);

  const maxVal = useMemo(() => {
    const vals = mode === 'line' ? cumulative.map(d => d.cum) : daily.map(d => d.total);
    return Math.max(...vals, 1);
  }, [mode, daily, cumulative]);

  const plotW = width - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const n = dates.length;
  const barW = n > 0 ? (plotW / n) * 0.65 : 0;
  const step = n > 1 ? plotW / (n - 1) : plotW;
  const barStep = n > 0 ? plotW / n : plotW;

  const xBar = (i: number) => i * barStep + barStep / 2;
  const xLine = (i: number) => i * step;
  const yScale = (v: number) => plotH - (v / maxVal) * plotH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ v: maxVal * t, y: yScale(maxVal * t) }));
  const interval = Math.max(1, Math.ceil(n / 7));
  const xLabels = dates.filter((_, i) => i % interval === 0 || i === n - 1);

  const linePath = cumulative.map((d, i) => `${i === 0 ? 'M' : 'L'}${xLine(i)},${yScale(d.cum)}`).join(' ');
  const areaPath = n > 0
    ? `${linePath} L${xLine(n - 1)},${plotH} L${xLine(0)},${plotH}Z`
    : '';

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left - PAD.left;
    const i = mode === 'bar'
      ? Math.floor(mx / barStep)
      : Math.round(mx / (n > 1 ? plotW / (n - 1) : 1));
    if (i >= 0 && i < n) {
      const d = daily[i];
      setTooltip({ xi: i, date: d.date, breakdown: d.breakdown, total: d.total });
    }
  };

  const tooltipX = tooltip != null
    ? Math.min((mode === 'bar' ? xBar(tooltip.xi) : xLine(tooltip.xi)) + PAD.left + 12, width - 175)
    : 0;
  const tooltipY = tooltip != null
    ? Math.max(yScale(mode === 'line' ? cumulative[tooltip.xi]?.cum ?? 0 : daily[tooltip.xi]?.total ?? 0) + PAD.top - 10, 4)
    : 0;

  return (
    <div style={{ fontFamily: 'var(--ifm-font-family-base)' }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--ifm-color-emphasis-300)' }}>
          {([['bar', '▊ Daily Volume'], ['line', '↗ Cumulative']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setMode(t)} style={{
              padding: '0.375rem 0.85rem', border: 'none', cursor: 'pointer',
              fontWeight: 500, fontSize: '0.85rem',
              background: mode === t ? 'var(--ifm-color-primary)' : 'transparent',
              color: mode === t ? '#fff' : 'inherit',
            }}>{label}</button>
          ))}
        </div>

        {/* Currency filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {CURRENCIES.map(c => (
            <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.85rem', userSelect: 'none' }}>
              <input type="checkbox" checked={currencies.includes(c)} onChange={() => toggleCurrency(c)} />
              <span style={{ color: COLORS[c], fontWeight: 700 }}>{c}</span>
            </label>
          ))}
        </div>

        {/* Date range */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.85rem', marginLeft: 'auto' }}>
          <input type="date" value={start} min={ALL_DATES[0]} max={end}
            onChange={e => setStart(e.target.value)}
            style={{ padding: '0.25rem 0.5rem', borderRadius: 4, border: '1px solid var(--ifm-color-emphasis-300)', fontSize: '0.82rem' }} />
          <span style={{ color: 'var(--ifm-color-emphasis-500)' }}>–</span>
          <input type="date" value={end} min={start} max={ALL_DATES[ALL_DATES.length - 1]}
            onChange={e => setEnd(e.target.value)}
            style={{ padding: '0.25rem 0.5rem', borderRadius: 4, border: '1px solid var(--ifm-color-emphasis-300)', fontSize: '0.82rem' }} />
        </div>
      </div>

      {/* SVG chart */}
      <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
        <svg
          width={width} height={H}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          style={{ display: 'block', overflow: 'visible', cursor: 'crosshair' }}
        >
          <defs>
            <linearGradient id="tcAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ifm-color-primary)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--ifm-color-primary)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <g transform={`translate(${PAD.left},${PAD.top})`}>
            {/* Y grid + labels */}
            {yTicks.map(t => (
              <g key={t.v}>
                <line x1={0} y1={t.y} x2={plotW} y2={t.y} stroke="var(--ifm-color-emphasis-200)" strokeDasharray="3,4" />
                <text x={-8} y={t.y + 4} textAnchor="end" fontSize={11} fill="var(--ifm-color-emphasis-600)">{fmt(t.v)}</text>
              </g>
            ))}

            {/* X axis line */}
            <line x1={0} y1={plotH} x2={plotW} y2={plotH} stroke="var(--ifm-color-emphasis-300)" />

            {/* Bars */}
            {mode === 'bar' && daily.map((d, i) => {
              const bh = plotH - yScale(d.total);
              const hovered = tooltip?.xi === i;
              return (
                <rect key={d.date}
                  x={xBar(i) - barW / 2} y={yScale(d.total)}
                  width={barW} height={Math.max(bh, 0)}
                  fill={hovered ? 'var(--ifm-color-primary-light)' : 'var(--ifm-color-primary)'}
                  rx={2} opacity={0.82}
                />
              );
            })}

            {/* Line + area */}
            {mode === 'line' && n > 0 && (
              <>
                <path d={areaPath} fill="url(#tcAreaGrad)" />
                <path d={linePath} fill="none" stroke="var(--ifm-color-primary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                {cumulative.map((d, i) => (
                  <circle key={d.date} cx={xLine(i)} cy={yScale(d.cum)}
                    r={tooltip?.xi === i ? 5 : 3}
                    fill="var(--ifm-color-primary)" stroke="#fff" strokeWidth={1.5}
                  />
                ))}
              </>
            )}

            {/* X labels */}
            {xLabels.map(date => {
              const i = dates.indexOf(date);
              const x = mode === 'bar' ? xBar(i) : xLine(i);
              return (
                <text key={date} x={x} y={plotH + 18} textAnchor="middle" fontSize={10} fill="var(--ifm-color-emphasis-600)">
                  {fmtDate(date)}
                </text>
              );
            })}

            {/* Hover crosshair */}
            {tooltip != null && (
              <line
                x1={mode === 'bar' ? xBar(tooltip.xi) : xLine(tooltip.xi)}
                y1={0}
                x2={mode === 'bar' ? xBar(tooltip.xi) : xLine(tooltip.xi)}
                y2={plotH}
                stroke="var(--ifm-color-emphasis-400)"
                strokeDasharray="4,3"
                strokeWidth={1}
              />
            )}
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'absolute', left: tooltipX, top: tooltipY,
            background: 'var(--ifm-background-surface-color, #fff)',
            border: '1px solid var(--ifm-color-emphasis-300)',
            borderRadius: 8, padding: '0.5rem 0.8rem',
            pointerEvents: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            fontSize: '0.8125rem', zIndex: 10, minWidth: 160,
          }}>
            <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--ifm-color-emphasis-900)' }}>
              {fmtDate(tooltip.date)}
            </div>
            {Object.entries(tooltip.breakdown).map(([c, v]) => (
              <div key={c} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.15rem' }}>
                <span style={{ color: COLORS[c], fontWeight: 600 }}>{c}</span>
                <span>{fmt(v)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--ifm-color-emphasis-200)', marginTop: '0.35rem', paddingTop: '0.35rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Total</span>
              <span>{fmt(tooltip.total)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        {currencies.map(c => (
          <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[c] }} />
            <span>{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
