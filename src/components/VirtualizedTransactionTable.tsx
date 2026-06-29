import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const ROW_HEIGHT = 40;
const OVERSCAN = 5;

type Transaction = {
  id: string;
  date: string;
  amount: string;
  currency: string;
  recipient: string;
  status: string;
  stellarHash: string;
};

function generateRows(count: number): Transaction[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `TXN-${String(i + 1).padStart(6, '0')}`,
    date: new Date(Date.now() - i * 60_000).toISOString().slice(0, 19).replace('T', ' '),
    amount: (Math.random() * 50000).toFixed(2),
    currency: ['USDC', 'XLM', 'USDT'][i % 3],
    recipient: `G${Math.random().toString(36).slice(2, 10).toUpperCase()}...`,
    status: ['Completed', 'Pending', 'Failed'][i % 3],
    stellarHash: Math.random().toString(16).slice(2, 18).toUpperCase(),
  }));
}

const STATUS_COLORS: Record<string, string> = {
  Completed: '#22c55e',
  Pending: '#f59e0b',
  Failed: '#ef4444',
};

const COLS = ['id', 'date', 'amount', 'currency', 'recipient', 'status', 'stellarHash'] as const;
const COL_LABELS: Record<string, string> = {
  id: 'ID', date: 'Date', amount: 'Amount', currency: 'Currency',
  recipient: 'Recipient', status: 'Status', stellarHash: 'Stellar Hash',
};

function useVirtual(totalRows: number, containerHeight: number, scrollTop: number) {
  return useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT);
    const end = Math.min(totalRows - 1, start + visibleCount + OVERSCAN * 2);
    return { start, end, totalHeight: totalRows * ROW_HEIGHT };
  }, [totalRows, containerHeight, scrollTop]);
}

export default function VirtualizedTransactionTable({ rowCount = 5000 }: { rowCount?: number }) {
  const rows = useMemo(() => generateRows(rowCount), [rowCount]);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(500);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    ro.observe(el);
    setContainerHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop);
  }, []);

  const { start, end, totalHeight } = useVirtual(rows.length, containerHeight, scrollTop);

  const visibleRows = rows.slice(start, end + 1);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 8, fontSize: 13, color: '#64748b' }}>
        Rendering {end - start + 1} of {rowCount.toLocaleString()} rows (virtualized)
      </div>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        {/* Sticky header */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 110 }} />
            <col style={{ width: 155 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 100 }} />
            <col />
          </colgroup>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr style={{ background: '#f9fafb' }}>
              {COLS.map(col => (
                <th key={col} style={{
                  padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid #e5e7eb',
                  fontSize: 12, fontWeight: 700, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden',
                }}>
                  {COL_LABELS[col]}
                </th>
              ))}
            </tr>
          </thead>
        </table>

        {/* Scrollable body */}
        <div
          ref={containerRef}
          onScroll={onScroll}
          style={{ height: 480, overflowY: 'auto', overflowX: 'hidden' }}
        >
          {/* Full height spacer */}
          <div style={{ height: totalHeight, position: 'relative' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed',
              position: 'absolute', top: start * ROW_HEIGHT,
            }}>
              <colgroup>
                <col style={{ width: 110 }} />
                <col style={{ width: 155 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 80 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 100 }} />
                <col />
              </colgroup>
              <tbody>
                {visibleRows.map((row, i) => {
                  const absIndex = start + i;
                  return (
                    <tr
                      key={row.id}
                      style={{
                        height: ROW_HEIGHT,
                        borderBottom: '1px solid #f3f4f6',
                        background: absIndex % 2 === 0 ? '#fff' : '#fafafa',
                      }}
                    >
                      {COLS.map(col => (
                        <td key={col} style={{ padding: '0 14px', fontSize: 12, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {col === 'status' ? (
                            <span style={{ color: STATUS_COLORS[row.status] ?? '#374151', fontWeight: 600 }}>
                              ● {row.status}
                            </span>
                          ) : col === 'stellarHash' ? (
                            <code style={{ fontSize: 10, background: '#f3f4f6', padding: '1px 5px', borderRadius: 4 }}>
                              {row[col]}
                            </code>
                          ) : (
                            row[col]
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
        Smooth scroll via DOM virtualization — only visible rows are in the DOM.
      </div>
    </div>
  );
}
