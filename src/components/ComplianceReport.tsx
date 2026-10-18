import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  resource: string;
  status: 'success' | 'failure' | 'pending';
  details?: string;
}

export interface RetentionPolicy {
  dataCategory: string;
  retentionPeriod: string;
  legalBasis: string;
  deletionMethod: string;
}

export interface SecurityControl {
  control: string;
  status: 'implemented' | 'partial' | 'planned';
  description: string;
  lastReviewed: string;
}

export interface CustomSection {
  title: string;
  content: string;
}

export interface ComplianceReportProps {
  customSections?: CustomSection[];
  reportTitle?: string;
  organizationName?: string;
}

// ─── Sample / mock data ───────────────────────────────────────────────────────

const SAMPLE_AUDIT_TRAIL: AuditEntry[] = [
  {
    id: 'TXN-20261001-0001',
    timestamp: '2026-10-01T08:14:22Z',
    action: 'Mobile Money → Stellar deposit',
    actor: 'user_4821',
    resource: 'account/GC7A...K9RM',
    status: 'success',
    details: '250 USDC credited via MTN MoMo',
  },
  {
    id: 'TXN-20261002-0047',
    timestamp: '2026-10-02T11:33:05Z',
    action: 'Stellar → Mobile Money withdrawal',
    actor: 'user_1193',
    resource: 'account/GDXQ...P2LL',
    status: 'success',
    details: '75 USDC converted to KES 9,750',
  },
  {
    id: 'TXN-20261003-0112',
    timestamp: '2026-10-03T14:07:49Z',
    action: 'KYC verification',
    actor: 'compliance_bot',
    resource: 'user/8821',
    status: 'success',
    details: 'ID document verified (Tier 2)',
  },
  {
    id: 'TXN-20261004-0203',
    timestamp: '2026-10-04T09:55:30Z',
    action: 'Mobile Money → Stellar deposit',
    actor: 'user_7654',
    resource: 'account/GBTZ...M8QP',
    status: 'failure',
    details: 'Provider timeout — transaction rolled back',
  },
  {
    id: 'TXN-20261005-0389',
    timestamp: '2026-10-05T16:22:11Z',
    action: 'Admin: threshold override',
    actor: 'admin_2',
    resource: 'system/limits',
    status: 'success',
    details: 'Daily limit increased to $5,000 for business tier',
  },
];

const SAMPLE_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    dataCategory: 'Transaction Records',
    retentionPeriod: '7 years',
    legalBasis: 'AML/KYC regulatory requirement',
    deletionMethod: 'Cryptographic erasure',
  },
  {
    dataCategory: 'User Identity (KYC)',
    retentionPeriod: '5 years post-offboarding',
    legalBasis: 'GDPR Art. 17 & financial regulations',
    deletionMethod: 'Secure wipe + audit log',
  },
  {
    dataCategory: 'API Access Logs',
    retentionPeriod: '2 years',
    legalBasis: 'Operational security & incident response',
    deletionMethod: 'Automated log rotation',
  },
  {
    dataCategory: 'Session / Auth Tokens',
    retentionPeriod: '90 days',
    legalBasis: 'Fraud detection',
    deletionMethod: 'Automated expiry',
  },
];

const SAMPLE_SECURITY_CONTROLS: SecurityControl[] = [
  {
    control: 'Data Encryption at Rest',
    status: 'implemented',
    description: 'AES-256 encryption for all PII and financial data stored in the database.',
    lastReviewed: '2026-09-01',
  },
  {
    control: 'TLS 1.3 in Transit',
    status: 'implemented',
    description: 'All API endpoints enforce TLS 1.3; older protocols rejected.',
    lastReviewed: '2026-09-01',
  },
  {
    control: 'Multi-Factor Authentication',
    status: 'implemented',
    description: 'TOTP / SMS MFA enforced for all admin and partner accounts.',
    lastReviewed: '2026-09-15',
  },
  {
    control: 'Role-Based Access Control',
    status: 'implemented',
    description: 'Principle of least privilege enforced via RBAC on all resources.',
    lastReviewed: '2026-10-01',
  },
  {
    control: 'Penetration Testing',
    status: 'partial',
    description: 'Last pentest completed Q2 2026. Q4 2026 engagement scheduled.',
    lastReviewed: '2026-06-30',
  },
  {
    control: 'Bug Bounty Programme',
    status: 'planned',
    description: 'Public bug bounty via HackerOne — launch planned Q1 2027.',
    lastReviewed: '2026-10-10',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }): React.JSX.Element {
  const map: Record<string, { bg: string; color: string }> = {
    success:     { bg: '#166534', color: '#fff' },
    implemented: { bg: '#166534', color: '#fff' },
    failure:     { bg: '#991b1b', color: '#fff' },
    pending:     { bg: '#92400e', color: '#fff' },
    partial:     { bg: '#92400e', color: '#fff' },
    planned:     { bg: '#1d4ed8', color: '#fff' },
  };
  const style = map[status] ?? { bg: '#64748b', color: '#fff' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'capitalize',
        background: style.bg,
        color: style.color,
      }}
    >
      {status}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ComplianceReport({
  customSections: initialCustomSections,
  reportTitle = 'Compliance Report',
  organizationName = 'ProxyPay',
}: ComplianceReportProps): React.JSX.Element {
  const [customSections, setCustomSections] = useState<CustomSection[]>(
    initialCustomSections ?? [],
  );
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionContent, setNewSectionContent] = useState('');
  const [addingSection, setAddingSection] = useState(false);

  const generatedAt = new Date().toLocaleString();

  function addSection(): void {
    if (!newSectionTitle.trim()) return;
    setCustomSections((prev) => [
      ...prev,
      { title: newSectionTitle.trim(), content: newSectionContent.trim() },
    ]);
    setNewSectionTitle('');
    setNewSectionContent('');
    setAddingSection(false);
  }

  function removeSection(index: number): void {
    setCustomSections((prev) => prev.filter((_, i) => i !== index));
  }

  function handlePrint(): void {
    window.print();
  }

  // ── Shared table styles ──────────────────────────────────────────────────

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
    marginBottom: '1.5rem',
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '8px 10px',
    borderBottom: '2px solid var(--ifm-color-emphasis-300)',
    fontWeight: 600,
    fontSize: 12,
    whiteSpace: 'nowrap',
    background: 'var(--ifm-color-emphasis-100)',
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px 10px',
    borderBottom: '1px solid var(--ifm-color-emphasis-200)',
    verticalAlign: 'top',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '2rem',
    pageBreakInside: 'avoid',
  };

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 700,
    borderBottom: '2px solid var(--ifm-color-primary)',
    paddingBottom: 4,
    marginBottom: '0.75rem',
    color: 'var(--ifm-color-primary)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 10px',
    borderRadius: 4,
    border: '1px solid var(--ifm-color-emphasis-400)',
    fontSize: 13,
    marginBottom: 8,
    background: 'var(--ifm-background-color)',
    color: 'var(--ifm-font-color-base)',
    boxSizing: 'border-box',
  };

  return (
    <div
      id="compliance-report"
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '2rem 1.5rem',
        fontFamily: 'var(--ifm-font-family-base)',
      }}
    >
      {/* ── Print-only header: hidden on screen ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          #compliance-report { padding: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-before: always; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>

      {/* ── Report header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>{reportTitle}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ifm-color-emphasis-600)' }}>
            {organizationName} &nbsp;·&nbsp; Generated: {generatedAt}
          </p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 8 }}>
          <button
            className="button button--primary"
            style={{ fontSize: 13 }}
            onClick={handlePrint}
            aria-label="Print or save compliance report as PDF"
          >
            🖨 Print / Save as PDF
          </button>
          <button
            className="button button--secondary"
            style={{ fontSize: 13 }}
            onClick={() => setAddingSection(true)}
          >
            + Add Custom Section
          </button>
        </div>
      </div>

      {/* ── Add custom section form ── */}
      {addingSection && (
        <div
          className="no-print"
          style={{
            border: '1px solid var(--ifm-color-emphasis-300)',
            borderRadius: 8,
            padding: '1rem',
            marginBottom: '1.5rem',
            background: 'var(--ifm-background-surface-color)',
          }}
        >
          <h4 style={{ marginTop: 0 }}>New Custom Section</h4>
          <input
            style={inputStyle}
            type="text"
            placeholder="Section title *"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            aria-label="Custom section title"
          />
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            placeholder="Section content"
            value={newSectionContent}
            onChange={(e) => setNewSectionContent(e.target.value)}
            aria-label="Custom section content"
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="button button--primary" style={{ fontSize: 12 }} onClick={addSection}>
              Add Section
            </button>
            <button
              className="button button--secondary"
              style={{ fontSize: 12 }}
              onClick={() => setAddingSection(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          Section 1: Transaction Audit Trail
          ════════════════════════════════════════════ */}
      <section style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>1. Transaction Audit Trail</h2>
        <p style={{ fontSize: 13, marginTop: 0 }}>
          A complete record of significant operations within the reporting period.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle} aria-label="Transaction audit trail">
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Timestamp (UTC)</th>
                <th style={thStyle}>Action</th>
                <th style={thStyle}>Actor</th>
                <th style={thStyle}>Resource</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Details</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_AUDIT_TRAIL.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>{entry.id}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: 11 }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td style={tdStyle}>{entry.action}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>{entry.actor}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>{entry.resource}</td>
                  <td style={tdStyle}>
                    <StatusBadge status={entry.status} />
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          Section 2: Data Retention Policies
          ════════════════════════════════════════════ */}
      <section style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>2. Data Retention Policies</h2>
        <p style={{ fontSize: 13, marginTop: 0 }}>
          Policies governing how long each category of data is stored and how it is disposed of.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle} aria-label="Data retention policies">
            <thead>
              <tr>
                <th style={thStyle}>Data Category</th>
                <th style={thStyle}>Retention Period</th>
                <th style={thStyle}>Legal Basis</th>
                <th style={thStyle}>Deletion Method</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_RETENTION_POLICIES.map((policy) => (
                <tr key={policy.dataCategory}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{policy.dataCategory}</td>
                  <td style={tdStyle}>{policy.retentionPeriod}</td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{policy.legalBasis}</td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{policy.deletionMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          Section 3: Security Controls Summary
          ════════════════════════════════════════════ */}
      <section style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>3. Security Controls Summary</h2>
        <p style={{ fontSize: 13, marginTop: 0 }}>
          Implementation status of key security controls as of the report date.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle} aria-label="Security controls summary">
            <thead>
              <tr>
                <th style={thStyle}>Control</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Last Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_SECURITY_CONTROLS.map((ctrl) => (
                <tr key={ctrl.control}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{ctrl.control}</td>
                  <td style={tdStyle}>
                    <StatusBadge status={ctrl.status} />
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{ctrl.description}</td>
                  <td style={{ ...tdStyle, fontSize: 12, whiteSpace: 'nowrap' }}>{ctrl.lastReviewed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          Section 4+: Custom Sections
          ════════════════════════════════════════════ */}
      {customSections.map((section, i) => (
        <section key={i} style={sectionStyle}>
          <h2 style={{ ...sectionHeadingStyle, display: 'flex', justifyContent: 'space-between' }}>
            {4 + i}. {section.title}
            <button
              className="no-print"
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid #dc2626',
                background: 'none',
                color: '#dc2626',
                cursor: 'pointer',
              }}
              onClick={() => removeSection(i)}
              aria-label={`Remove custom section: ${section.title}`}
            >
              Remove
            </button>
          </h2>
          <div
            style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
          >
            {section.content || <em style={{ color: 'var(--ifm-color-emphasis-500)' }}>No content provided.</em>}
          </div>
        </section>
      ))}

      {/* ── Footer ── */}
      <hr style={{ border: 'none', borderTop: '1px solid var(--ifm-color-emphasis-200)', margin: '2rem 0 1rem' }} />
      <p style={{ fontSize: 11, color: 'var(--ifm-color-emphasis-500)', textAlign: 'center' }}>
        This report was generated automatically by the {organizationName} Developer Portal.
        Contents are for compliance and audit purposes only. &copy; {new Date().getFullYear()} {organizationName}
      </p>
    </div>
  );
}
