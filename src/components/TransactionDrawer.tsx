import React from 'react';
import CopyField from './CopyField';
import FeeTooltip, { type FeeBreakdown } from './FeeTooltip';

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_TRANSACTION = {
  id: 'TXN-9A3F2-BC71D',
  stellarHash: '8a3b1c4e2f9d0a5b6c7d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
  amount: 5000,
  currency: 'NGN',
  recipient: '+234 801 234 5678',
  network: 'MTN MoMo',
  status: 'completed',
  createdAt: '2026-09-30T08:02:11Z',
  settledAt: '2026-09-30T08:24:59Z',
};

const MOCK_FEES: FeeBreakdown = {
  networkFee: 0.05,
  serviceFee: 1.25,
  conversionFee: 0.8,
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const drawerWrapStyle: React.CSSProperties = {
  background: '#fff',
  border: '1.5px solid #e5e7eb',
  borderRadius: '12px',
  padding: '1.5rem',
  maxWidth: '560px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  fontFamily: 'inherit',
};

const drawerTitleStyle: React.CSSProperties = {
  fontSize: '1.15rem',
  fontWeight: 700,
  color: '#111827',
  marginBottom: '0.25rem',
};

const statusBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.2rem 0.7rem',
  borderRadius: '999px',
  background: '#d1fae5',
  color: '#065f46',
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '1.25rem',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '1.25rem',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '0.35rem',
};

const fieldRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.15rem',
  marginBottom: '0.85rem',
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#6b7280',
  marginBottom: '0.25rem',
};

const metaGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.5rem 1.25rem',
  marginBottom: '1.25rem',
};

const metaItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.15rem',
};

const metaLabelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: '#9ca3af',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const metaValueStyle: React.CSSProperties = {
  fontSize: '0.88rem',
  color: '#1f2937',
  fontWeight: 500,
};

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #f3f4f6',
  margin: '1.1rem 0',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function TransactionDrawer(): React.JSX.Element {
  const tx = MOCK_TRANSACTION;

  return (
    <div style={drawerWrapStyle} aria-label="Transaction details drawer">
      <h2 style={drawerTitleStyle}>Transaction Details</h2>
      <span style={statusBadgeStyle}>{tx.status}</span>

      {/* Transaction IDs */}
      <div style={sectionStyle}>
        <div style={fieldRowStyle}>
          <span style={fieldLabelStyle}>Transaction ID</span>
          <CopyField label="Transaction ID" value={tx.id} />
        </div>

        <div style={fieldRowStyle}>
          <span style={fieldLabelStyle}>Stellar Hash</span>
          <CopyField label="Stellar Hash" value={tx.stellarHash} />
        </div>
      </div>

      <hr style={dividerStyle} aria-hidden="true" />

      {/* Transaction metadata */}
      <div style={sectionStyle}>
        <p style={sectionLabelStyle}>Payment Info</p>
        <div style={metaGridStyle}>
          <div style={metaItemStyle}>
            <span style={metaLabelStyle}>Amount</span>
            <span style={metaValueStyle}>
              {tx.amount.toLocaleString()} {tx.currency}
            </span>
          </div>
          <div style={metaItemStyle}>
            <span style={metaLabelStyle}>Network</span>
            <span style={metaValueStyle}>{tx.network}</span>
          </div>
          <div style={metaItemStyle}>
            <span style={metaLabelStyle}>Recipient</span>
            <span style={metaValueStyle}>{tx.recipient}</span>
          </div>
          <div style={metaItemStyle}>
            <span style={metaLabelStyle}>Created</span>
            <span style={metaValueStyle}>{formatDateTime(tx.createdAt)}</span>
          </div>
          <div style={metaItemStyle}>
            <span style={metaLabelStyle}>Settled</span>
            <span style={metaValueStyle}>{formatDateTime(tx.settledAt)}</span>
          </div>
        </div>
      </div>

      <hr style={dividerStyle} aria-hidden="true" />

      {/* Fee breakdown — powered by FeeTooltip (Issue #503) */}
      <div style={sectionStyle}>
        <FeeTooltip fees={MOCK_FEES} />
      </div>
    </div>
  );
}
