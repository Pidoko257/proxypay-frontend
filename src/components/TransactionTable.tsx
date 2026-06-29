import React, { useState, useEffect, useCallback, useRef } from 'react';

const ALL_COLUMNS = [
  { key: 'id', label: 'Transaction ID' },
  { key: 'date', label: 'Date' },
  { key: 'amount', label: 'Amount' },
  { key: 'fee', label: 'Fee' },
  { key: 'currency', label: 'Currency' },
  { key: 'recipient', label: 'Recipient' },
  { key: 'status', label: 'Status' },
  { key: 'stellarHash', label: 'Stellar Hash' },
  { key: 'network', label: 'Network' },
  { key: 'memo', label: 'Memo' },
];

const STORAGE_KEY = 'proxypay_tx_columns';

const DEFAULT_VISIBLE = ['id', 'date', 'amount', 'fee', 'currency', 'recipient', 'status', 'stellarHash'];

type Transaction = {
  id: string;
  date: string;
  amount: string;
  fee: string;
  currency: string;
  recipient: string;
  status: 'completed' | 'pending' | 'failed';
  stellarHash: string;
  network: string;
  memo: string;
};

function generateSampleRows(count: number): Transaction[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `TXN-${String(i + 1).padStart(6, '0')}`,
    date: new Date(Date.now() - i * 3600_000).toISOString().slice(0, 19).replace('T', ' '),
    amount: (Math.random() * 10000).toFixed(2),
    fee: (Math.random() * 2).toFixed(4),
    currency: ['USDC', 'XLM', 'USDT'][i % 3],
    recipient: `GDEX${Math.random().toString(36).slice(2, 8).toUpperCase()}...`,
    status: (['completed', 'pending', 'failed'] as const)[i % 3],
    stellarHash: Math.random().toString(16).slice(2, 18).toUpperCase(),
    network: i % 2 === 0 ? 'Mainnet' : 'Testnet',
    memo: i % 4 === 0 ? `Payment #${i}` : '',
  }));
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#22c55e',
  pending: '#f59e0b',
  failed: '#ef4444',
};

export default function TransactionTable({ rowCount = 20 }: { rowCount?: number }) {
  const [visible, setVisible] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return new Set(JSON.parse(stored));
    } catch {}
    return new Set(DEFAULT_VISIBLE);
  });
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [rows] = useState(() => generateSampleRows(rowCount));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...visible]));
  }, [visible]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = useCallback((key: string) => {
    setVisible(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const visibleCols = ALL_COLUMNS.filter(c => visible.has(c.key));

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, position: 'relative' }} ref={dropdownRef}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db',
            background: '#fff', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span>⚙</span> Columns ({visible.size}/{ALL_COLUMNS.length})
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: '110%', right: 0, zIndex: 100,
            background: '#fff', border: '1px solid #d1d5db', borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 8, minWidth: 200,
          }}>
            <div style={{ padding: '4px 8px 8px', fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Toggle Columns
            </div>
            {ALL_COLUMNS.map(col => (
              <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', cursor: 'pointer', borderRadius: 4, userSelect: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <input type="checkbox" checked={visible.has(col.key)} onChange={() => toggle(col.key)} style={{ cursor: 'pointer' }} />
                <span style={{ fontSize: 13 }}>{col.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {visibleCols.map(col => (
                <th key={col.key} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: 600, color: '#374151' }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                {visibleCols.map(col => (
                  <td key={col.key} style={{ padding: '9px 14px', color: '#111827', whiteSpace: 'nowrap' }}>
                    {col.key === 'status' ? (
                      <span style={{ color: STATUS_COLORS[row.status], fontWeight: 600 }}>● {row.status}</span>
                    ) : col.key === 'stellarHash' ? (
                      <code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{row[col.key as keyof Transaction]}</code>
                    ) : (
                      String(row[col.key as keyof Transaction])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
