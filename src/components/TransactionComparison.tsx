import React, { useState, useMemo } from 'react';

export interface ComparisonTransaction {
  id: string;
  status: 'completed' | 'pending' | 'failed' | 'processing';
  type: 'send' | 'receive' | 'exchange';
  amount: number;
  fee: number;
  currency: string;
  network: string;
  sender: string;
  recipient: string;
  stellarTxHash: string;
  mobilemoneyRef: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

/** Fields shown in the side-by-side comparison table. */
const FIELDS: { key: keyof ComparisonTransaction; label: string }[] = [
  { key: 'id', label: 'Transaction ID' },
  { key: 'status', label: 'Status' },
  { key: 'type', label: 'Type' },
  { key: 'amount', label: 'Amount' },
  { key: 'fee', label: 'Fee' },
  { key: 'currency', label: 'Currency' },
  { key: 'network', label: 'Network' },
  { key: 'sender', label: 'Sender' },
  { key: 'recipient', label: 'Recipient' },
  { key: 'stellarTxHash', label: 'Stellar Tx Hash' },
  { key: 'mobilemoneyRef', label: 'Mobile Money Ref' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'updatedAt', label: 'Updated At' },
  { key: 'completedAt', label: 'Completed At' },
];

interface TransactionComparisonProps {
  transactions: ComparisonTransaction[];
}

export function TransactionComparison({ transactions }: TransactionComparisonProps): React.JSX.Element {
  const [leftId, setLeftId] = useState<string>(transactions[0]?.id ?? '');
  const [rightId, setRightId] = useState<string>(transactions[1]?.id ?? '');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [reportFormat, setReportFormat] = useState<'json' | 'csv'>('json');

  /** Filter the transaction list by the chosen time range (based on createdAt). */
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const created = new Date(t.createdAt).getTime();
      if (fromDate && created < new Date(fromDate).getTime()) return false;
      if (toDate && created > new Date(toDate).getTime() + 24 * 60 * 60 * 1000) return false;
      return true;
    });
  }, [transactions, fromDate, toDate]);

  const leftTxn = useMemo(
    () => filteredTransactions.find((t) => t.id === leftId) ?? filteredTransactions[0],
    [filteredTransactions, leftId],
  );
  const rightTxn = useMemo(
    () => filteredTransactions.find((t) => t.id === rightId) ?? filteredTransactions[1],
    [filteredTransactions, rightId],
  );

  const comparison = useMemo(() => {
    if (!leftTxn || !rightTxn) return [];
    return FIELDS.map((f) => {
      const lVal = String(leftTxn[f.key]);
      const rVal = String(rightTxn[f.key]);
      return { key: f.key, label: f.label, left: lVal, right: rVal, match: lVal === rVal };
    });
  }, [leftTxn, rightTxn]);

  const matchCount = comparison.filter((c) => c.match).length;
  const diffCount = comparison.length - matchCount;

  /** Export the comparison report as JSON or CSV. */
  const handleExport = useCallbackExport();

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: 1100, margin: '0 auto' }}>
      <h1>Transaction Comparison</h1>
      <p>Select two transactions to compare them side-by-side. Differences are highlighted in red.</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
        <label>
          First Transaction
          <select
            value={leftId}
            onChange={(e) => setLeftId(e.target.value)}
            style={{ display: 'block', marginTop: '0.25rem' }}
          >
            {filteredTransactions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} — {t.type} — {t.amount} {t.currency}
              </option>
            ))}
          </select>
        </label>

        <label>
          Second Transaction
          <select
            value={rightId}
            onChange={(e) => setRightId(e.target.value)}
            style={{ display: 'block', marginTop: '0.25rem' }}
          >
            {filteredTransactions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} — {t.type} — {t.amount} {t.currency}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
        <label>
          From Date
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ display: 'block', marginTop: '0.25rem' }}
          />
        </label>
        <label>
          To Date
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ display: 'block', marginTop: '0.25rem' }}
          />
        </label>
        {(fromDate || toDate) && (
          <button
            className="button button--secondary button--sm"
            onClick={() => {
              setFromDate('');
              setToDate('');
            }}
          >
            Clear Date Filter
          </button>
        )}
      </div>

      {!leftTxn || !rightTxn ? (
        <div
          style={{
            padding: '1.5rem',
            borderRadius: 8,
            background: 'var(--ifm-color-emphasis-100)',
          }}
        >
          No transactions match the current filters. Adjust the date range to compare transactions.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <strong>{matchCount}</strong> matching field(s), <strong>{diffCount}</strong> differing field(s).
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--ifm-color-emphasis-100)' }}>
                <th style={{ textAlign: 'left', padding: '0.6rem', borderBottom: '2px solid var(--ifm-color-emphasis-300)' }}>
                  Field
                </th>
                <th style={{ textAlign: 'left', padding: '0.6rem', borderBottom: '2px solid var(--ifm-color-emphasis-300)' }}>
                  {leftTxn.id}
                </th>
                <th style={{ textAlign: 'left', padding: '0.6rem', borderBottom: '2px solid var(--ifm-color-emphasis-300)' }}>
                  {rightTxn.id}
                </th>
                <th style={{ textAlign: 'left', padding: '0.6rem', borderBottom: '2px solid var(--ifm-color-emphasis-300)' }}>
                  Match?
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.key} style={{ borderBottom: '1px solid var(--ifm-color-emphasis-200)' }}>
                  <td style={{ padding: '0.6rem', fontWeight: 600 }}>{row.label}</td>
                  <td
                    style={{
                      padding: '0.6rem',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                      background: row.match ? 'rgba(30,167,74,0.06)' : 'rgba(224,48,46,0.06)',
                      color: row.match ? '#1ea74a' : '#e0302e',
                    }}
                  >
                    {row.left}
                  </td>
                  <td
                    style={{
                      padding: '0.6rem',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                      background: row.match ? 'rgba(30,167,74,0.06)' : 'rgba(224,48,46,0.06)',
                      color: row.match ? '#1ea74a' : '#e0302e',
                    }}
                  >
                    {row.right}
                  </td>
                  <td style={{ padding: '0.6rem' }}>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: 4,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        background: row.match ? 'rgba(30,167,74,0.12)' : 'rgba(224,48,46,0.12)',
                        color: row.match ? '#1ea74a' : '#e0302e',
                      }}
                    >
                      {row.match ? 'Match' : 'Diff'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{ marginTop: '2rem' }}>Export Comparison Report</h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label>
              Format
              <select
                value={reportFormat}
                onChange={(e) => setReportFormat(e.target.value as 'json' | 'csv')}
                style={{ display: 'block', marginTop: '0.25rem' }}
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </label>
            <button
              className="button button--primary"
              onClick={() => handleExport(reportFormat, leftTxn, rightTxn, comparison)}
            >
              Download Report
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Build and trigger download of the comparison report in the chosen format. */
function downloadReport(
  format: 'json' | 'csv',
  left: ComparisonTransaction,
  right: ComparisonTransaction,
  rows: { key: string; label: string; left: string; right: string; match: boolean }[],
): void {
  const ts = Date.now();
  if (format === 'json') {
    const report = {
      generatedAt: new Date().toISOString(),
      transactions: [left, right],
      comparison: rows.map((r) => ({
        field: r.key,
        label: r.label,
        left: r.left,
        right: r.right,
        match: r.match,
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    triggerDownload(blob, `comparison-report-${ts}.json`);
  } else {
    const header = ['Field', 'Label', 'Left Value', 'Right Value', 'Match'];
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = [
      header.map(escape).join(','),
      ...rows.map((r) =>
        [r.key, r.label, r.left, r.right, String(r.match)].map(escape).join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    triggerDownload(blob, `comparison-report-${ts}.csv`);
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Hook-less helper to keep the download function accessible inside the component. */
function useCallbackExport() {
  return React.useCallback(
    (
      format: 'json' | 'csv',
      left: ComparisonTransaction,
      right: ComparisonTransaction,
      rows: { key: string; label: string; left: string; right: string; match: boolean }[],
    ) => downloadReport(format, left, right, rows),
    [],
  );
}

export default TransactionComparison;
