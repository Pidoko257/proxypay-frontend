/**
 * UserActivityAuditLog — Issue #636
 *
 * Tracks and displays simulated user access events stored in localStorage.
 * Supports date-range / user filtering, configurable retention, and CSV export.
 */

import React, { useState, useEffect, useCallback } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

// ---------- types ----------

interface AuditLogEntry {
  id: string;
  user: string;
  action: string;
  transactionId: string;
  timestamp: string; // ISO 8601
}

type RetentionDays = 30 | 60 | 90 | 180;

// ---------- constants ----------

const AUDIT_LOG_KEY = 'proxypay-user-audit-log';
const AUDIT_USERNAME_KEY = 'proxypay-audit-username';

const RETENTION_OPTIONS: { value: RetentionDays; label: string }[] = [
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '180 days' },
];

const SIMULATED_ACTIONS = [
  'viewed',
  'exported',
  'filtered',
  'searched',
  'downloaded report',
];

const SIMULATED_TRANSACTION_IDS = [
  'TX-1048',
  'TX-1047',
  'TX-1046',
  'TX-1045',
  'TX-1044',
  'TX-1043',
];

const SIMULATED_USERS = [
  'alice',
  'bob',
  'carol',
  'david',
  'eve',
];

// ---------- helpers ----------

function generateId(): string {
  return Math.random().toString(36).substring(2, 13);
}

function loadLog(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    return raw ? (JSON.parse(raw) as AuditLogEntry[]) : [];
  } catch {
    return [];
  }
}

function saveLog(entries: AuditLogEntry[]): void {
  try {
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(entries));
  } catch {
    // storage unavailable — silently continue
  }
}

function loadAuditUsername(): string {
  try {
    return localStorage.getItem(AUDIT_USERNAME_KEY) ?? 'current-user';
  } catch {
    return 'current-user';
  }
}

function applyRetention(entries: AuditLogEntry[], days: RetentionDays): AuditLogEntry[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
}

function buildSeedEntries(): AuditLogEntry[] {
  const now = Date.now();
  const entries: AuditLogEntry[] = [];
  for (let i = 0; i < 8; i++) {
    const daysAgo = Math.floor(Math.random() * 25);
    const tsMs = now - daysAgo * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 8 * 3600 * 1000);
    entries.push({
      id: generateId(),
      user: SIMULATED_USERS[i % SIMULATED_USERS.length],
      action: SIMULATED_ACTIONS[i % SIMULATED_ACTIONS.length],
      transactionId: SIMULATED_TRANSACTION_IDS[i % SIMULATED_TRANSACTION_IDS.length],
      timestamp: new Date(tsMs).toISOString(),
    });
  }
  return entries;
}

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(entries: AuditLogEntry[]): string {
  const header = ['ID', 'User', 'Action', 'Transaction ID', 'Timestamp'];
  const rows = entries.map((e) =>
    [e.id, e.user, e.action, e.transactionId, e.timestamp]
      .map(escapeCsvField)
      .join(','),
  );
  return [header.join(','), ...rows].join('\n');
}

function downloadCsv(csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------- inner component (browser-only) ----------

function AuditLogContent(): React.JSX.Element {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [retention, setRetention] = useState<RetentionDays>(90);
  const [filterUser, setFilterUser] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [toast, setToast] = useState('');

  // Load or seed on mount, then add a "viewed" event for this session
  useEffect(() => {
    let existing = loadLog();
    if (existing.length === 0) {
      existing = buildSeedEntries();
    }
    const currentUser = loadAuditUsername();
    const sessionEntry: AuditLogEntry = {
      id: generateId(),
      user: currentUser,
      action: 'viewed',
      transactionId: 'N/A',
      timestamp: new Date().toISOString(),
    };
    const withSession = [...existing, sessionEntry];
    saveLog(withSession);
    setEntries(withSession);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, []);

  // Apply retention window whenever it changes
  const retainedEntries = applyRetention(entries, retention);

  // Apply user and date filters
  const filteredEntries = retainedEntries.filter((e) => {
    if (filterUser && !e.user.toLowerCase().includes(filterUser.toLowerCase())) {
      return false;
    }
    if (filterFrom) {
      const fromMs = new Date(filterFrom).getTime();
      if (new Date(e.timestamp).getTime() < fromMs) return false;
    }
    if (filterTo) {
      // Include the full "to" day by advancing to end-of-day
      const toMs = new Date(filterTo).getTime() + 24 * 60 * 60 * 1000 - 1;
      if (new Date(e.timestamp).getTime() > toMs) return false;
    }
    return true;
  });

  // Sort newest-first
  const sortedEntries = [...filteredEntries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const handleExport = useCallback(() => {
    if (sortedEntries.length === 0) {
      showToast('No entries to export.');
      return;
    }
    const csv = buildCsv(sortedEntries);
    downloadCsv(csv);
    showToast(`Exported ${sortedEntries.length} entries as CSV.`);
  }, [sortedEntries, showToast]);

  // Collect unique users for filter suggestions
  const uniqueUsers = [...new Set(retainedEntries.map((e) => e.user))].sort();

  return (
    <div className="audit-log-container" aria-labelledby="audit-log-heading">
      {toast && (
        <div className="audit-log-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      <h1 id="audit-log-heading" className="audit-log-heading">
        User Activity Audit Log
      </h1>
      <p className="audit-log-intro">
        Simulated access events for this session and prior activity. Use the
        filters below to narrow results, then export as CSV.
      </p>

      {/* Controls */}
      <div className="audit-log-controls">
        <div className="audit-log-control-group">
          <label htmlFor="al-retention" className="audit-log-label">
            Retention period
          </label>
          <select
            id="al-retention"
            className="audit-log-select"
            value={retention}
            onChange={(e) => setRetention(Number(e.target.value) as RetentionDays)}
            aria-label="Retention period"
          >
            {RETENTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="audit-log-control-group">
          <label htmlFor="al-user" className="audit-log-label">
            Filter by user
          </label>
          <input
            id="al-user"
            className="audit-log-input"
            type="text"
            list="al-user-list"
            placeholder="Username…"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            aria-label="Filter by username"
          />
          <datalist id="al-user-list">
            {uniqueUsers.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>

        <div className="audit-log-control-group">
          <label htmlFor="al-from" className="audit-log-label">
            From date
          </label>
          <input
            id="al-from"
            className="audit-log-input"
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            aria-label="Filter from date"
          />
        </div>

        <div className="audit-log-control-group">
          <label htmlFor="al-to" className="audit-log-label">
            To date
          </label>
          <input
            id="al-to"
            className="audit-log-input"
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            aria-label="Filter to date"
          />
        </div>

        <button
          className="audit-log-btn audit-log-btn--export"
          onClick={handleExport}
          aria-label="Export filtered audit log as CSV"
        >
          ⬇ Export CSV
        </button>
      </div>

      {/* Results summary */}
      <p className="audit-log-summary">
        Showing <strong>{sortedEntries.length}</strong> of{' '}
        <strong>{retainedEntries.length}</strong> entries within the{' '}
        {retention}-day retention window.
      </p>

      {/* Table */}
      <div className="audit-log-table-wrapper">
        <table className="audit-log-table">
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Action</th>
              <th scope="col">Transaction ID</th>
              <th scope="col">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.length === 0 ? (
              <tr>
                <td colSpan={4} className="audit-log-empty">
                  No audit entries match the current filters.
                </td>
              </tr>
            ) : (
              sortedEntries.map((entry) => (
                <tr key={entry.id} className="audit-log-row">
                  <td className="audit-log-cell audit-log-cell--user">
                    {entry.user}
                  </td>
                  <td className="audit-log-cell audit-log-cell--action">
                    {entry.action}
                  </td>
                  <td className="audit-log-cell audit-log-cell--txid">
                    <code>{entry.transactionId}</code>
                  </td>
                  <td className="audit-log-cell audit-log-cell--timestamp">
                    {formatTimestamp(entry.timestamp)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- exported default ----------

export default function UserActivityAuditLog(): React.JSX.Element {
  return (
    <BrowserOnly
      fallback={
        <div className="audit-log-container audit-log-loading">
          Loading audit log…
        </div>
      }
    >
      {() => <AuditLogContent />}
    </BrowserOnly>
  );
}
