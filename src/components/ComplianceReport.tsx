import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'proxypay_compliance_config';
const brand = '#2e8555';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Transaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'Completed' | 'Pending' | 'Failed' | 'Reversed';
  counterparty: string;
}

interface SecurityControl {
  id: string;
  name: string;
  passed: boolean;
}

interface CustomSection {
  id: string;
  title: string;
  content: string;
}

interface ReportConfig {
  orgName: string;
  dateFrom: string;
  dateTo: string;
  retentionNotes: string;
  controls: SecurityControl[];
  customSections: CustomSection[];
}

// ─── Sample Data ─────────────────────────────────────────────────────────────

const SAMPLE_TRANSACTIONS: Transaction[] = [
  { id: 'TXN-001', date: '2026-10-01', amount: 250.0, currency: 'USD', status: 'Completed', counterparty: 'Alice Mensah' },
  { id: 'TXN-002', date: '2026-10-02', amount: 1200.5, currency: 'KES', status: 'Completed', counterparty: 'Bob Osei' },
  { id: 'TXN-003', date: '2026-10-03', amount: 75.0, currency: 'USD', status: 'Failed', counterparty: 'Carol Nkosi' },
  { id: 'TXN-004', date: '2026-10-04', amount: 500.0, currency: 'GHS', status: 'Completed', counterparty: 'David Atta' },
  { id: 'TXN-005', date: '2026-10-05', amount: 3200.0, currency: 'NGN', status: 'Completed', counterparty: 'Eve Diallo' },
  { id: 'TXN-006', date: '2026-10-07', amount: 150.0, currency: 'USD', status: 'Reversed', counterparty: 'Frank Kamau' },
  { id: 'TXN-007', date: '2026-10-08', amount: 480.0, currency: 'KES', status: 'Completed', counterparty: 'Grace Owusu' },
  { id: 'TXN-008', date: '2026-10-10', amount: 92.5, currency: 'USD', status: 'Pending', counterparty: 'Henry Mwangi' },
  { id: 'TXN-009', date: '2026-10-12', amount: 2100.0, currency: 'GHS', status: 'Completed', counterparty: 'Iris Abiodun' },
  { id: 'TXN-010', date: '2026-10-15', amount: 375.0, currency: 'USD', status: 'Completed', counterparty: 'James Okafor' },
];

const DEFAULT_CONTROLS: SecurityControl[] = [
  { id: 'ctrl-1', name: 'Multi-Factor Authentication enforced', passed: true },
  { id: 'ctrl-2', name: 'Data encrypted at rest (AES-256)', passed: true },
  { id: 'ctrl-3', name: 'Data encrypted in transit (TLS 1.3)', passed: true },
  { id: 'ctrl-4', name: 'Access logs retained ≥ 12 months', passed: true },
  { id: 'ctrl-5', name: 'Quarterly penetration testing completed', passed: false },
  { id: 'ctrl-6', name: 'AML transaction monitoring active', passed: true },
  { id: 'ctrl-7', name: 'KYC verification for all users', passed: true },
  { id: 'ctrl-8', name: 'Incident response plan documented', passed: false },
];

const DEFAULT_CONFIG: ReportConfig = {
  orgName: '',
  dateFrom: '',
  dateTo: '',
  retentionNotes: 'Transaction records are retained for a minimum of 7 years in compliance with financial regulations. Personal data is retained for 5 years after account closure. Logs are archived after 12 months.',
  controls: DEFAULT_CONTROLS,
  customSections: [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadConfig(): ReportConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG, controls: DEFAULT_CONTROLS.map((c) => ({ ...c })) };
    const parsed = JSON.parse(raw) as Partial<ReportConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      controls: parsed.controls ?? DEFAULT_CONTROLS.map((c) => ({ ...c })),
      customSections: parsed.customSections ?? [],
    };
  } catch {
    return { ...DEFAULT_CONFIG, controls: DEFAULT_CONTROLS.map((c) => ({ ...c })) };
  }
}

function statusColor(status: Transaction['status']): string {
  switch (status) {
    case 'Completed': return '#27ae60';
    case 'Pending': return '#f39c12';
    case 'Failed': return '#e74c3c';
    case 'Reversed': return '#8e44ad';
  }
}

function buildReportHTML(config: ReportConfig, reportId: string): string {
  const passCount = config.controls.filter((c) => c.passed).length;
  const totalCount = config.controls.length;

  const txRows = SAMPLE_TRANSACTIONS.map((tx) => `
    <tr>
      <td>${tx.id}</td>
      <td>${tx.date}</td>
      <td style="text-align:right">${tx.amount.toFixed(2)}</td>
      <td>${tx.currency}</td>
      <td><span style="color:${statusColor(tx.status)};font-weight:700">${tx.status}</span></td>
      <td>${tx.counterparty}</td>
    </tr>`).join('');

  const controlRows = config.controls.map((c) => `
    <tr>
      <td>${c.name}</td>
      <td style="text-align:center">
        <span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700;color:#fff;background:${c.passed ? '#27ae60' : '#e74c3c'}">
          ${c.passed ? 'PASS' : 'FAIL'}
        </span>
      </td>
    </tr>`).join('');

  const customHtml = config.customSections.map((s) => `
    <div class="section">
      <h2>${s.title || 'Untitled Section'}</h2>
      <p style="white-space:pre-wrap">${s.content || '(No content)'}</p>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>ProxyPay Compliance Report — ${reportId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #1c1e21; background: #fff; font-size: 14px; line-height: 1.5; }
    .page { max-width: 900px; margin: 0 auto; padding: 40px 32px; }
    .print-btn { display: block; margin: 0 auto 24px; padding: 10px 24px; background: #2e8555; color: #fff; border: none; border-radius: 6px; font-size: 14px; font-weight: 700; cursor: pointer; }
    @media print { .print-btn { display: none; } }
    header { border-bottom: 3px solid #2e8555; padding-bottom: 20px; margin-bottom: 32px; }
    header h1 { font-size: 26px; color: #2e8555; margin-bottom: 8px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 13px; margin-top: 12px; }
    .meta-grid span { color: #666; }
    .meta-grid strong { color: #1c1e21; }
    .section { margin-bottom: 36px; }
    .section h2 { font-size: 16px; color: #2e8555; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 8px 10px; background: #f7f9fc; color: #555; font-weight: 700; border-bottom: 2px solid #dde1e7; font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em; }
    td { padding: 8px 10px; border-bottom: 1px solid #f2f4f8; }
    tr:last-child td { border-bottom: none; }
    .summary-bar { display: flex; gap: 20px; margin-bottom: 16px; }
    .summary-chip { padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; }
    .policy-text { background: #f9fafb; border-left: 4px solid #2e8555; padding: 14px 16px; border-radius: 0 6px 6px 0; font-size: 13px; color: #333; white-space: pre-wrap; line-height: 1.6; }
    footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 16px; font-size: 12px; color: #aaa; text-align: center; }
  </style>
</head>
<body>
  <div class="page">
    <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>

    <header>
      <h1>ProxyPay Compliance Report</h1>
      <div class="meta-grid">
        <div><span>Organization: </span><strong>${config.orgName || 'N/A'}</strong></div>
        <div><span>Report ID: </span><strong>${reportId}</strong></div>
        <div><span>Period: </span><strong>${config.dateFrom || 'N/A'} — ${config.dateTo || 'N/A'}</strong></div>
        <div><span>Generated: </span><strong>${new Date().toLocaleString()}</strong></div>
      </div>
    </header>

    <div class="section">
      <h2>Transaction Audit Trail</h2>
      <table>
        <thead><tr><th>ID</th><th>Date</th><th style="text-align:right">Amount</th><th>Currency</th><th>Status</th><th>Counterparty</th></tr></thead>
        <tbody>${txRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Data Retention Policies</h2>
      <div class="policy-text">${config.retentionNotes || '(No retention policy notes.)'}</div>
    </div>

    <div class="section">
      <h2>Security Controls Summary</h2>
      <div class="summary-bar">
        <span class="summary-chip" style="background:#eafaf1;color:#27ae60">${passCount} Passed</span>
        <span class="summary-chip" style="background:#fdedec;color:#e74c3c">${totalCount - passCount} Failed</span>
        <span class="summary-chip" style="background:#f7f9fc;color:#555">${totalCount} Total</span>
      </div>
      <table>
        <thead><tr><th>Control</th><th style="text-align:center">Status</th></tr></thead>
        <tbody>${controlRows}</tbody>
      </table>
    </div>

    ${customHtml}

    <footer>
      ProxyPay Compliance Report · Generated ${new Date().toISOString()} · Report ID ${reportId}
    </footer>
  </div>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ComplianceReport(): JSX.Element {
  const [config, setConfig] = useState<ReportConfig>(DEFAULT_CONFIG);
  const [reportId] = useState<string>(`RPT-${Date.now()}`);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  function persistConfig(updated: ReportConfig): void {
    setConfig(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function handleOrgChange(val: string) {
    persistConfig({ ...config, orgName: val });
  }

  function handleDateFromChange(val: string) {
    persistConfig({ ...config, dateFrom: val });
  }

  function handleDateToChange(val: string) {
    persistConfig({ ...config, dateTo: val });
  }

  function handleRetentionChange(val: string) {
    persistConfig({ ...config, retentionNotes: val });
  }

  function handleControlToggle(id: string) {
    const updated = config.controls.map((c) =>
      c.id === id ? { ...c, passed: !c.passed } : c
    );
    persistConfig({ ...config, controls: updated });
  }

  function handleAddSection() {
    const section: CustomSection = {
      id: `sec-${Date.now()}`,
      title: '',
      content: '',
    };
    persistConfig({ ...config, customSections: [...config.customSections, section] });
  }

  function handleSectionChange(id: string, field: 'title' | 'content', val: string) {
    const updated = config.customSections.map((s) =>
      s.id === id ? { ...s, [field]: val } : s
    );
    persistConfig({ ...config, customSections: updated });
  }

  function handleDeleteSection(id: string) {
    persistConfig({ ...config, customSections: config.customSections.filter((s) => s.id !== id) });
  }

  function handleGenerate() {
    const html = buildReportHTML(config, reportId);
    const win = window.open('', '_blank');
    if (!win) {
      alert('Pop-up blocked. Please allow pop-ups for this site and try again.');
      return;
    }
    win.document.write(html);
    win.document.close();
  }

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSaveMsg('Configuration saved!');
    setTimeout(() => setSaveMsg(''), 3000);
  }

  const passCount = config.controls.filter((c) => c.passed).length;

  return (
    <>
      <style>{`
        .cr-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          max-width: 880px;
          margin: 0 auto;
          padding: 24px 16px;
          color: #1c1e21;
        }
        .cr-container h2 { color: ${brand}; margin-bottom: 4px; }
        .cr-container p.subtitle { color: #555; margin-top: 0; margin-bottom: 28px; }
        .cr-card {
          border: 1px solid #dde1e7;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
          background: #fff;
        }
        .cr-card h3 {
          margin-top: 0;
          color: ${brand};
          font-size: 1rem;
          border-bottom: 1px solid #eee;
          padding-bottom: 8px;
          margin-bottom: 18px;
        }
        .cr-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 580px) { .cr-grid { grid-template-columns: 1fr; } }
        .cr-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .cr-field label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #444;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .cr-field input, .cr-field textarea {
          padding: 8px 10px;
          border: 1px solid #cdd1d9;
          border-radius: 5px;
          font-size: 0.9rem;
          background: #fafbfc;
          transition: border-color 0.15s;
          font-family: inherit;
        }
        .cr-field input:focus, .cr-field textarea:focus {
          outline: none;
          border-color: ${brand};
          background: #fff;
        }
        .cr-field textarea { resize: vertical; min-height: 100px; }
        .cr-report-id {
          font-size: 0.8rem;
          color: #888;
          margin-top: 6px;
        }
        .cr-report-id code {
          background: #f4f6fa;
          border-radius: 3px;
          padding: 1px 5px;
          font-size: 0.8rem;
          color: ${brand};
          font-weight: 600;
        }

        .cr-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; overflow-x: auto; display: block; }
        .cr-table th {
          text-align: left;
          padding: 8px 10px;
          background: #f7f9fc;
          color: #555;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 2px solid #eee;
          white-space: nowrap;
        }
        .cr-table td { padding: 8px 10px; border-bottom: 1px solid #f2f4f8; vertical-align: middle; }
        .cr-table tr:last-child td { border-bottom: none; }
        .cr-status {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #fff;
        }

        .cr-control-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #f4f6fa;
          gap: 12px;
        }
        .cr-control-row:last-child { border-bottom: none; }
        .cr-control-name { font-size: 0.9rem; flex: 1; }
        .cr-toggle {
          display: flex;
          gap: 6px;
        }
        .cr-toggle-btn {
          padding: 4px 12px;
          border-radius: 20px;
          border: 1.5px solid transparent;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .cr-toggle-btn.pass { background: #eafaf1; color: #27ae60; border-color: #b7e4c7; }
        .cr-toggle-btn.fail { background: #fdedec; color: #e74c3c; border-color: #f5b7b1; }
        .cr-toggle-btn.pass.active { background: #27ae60; color: #fff; border-color: #27ae60; }
        .cr-toggle-btn.fail.active { background: #e74c3c; color: #fff; border-color: #e74c3c; }

        .cr-controls-summary {
          display: flex;
          gap: 12px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .cr-summary-chip {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .cr-custom-section {
          border: 1px solid #e8ecf0;
          border-radius: 6px;
          padding: 14px;
          margin-bottom: 12px;
          background: #fafbfc;
        }
        .cr-custom-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          gap: 8px;
        }

        .cr-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          flex-wrap: wrap;
          align-items: center;
        }
        .cr-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 700;
          transition: opacity 0.15s, transform 0.1s;
        }
        .cr-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .cr-btn:active { transform: translateY(0); }
        .cr-btn-primary { background: ${brand}; color: #fff; }
        .cr-btn-secondary { background: #e8f5ee; color: ${brand}; border: 1px solid ${brand}; }
        .cr-btn-add { background: #f0f4f8; color: #444; border: 1px solid #cdd1d9; }
        .cr-btn-danger { background: #fff0f0; color: #c0392b; border: 1px solid #e8a0a0; }
        .cr-btn-generate {
          background: ${brand};
          color: #fff;
          font-size: 1rem;
          padding: 11px 28px;
        }
        .cr-msg { font-size: 0.85rem; color: ${brand}; font-weight: 600; }
      `}</style>

      <div className="cr-container">
        <h2>Compliance Report Generator</h2>
        <p className="subtitle">
          Configure each section below, then click Generate Report to open a print-ready HTML
          document in a new tab.
        </p>

        {/* ── Section 1: Report Header ── */}
        <div className="cr-card">
          <h3>1. Report Header</h3>
          <div className="cr-grid">
            <div className="cr-field">
              <label>Organization Name</label>
              <input
                type="text"
                placeholder="e.g. Acme Financial Services"
                value={config.orgName}
                onChange={(e) => handleOrgChange(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div className="cr-report-id">
                Report ID: <code>{reportId}</code> (auto-generated)
              </div>
            </div>
            <div className="cr-field">
              <label>Period From</label>
              <input
                type="date"
                value={config.dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
              />
            </div>
            <div className="cr-field">
              <label>Period To</label>
              <input
                type="date"
                value={config.dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Section 2: Transaction Audit Trail ── */}
        <div className="cr-card">
          <h3>2. Transaction Audit Trail (10 sample transactions)</h3>
          <table className="cr-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Status</th>
                <th>Counterparty</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_TRANSACTIONS.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.id}</td>
                  <td>{tx.date}</td>
                  <td style={{ textAlign: 'right' }}>{tx.amount.toFixed(2)}</td>
                  <td>{tx.currency}</td>
                  <td>
                    <span
                      className="cr-status"
                      style={{ background: statusColor(tx.status) }}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td>{tx.counterparty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Section 3: Data Retention Policies ── */}
        <div className="cr-card">
          <h3>3. Data Retention Policies</h3>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 10 }}>
            Edit the notes below to customize your organization's data retention policy statement.
          </p>
          <div className="cr-field">
            <label>Retention Policy Notes</label>
            <textarea
              rows={5}
              value={config.retentionNotes}
              onChange={(e) => handleRetentionChange(e.target.value)}
            />
          </div>
        </div>

        {/* ── Section 4: Security Controls ── */}
        <div className="cr-card">
          <h3>4. Security Controls Summary</h3>
          <div className="cr-controls-summary">
            <span className="cr-summary-chip" style={{ background: '#eafaf1', color: '#27ae60' }}>
              ✓ {passCount} Passed
            </span>
            <span className="cr-summary-chip" style={{ background: '#fdedec', color: '#e74c3c' }}>
              ✕ {config.controls.length - passCount} Failed
            </span>
          </div>
          {config.controls.map((ctrl) => (
            <div key={ctrl.id} className="cr-control-row">
              <span className="cr-control-name">{ctrl.name}</span>
              <div className="cr-toggle">
                <button
                  className={`cr-toggle-btn pass${ctrl.passed ? ' active' : ''}`}
                  onClick={() => !ctrl.passed && handleControlToggle(ctrl.id)}
                >
                  PASS
                </button>
                <button
                  className={`cr-toggle-btn fail${!ctrl.passed ? ' active' : ''}`}
                  onClick={() => ctrl.passed && handleControlToggle(ctrl.id)}
                >
                  FAIL
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Section 5: Custom Sections ── */}
        <div className="cr-card">
          <h3>5. Custom Sections</h3>
          {config.customSections.length === 0 && (
            <p style={{ fontSize: '0.85rem', color: '#999', marginBottom: 12 }}>
              No custom sections yet. Click "Add Section" to include additional narrative content.
            </p>
          )}
          {config.customSections.map((sec, idx) => (
            <div key={sec.id} className="cr-custom-section">
              <div className="cr-custom-section-header">
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#555' }}>
                  Section {idx + 1}
                </span>
                <button
                  className="cr-btn cr-btn-danger"
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                  onClick={() => handleDeleteSection(sec.id)}
                >
                  Remove
                </button>
              </div>
              <div className="cr-field" style={{ marginBottom: 10 }}>
                <label>Section Title</label>
                <input
                  type="text"
                  placeholder="e.g. Regulatory Disclosures"
                  value={sec.title}
                  onChange={(e) => handleSectionChange(sec.id, 'title', e.target.value)}
                />
              </div>
              <div className="cr-field">
                <label>Content</label>
                <textarea
                  rows={4}
                  placeholder="Enter section content..."
                  value={sec.content}
                  onChange={(e) => handleSectionChange(sec.id, 'content', e.target.value)}
                />
              </div>
            </div>
          ))}
          <button className="cr-btn cr-btn-add" onClick={handleAddSection}>
            + Add Section
          </button>
        </div>

        {/* ── Generate & Save ── */}
        <div className="cr-actions">
          <button className="cr-btn cr-btn-generate" onClick={handleGenerate}>
            📄 Generate Report
          </button>
          <button className="cr-btn cr-btn-secondary" onClick={handleSave}>
            💾 Save Configuration
          </button>
          {saveMsg && <span className="cr-msg">{saveMsg}</span>}
        </div>
      </div>
    </>
  );
}
