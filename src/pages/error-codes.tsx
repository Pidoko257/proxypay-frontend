import React, { useState, useMemo } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

type Category = 'Authentication' | 'Validation' | 'Rate Limiting' | 'Payment' | 'Account' | 'Server';

interface ErrorCode {
  code: string;
  httpStatus: number;
  category: Category;
  description: string;
  remediation: string;
}

const ERROR_CODES: ErrorCode[] = [
  // Authentication
  { code: 'PP-AUTH-001', httpStatus: 401, category: 'Authentication', description: 'Missing or malformed Authorization header.', remediation: 'Include a valid Bearer token in the Authorization header: `Authorization: Bearer <token>`.' },
  { code: 'PP-AUTH-002', httpStatus: 401, category: 'Authentication', description: 'API key has expired or been revoked.', remediation: 'Rotate your API key in Account Settings → API Keys and update your integration.' },
  { code: 'PP-AUTH-003', httpStatus: 403, category: 'Authentication', description: 'API key lacks permission for this operation.', remediation: 'Request an API key with the required scope, or contact your account administrator.' },
  { code: 'PP-AUTH-004', httpStatus: 401, category: 'Authentication', description: 'Invalid HMAC signature on webhook payload.', remediation: 'Recompute the HMAC-SHA256 signature using your webhook secret. Ensure no extra whitespace in the payload.' },

  // Validation
  { code: 'PP-VAL-001', httpStatus: 422, category: 'Validation', description: 'Required field is missing in the request body.', remediation: 'Check the error `field` property and include the missing value. Consult the API reference for required fields.' },
  { code: 'PP-VAL-002', httpStatus: 422, category: 'Validation', description: 'Field value is out of the accepted range.', remediation: 'Review the field constraints in the API reference and adjust the value accordingly.' },
  { code: 'PP-VAL-003', httpStatus: 422, category: 'Validation', description: 'Invalid currency code provided.', remediation: 'Use an ISO 4217 three-letter currency code (e.g., USD, EUR, NGN).' },
  { code: 'PP-VAL-004', httpStatus: 400, category: 'Validation', description: 'Request body is not valid JSON.', remediation: 'Set `Content-Type: application/json` and ensure the body is well-formed JSON.' },
  { code: 'PP-VAL-005', httpStatus: 422, category: 'Validation', description: 'Duplicate idempotency key with conflicting payload.', remediation: 'Use a unique idempotency key per distinct request, or re-use the same key only if the payload is identical.' },

  // Rate Limiting
  { code: 'PP-RATE-001', httpStatus: 429, category: 'Rate Limiting', description: 'Account has exceeded its per-minute API call limit.', remediation: 'Implement exponential back-off. Check the `Retry-After` response header for the wait time in seconds.' },
  { code: 'PP-RATE-002', httpStatus: 429, category: 'Rate Limiting', description: 'Monthly API call quota has been reached.', remediation: 'Upgrade your plan in Billing settings or wait for the quota to reset at the start of next billing cycle.' },
  { code: 'PP-RATE-003', httpStatus: 429, category: 'Rate Limiting', description: 'IP address temporarily blocked due to excessive failed requests.', remediation: 'Wait for the block to lift (see `Retry-After`). Fix authentication errors before retrying to avoid re-triggering the block.' },

  // Payment
  { code: 'PP-PAY-001', httpStatus: 402, category: 'Payment', description: 'Insufficient funds in the source account.', remediation: 'Notify the end-user to top up their account, or try an alternative payment method.' },
  { code: 'PP-PAY-002', httpStatus: 402, category: 'Payment', description: 'Card was declined by the issuing bank.', remediation: 'Prompt the user to contact their bank or use a different card. Include the `decline_code` from the response in your support flow.' },
  { code: 'PP-PAY-003', httpStatus: 409, category: 'Payment', description: 'Transaction already exists with the same reference.', remediation: 'Use a unique transaction reference per payment. Retrieve the existing transaction with the `/transactions/{reference}` endpoint.' },
  { code: 'PP-PAY-004', httpStatus: 402, category: 'Payment', description: 'Transaction amount is below the minimum threshold.', remediation: 'Ensure the amount meets the minimum (see `constraints.min_amount` in the error response).' },
  { code: 'PP-PAY-005', httpStatus: 402, category: 'Payment', description: 'Transaction amount exceeds the maximum single-transaction limit.', remediation: 'Split the amount across multiple transactions or request a limit increase via your account manager.' },

  // Account
  { code: 'PP-ACC-001', httpStatus: 403, category: 'Account', description: 'Merchant account is suspended.', remediation: 'Contact ProxyPay support at support@proxypay.dev to resolve the suspension.' },
  { code: 'PP-ACC-002', httpStatus: 403, category: 'Account', description: 'KYC verification is incomplete for this account.', remediation: 'Complete KYC verification in the dashboard under Account → Verification before processing live transactions.' },
  { code: 'PP-ACC-003', httpStatus: 404, category: 'Account', description: 'Beneficiary account not found.', remediation: 'Verify the beneficiary ID or account number. Ensure the beneficiary was created under your merchant account.' },

  // Server
  { code: 'PP-SRV-001', httpStatus: 500, category: 'Server', description: 'Unexpected internal server error.', remediation: 'Retry with exponential back-off. If the issue persists, open a ticket at status.proxypay.dev referencing the `request_id` from the response.' },
  { code: 'PP-SRV-002', httpStatus: 503, category: 'Server', description: 'Service temporarily unavailable due to maintenance.', remediation: 'Check status.proxypay.dev for the maintenance window. Retry after the scheduled end time.' },
  { code: 'PP-SRV-003', httpStatus: 504, category: 'Server', description: 'Request timed out while waiting for an upstream service.', remediation: 'Retry with exponential back-off. Use idempotency keys to safely retry payment requests without risk of duplication.' },
];

const ALL_CATEGORIES: Category[] = ['Authentication', 'Validation', 'Rate Limiting', 'Payment', 'Account', 'Server'];

const CATEGORY_COLORS: Record<Category, { bg: string; text: string }> = {
  Authentication: { bg: '#ebf4ff', text: '#2b6cb0' },
  Validation:     { bg: '#fefcbf', text: '#744210' },
  'Rate Limiting':{ bg: '#fff5f5', text: '#c53030' },
  Payment:        { bg: '#f0faf4', text: '#276749' },
  Account:        { bg: '#faf5ff', text: '#553c9a' },
  Server:         { bg: '#fff8f1', text: '#c05621' },
};

function StatusBadge({ code }: { code: number }) {
  const color = code >= 500 ? '#c53030' : code >= 400 ? '#c05621' : '#276749';
  return (
    <span style={{ fontWeight: 700, color, fontFamily: 'monospace', fontSize: 13 }}>{code}</span>
  );
}

function CategoryBadge({ cat }: { cat: Category }) {
  const { bg, text } = CATEGORY_COLORS[cat];
  return (
    <span style={{ background: bg, color: text, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{cat}</span>
  );
}

function ErrorRow({ ec, highlighted }: { ec: ErrorCode; highlighted: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        onClick={() => setOpen((o) => !o)}
        style={{
          cursor: 'pointer',
          background: highlighted ? '#f0faf4' : open ? '#f7fafc' : 'transparent',
          borderBottom: '1px solid #f0f4f8',
          transition: 'background 0.1s',
        }}
      >
        <td style={{ padding: '13px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#2d3748', fontSize: 13 }}>{ec.code}</td>
        <td style={{ padding: '13px 14px' }}><StatusBadge code={ec.httpStatus} /></td>
        <td style={{ padding: '13px 14px' }}><CategoryBadge cat={ec.category} /></td>
        <td style={{ padding: '13px 14px', color: '#4a5568', fontSize: 14 }}>{ec.description}</td>
        <td style={{ padding: '13px 14px', color: '#a0aec0', fontSize: 13 }}>{open ? '▲' : '▼'}</td>
      </tr>
      {open && (
        <tr style={{ background: '#f7fafc' }}>
          <td colSpan={5} style={{ padding: '14px 20px 18px 20px', borderBottom: '2px solid #e2e8f0' }}>
            <strong style={{ fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5 }}>Remediation</strong>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#2d3748', lineHeight: 1.6 }}>{ec.remediation}</p>
          </td>
        </tr>
      )}
    </>
  );
}

function ErrorCodesPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return ERROR_CODES.filter((ec) => {
      const matchCat = activeCategory === 'All' || ec.category === activeCategory;
      const matchQ =
        !q ||
        ec.code.toLowerCase().includes(q) ||
        ec.description.toLowerCase().includes(q) ||
        ec.remediation.toLowerCase().includes(q) ||
        String(ec.httpStatus).includes(q);
      return matchCat && matchQ;
    });
  }, [query, activeCategory]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Error Codes Reference</h1>
      <p style={{ color: '#718096', marginBottom: '2rem', maxWidth: 620 }}>
        All ProxyPay API error codes, HTTP status codes, human-readable descriptions, and remediation
        steps. Click a row to expand the remediation guide.
      </p>

      {/* Search */}
      <input
        type="search"
        placeholder="Search by code, description, or status…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '11px 16px',
          borderRadius: 10,
          border: '1.5px solid #e2e8f0',
          fontSize: 14,
          color: '#2d3748',
          marginBottom: 16,
          boxSizing: 'border-box',
        }}
      />

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {(['All', ...ALL_CATEGORIES] as const).map((cat) => {
          const active = activeCategory === cat;
          const colors = cat === 'All' ? null : CATEGORY_COLORS[cat];
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: active ? '2px solid #2e8555' : '1.5px solid #e2e8f0',
                background: active ? (colors ? colors.bg : '#f0faf4') : '#fff',
                color: active ? (colors ? colors.text : '#2e8555') : '#718096',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {cat}
              <span style={{ marginLeft: 6, opacity: 0.6 }}>
                ({cat === 'All' ? ERROR_CODES.length : ERROR_CODES.filter((e) => e.category === cat).length})
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead style={{ background: '#f7fafc' }}>
            <tr>
              {['Error Code', 'HTTP Status', 'Category', 'Description', ''].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 14px', fontSize: 12, color: '#718096', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#a0aec0' }}>
                  No error codes match your search.
                </td>
              </tr>
            ) : (
              filtered.map((ec) => (
                <ErrorRow key={ec.code} ec={ec} highlighted={!!query && ec.code.toLowerCase().includes(query.toLowerCase())} />
              ))
            )}
          </tbody>
        </table>
      </div>

      <p style={{ color: '#a0aec0', fontSize: 12, marginTop: 16 }}>
        {filtered.length} of {ERROR_CODES.length} error codes shown.
      </p>
    </div>
  );
}

export default function ErrorCodes(): React.JSX.Element {
  return (
    <Layout title="Error Codes Reference" description="ProxyPay API error codes, HTTP statuses, and remediation steps">
      <BrowserOnly fallback={<div style={{ padding: '3rem' }}>Loading error codes…</div>}>
        {() => <ErrorCodesPage />}
      </BrowserOnly>
    </Layout>
  );
}
