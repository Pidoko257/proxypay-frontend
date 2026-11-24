import React, { useState, useMemo, useCallback } from 'react';

export interface FilterTransaction {
  id: string;
  status: 'completed' | 'pending' | 'failed' | 'processing';
  type: 'send' | 'receive' | 'exchange';
  amount: number;
  currency: string;
  createdAt: string;
  sender: string;
  recipient: string;
}

interface FilterCriteria {
  status: string;
  type: string;
  fromDate: string;
  toDate: string;
  minAmount: string;
  maxAmount: string;
}

const EMPTY_FILTER: FilterCriteria = {
  status: '',
  type: '',
  fromDate: '',
  toDate: '',
  minAmount: '',
  maxAmount: '',
};

const MAX_PREVIEW_ROWS = 5;

function applyFilters(transactions: FilterTransaction[], filters: FilterCriteria): FilterTransaction[] {
  return transactions.filter((t) => {
    if (filters.status && t.status !== filters.status) return false;
    if (filters.type && t.type !== filters.type) return false;

    const created = new Date(t.createdAt).getTime();
    if (filters.fromDate && created < new Date(filters.fromDate).getTime()) return false;
    if (filters.toDate && created > new Date(filters.toDate).getTime() + 24 * 60 * 60 * 1000 - 1) return false;

    const min = filters.minAmount !== '' ? parseFloat(filters.minAmount) : NaN;
    const max = filters.maxAmount !== '' ? parseFloat(filters.maxAmount) : NaN;
    if (!isNaN(min) && t.amount < min) return false;
    if (!isNaN(max) && t.amount > max) return false;

    return true;
  });
}

const STATUS_BADGE: Record<string, string> = {
  completed: '#1ea74a',
  pending: '#d48e00',
  processing: '#d48e00',
  failed: '#e0302e',
};

interface LiveFilterPreviewProps {
  transactions: FilterTransaction[];
}

export function LiveFilterPreview({ transactions }: LiveFilterPreviewProps): React.JSX.Element {
  const [pendingFilters, setPendingFilters] = useState<FilterCriteria>(EMPTY_FILTER);
  const [appliedFilters, setAppliedFilters] = useState<FilterCriteria>(EMPTY_FILTER);
  const [prevAppliedFilters, setPrevAppliedFilters] = useState<FilterCriteria | null>(null);
  const [undoAvailable, setUndoAvailable] = useState(false);

  /** Live preview is computed from pendingFilters using useMemo so it never blocks the UI. */
  const previewResults = useMemo(
    () => applyFilters(transactions, pendingFilters),
    [transactions, pendingFilters],
  );

  /** Applied results reflect committed filters. */
  const appliedResults = useMemo(
    () => applyFilters(transactions, appliedFilters),
    [transactions, appliedFilters],
  );

  const handleFilterChange = useCallback(
    (field: keyof FilterCriteria) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setPendingFilters((prev) => ({ ...prev, [field]: e.target.value }));
    },
    [],
  );

  const handleApply = useCallback(() => {
    setPrevAppliedFilters(appliedFilters);
    setAppliedFilters(pendingFilters);
    setUndoAvailable(true);
  }, [pendingFilters, appliedFilters]);

  const handleUndo = useCallback(() => {
    if (prevAppliedFilters !== null) {
      setAppliedFilters(prevAppliedFilters);
      setPendingFilters(prevAppliedFilters);
      setPrevAppliedFilters(null);
      setUndoAvailable(false);
    }
  }, [prevAppliedFilters]);

  const handleReset = useCallback(() => {
    setPendingFilters(EMPTY_FILTER);
    setAppliedFilters(EMPTY_FILTER);
    setPrevAppliedFilters(null);
    setUndoAvailable(false);
  }, []);

  const isDirty = JSON.stringify(pendingFilters) !== JSON.stringify(appliedFilters);
  const previewSample = previewResults.slice(0, MAX_PREVIEW_ROWS);

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: 1000, margin: '0 auto' }}>
      <h1>Live Filter Preview</h1>
      <p>
        Adjust filters to see a real-time preview of matching transactions. Click{' '}
        <strong>Apply Filter</strong> to commit the filters.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
          padding: '1.25rem',
          borderRadius: 8,
          background: 'var(--ifm-color-emphasis-100)',
          marginBottom: '1.5rem',
        }}
      >
        <label>
          Status
          <select
            value={pendingFilters.status}
            onChange={handleFilterChange('status')}
            style={{ display: 'block', marginTop: '0.25rem', width: '100%' }}
          >
            <option value="">All</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </label>

        <label>
          Type
          <select
            value={pendingFilters.type}
            onChange={handleFilterChange('type')}
            style={{ display: 'block', marginTop: '0.25rem', width: '100%' }}
          >
            <option value="">All</option>
            <option value="send">Send</option>
            <option value="receive">Receive</option>
            <option value="exchange">Exchange</option>
          </select>
        </label>

        <label>
          From Date
          <input
            type="date"
            value={pendingFilters.fromDate}
            onChange={handleFilterChange('fromDate')}
            style={{ display: 'block', marginTop: '0.25rem', width: '100%' }}
          />
        </label>

        <label>
          To Date
          <input
            type="date"
            value={pendingFilters.toDate}
            onChange={handleFilterChange('toDate')}
            style={{ display: 'block', marginTop: '0.25rem', width: '100%' }}
          />
        </label>

        <label>
          Min Amount
          <input
            type="number"
            value={pendingFilters.minAmount}
            onChange={handleFilterChange('minAmount')}
            min={0}
            placeholder="e.g. 10"
            style={{ display: 'block', marginTop: '0.25rem', width: '100%' }}
          />
        </label>

        <label>
          Max Amount
          <input
            type="number"
            value={pendingFilters.maxAmount}
            onChange={handleFilterChange('maxAmount')}
            min={0}
            placeholder="e.g. 1000"
            style={{ display: 'block', marginTop: '0.25rem', width: '100%' }}
          />
        </label>
      </div>

      {/* Live preview count banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          borderRadius: 8,
          background: isDirty ? 'rgba(30,167,74,0.08)' : 'var(--ifm-color-emphasis-100)',
          borderLeft: `4px solid ${isDirty ? 'var(--ifm-color-primary)' : 'var(--ifm-color-emphasis-300)'}`,
        }}
      >
        <span>
          <strong>Preview:</strong> {previewResults.length} of {transactions.length} transaction(s) match
        </span>
        {isDirty && (
          <span style={{ color: 'var(--ifm-color-primary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
            Filters pending — click Apply to commit
          </span>
        )}
      </div>

      {/* Preview sample table */}
      {previewSample.length === 0 ? (
        <div
          style={{
            padding: '1.5rem',
            borderRadius: 8,
            background: 'var(--ifm-color-emphasis-100)',
            textAlign: 'center',
            color: 'var(--ifm-color-emphasis-600)',
            marginBottom: '1.5rem',
          }}
        >
          No transactions match the current filters.
        </div>
      ) : (
        <div style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--ifm-color-emphasis-600)' }}>
            Showing up to {MAX_PREVIEW_ROWS} sample results:
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--ifm-color-emphasis-100)' }}>
                {['ID', 'Status', 'Type', 'Amount', 'Currency', 'Created At'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '0.5rem',
                      borderBottom: '2px solid var(--ifm-color-emphasis-300)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewSample.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--ifm-color-emphasis-200)' }}>
                  <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>{t.id}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: 4,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: STATUS_BADGE[t.status] ?? 'inherit',
                        background: `${STATUS_BADGE[t.status] ?? '#999'}22`,
                      }}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem' }}>{t.type}</td>
                  <td style={{ padding: '0.5rem' }}>{t.amount.toFixed(2)}</td>
                  <td style={{ padding: '0.5rem' }}>{t.currency}</td>
                  <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>{t.createdAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {previewResults.length > MAX_PREVIEW_ROWS && (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--ifm-color-emphasis-600)' }}>
              … and {previewResults.length - MAX_PREVIEW_ROWS} more not shown.
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <button
          className="button button--primary"
          onClick={handleApply}
          disabled={!isDirty}
        >
          Apply Filter
        </button>
        <button
          className="button button--secondary"
          onClick={handleUndo}
          disabled={!undoAvailable}
        >
          Undo Filter
        </button>
        <button className="button button--secondary" onClick={handleReset}>
          Reset All
        </button>
      </div>

      {/* Applied results */}
      <h2>Applied Results</h2>
      <p>
        <strong>{appliedResults.length}</strong> transaction(s) with the committed filter.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--ifm-color-emphasis-100)' }}>
              {['ID', 'Status', 'Type', 'Amount', 'Currency', 'Created At'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    padding: '0.5rem',
                    borderBottom: '2px solid var(--ifm-color-emphasis-300)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {appliedResults.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: 'var(--ifm-color-emphasis-500)' }}>
                  No transactions match the applied filters.
                </td>
              </tr>
            ) : (
              appliedResults.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--ifm-color-emphasis-200)' }}>
                  <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>{t.id}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: 4,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: STATUS_BADGE[t.status] ?? 'inherit',
                        background: `${STATUS_BADGE[t.status] ?? '#999'}22`,
                      }}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem' }}>{t.type}</td>
                  <td style={{ padding: '0.5rem' }}>{t.amount.toFixed(2)}</td>
                  <td style={{ padding: '0.5rem' }}>{t.currency}</td>
                  <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>{t.createdAt.slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LiveFilterPreview;
