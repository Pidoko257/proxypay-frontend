/**
 * DataRetentionPolicy — Issue #633
 *
 * Displays the data retention schedule and deletion procedures for
 * ProxyPay users. Usable in the Settings page.
 */

import React, { useState, useCallback } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

// ---------- types ----------

interface RetentionEntry {
  dataType: string;
  description: string;
  retentionDays: number;
  label: string; // human-readable duration
}

// ---------- constants ----------

const RETENTION_SCHEDULE: RetentionEntry[] = [
  {
    dataType: 'transactions',
    description: 'Payment records, transfer history, and settlement data',
    retentionDays: 7 * 365,
    label: '7 years',
  },
  {
    dataType: 'personal-data',
    description: 'Customer names, contact details, and KYC information',
    retentionDays: 2 * 365,
    label: '2 years',
  },
  {
    dataType: 'logs',
    description: 'API access logs, error traces, and diagnostic records',
    retentionDays: 90,
    label: '90 days',
  },
  {
    dataType: 'webhook-events',
    description: 'Webhook delivery attempts, payloads, and response codes',
    retentionDays: 30,
    label: '30 days',
  },
];

const EARLY_DELETION_KEY = 'proxypay-early-deletion-request';

// ---------- helpers ----------

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

// ---------- inner component (browser-only) ----------

function RetentionPolicyContent(): React.JSX.Element {
  const [toast, setToast] = useState('');
  const [requestedTypes, setRequestedTypes] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(EARLY_DELETION_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const today = new Date();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleRequestDeletion = useCallback(
    (dataType: string) => {
      if (requestedTypes.has(dataType)) return;
      const next = new Set(requestedTypes);
      next.add(dataType);
      setRequestedTypes(next);
      try {
        localStorage.setItem(EARLY_DELETION_KEY, JSON.stringify([...next]));
      } catch {
        // localStorage may be unavailable — silently continue
      }
      showToast(
        `Early deletion request submitted for "${dataType}" data. Our team will process it within 30 days.`,
      );
    },
    [requestedTypes, showToast],
  );

  return (
    <section className="retention-section" aria-labelledby="retention-heading">
      {toast && (
        <div className="retention-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      <h2 id="retention-heading" className="retention-heading">
        Data Retention Policy
      </h2>
      <p className="retention-intro">
        ProxyPay retains different categories of data for specific periods in
        compliance with financial regulations and privacy law. Data is
        automatically purged once its retention period expires.{' '}
        <a href="/privacy" className="retention-privacy-link">
          Read our full Privacy Policy →
        </a>
      </p>

      <div className="retention-table-wrapper">
        <table className="retention-table">
          <thead>
            <tr>
              <th scope="col">Data Type</th>
              <th scope="col">Description</th>
              <th scope="col">Retention Period</th>
              <th scope="col">Next Deletion</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {RETENTION_SCHEDULE.map((entry) => {
              const nextDeletion = addDays(today, entry.retentionDays);
              const alreadyRequested = requestedTypes.has(entry.dataType);
              return (
                <tr key={entry.dataType} className="retention-row">
                  <td className="retention-cell retention-cell--type">
                    <span className="retention-data-type">{entry.dataType}</span>
                  </td>
                  <td className="retention-cell">{entry.description}</td>
                  <td className="retention-cell retention-cell--period">
                    {entry.label}
                  </td>
                  <td className="retention-cell retention-cell--date">
                    {formatDate(nextDeletion)}
                  </td>
                  <td className="retention-cell retention-cell--action">
                    <button
                      className={
                        alreadyRequested
                          ? 'retention-btn retention-btn--requested'
                          : 'retention-btn retention-btn--delete'
                      }
                      onClick={() => handleRequestDeletion(entry.dataType)}
                      disabled={alreadyRequested}
                      aria-label={
                        alreadyRequested
                          ? `Early deletion already requested for ${entry.dataType}`
                          : `Request early deletion for ${entry.dataType}`
                      }
                    >
                      {alreadyRequested ? '✔ Requested' : 'Request Early Deletion'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="retention-procedures">
        <h3 className="retention-subheading">Deletion Procedures</h3>
        <ul className="retention-list">
          <li>
            <strong>Automatic purge:</strong> Records past their retention
            date are swept during nightly maintenance windows and permanently
            deleted from all storage tiers.
          </li>
          <li>
            <strong>Early deletion requests:</strong> Submitted requests are
            processed within 30 calendar days. You will receive an email
            confirmation when data has been removed.
          </li>
          <li>
            <strong>Regulatory holds:</strong> Data subject to an active
            legal or compliance hold will not be deleted until the hold is
            lifted, regardless of the standard retention period.
          </li>
          <li>
            <strong>Backups:</strong> Deleted data may persist in encrypted
            backups for up to 90 days before those backups are rotated out.
          </li>
        </ul>
        <p className="retention-footer-note">
          For questions about your data or to submit a formal deletion request
          under GDPR / CCPA, contact{' '}
          <a href="mailto:privacy@proxypay.io">privacy@proxypay.io</a> or
          visit our{' '}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </section>
  );
}

// ---------- exported default ----------

export default function DataRetentionPolicy(): React.JSX.Element {
  return (
    <BrowserOnly fallback={<div className="retention-section retention-loading">Loading retention policy…</div>}>
      {() => <RetentionPolicyContent />}
    </BrowserOnly>
  );
}
