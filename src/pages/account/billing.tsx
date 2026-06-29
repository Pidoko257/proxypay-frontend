import React, { useState } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

const PLANS = [
  { id: 'starter', name: 'Starter', price: '$49/mo', calls: 10_000, color: '#718096' },
  { id: 'growth', name: 'Growth', price: '$149/mo', calls: 100_000, color: '#2e8555' },
  { id: 'scale', name: 'Scale', price: '$499/mo', calls: 1_000_000, color: '#805ad5' },
];

const MOCK_INVOICES = [
  { id: 'INV-2024-06', date: '2024-06-01', amount: '$149.00', status: 'Paid' },
  { id: 'INV-2024-05', date: '2024-05-01', amount: '$149.00', status: 'Paid' },
  { id: 'INV-2024-04', date: '2024-04-01', amount: '$49.00',  status: 'Paid' },
  { id: 'INV-2024-03', date: '2024-03-01', amount: '$49.00',  status: 'Paid' },
];

const CURRENT_PLAN = PLANS[1]; // Growth
const API_CALLS_USED = 73_412;
const BILLING_START = '2024-06-01';
const BILLING_END   = '2024-06-30';
const PAYMENT_LAST4 = '4242';
const PAYMENT_BRAND = 'Visa';
const PAYMENT_EXP   = '08/27';

function UsageMeter({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min((used / limit) * 100, 100);
  const color = pct > 85 ? '#e53e3e' : pct > 65 ? '#dd6b20' : '#2e8555';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#4a5568' }}>
        <span>API Calls Used</span>
        <span style={{ fontWeight: 600, color }}>
          {used.toLocaleString()} / {limit.toLocaleString()} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div style={{ height: 10, background: '#e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 8, transition: 'width 0.4s' }} />
      </div>
      <p style={{ fontSize: 12, color: '#a0aec0', marginTop: 6 }}>
        Resets on {BILLING_END}. {pct > 85 && <strong style={{ color: '#e53e3e' }}>Consider upgrading — you&apos;re near your limit.</strong>}
      </p>
    </div>
  );
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '24px 28px', marginBottom: 24, ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 18, color: '#1a202c', marginBottom: 16, marginTop: 0 }}>{children}</h2>;
}

function PlanBadge({ plan, current }: { plan: typeof PLANS[0]; current: boolean }) {
  return (
    <div
      style={{
        border: `2px solid ${current ? plan.color : '#e2e8f0'}`,
        borderRadius: 12,
        padding: '18px 22px',
        background: current ? `${plan.color}10` : '#fafafa',
        position: 'relative',
        minWidth: 170,
      }}
    >
      {current && (
        <span
          style={{
            position: 'absolute',
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: plan.color,
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 10px',
            borderRadius: 20,
          }}
        >
          CURRENT
        </span>
      )}
      <div style={{ fontWeight: 700, fontSize: 16, color: plan.color, marginBottom: 4 }}>{plan.name}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#1a202c', marginBottom: 6 }}>{plan.price}</div>
      <div style={{ fontSize: 12, color: '#718096' }}>{plan.calls.toLocaleString()} API calls/mo</div>
      {!current && (
        <button
          style={{
            marginTop: 14,
            width: '100%',
            background: plan.color,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 0',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 13,
          }}
          onClick={() => alert(`Upgrade to ${plan.name} — payment flow would open here.`)}
        >
          Upgrade →
        </button>
      )}
    </div>
  );
}

function BillingPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  function downloadInvoice(id: string) {
    setDownloading(id);
    setTimeout(() => {
      const blob = new Blob([`ProxyPay Invoice ${id}\nAmount: $149.00\nStatus: Paid`], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloading(null);
    }, 600);
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Billing &amp; Usage</h1>
      <p style={{ color: '#718096', marginBottom: '2rem' }}>Manage your plan, payment method, and invoices.</p>

      {/* Current Plan + Usage */}
      <Card>
        <SectionTitle>Current Plan</SectionTitle>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          {PLANS.map((p) => (
            <PlanBadge key={p.id} plan={p} current={p.id === CURRENT_PLAN.id} />
          ))}
        </div>
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
          <div style={{ display: 'flex', gap: 32, marginBottom: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, color: '#a0aec0', marginBottom: 2 }}>Billing cycle</div>
              <div style={{ fontWeight: 600, color: '#2d3748' }}>{BILLING_START} → {BILLING_END}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#a0aec0', marginBottom: 2 }}>Next invoice</div>
              <div style={{ fontWeight: 600, color: '#2d3748' }}>2024-07-01 · {CURRENT_PLAN.price}</div>
            </div>
          </div>
          <UsageMeter used={API_CALLS_USED} limit={CURRENT_PLAN.calls} />
        </div>
      </Card>

      {/* Payment Method */}
      <Card>
        <SectionTitle>Payment Method</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 32, background: '#1a1f71', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>{PAYMENT_BRAND.toUpperCase()}</span>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#2d3748' }}>•••• •••• •••• {PAYMENT_LAST4}</div>
              <div style={{ fontSize: 12, color: '#718096' }}>Expires {PAYMENT_EXP}</div>
            </div>
          </div>
          <button
            style={{
              background: 'none',
              border: '1.5px solid #2e8555',
              borderRadius: 8,
              padding: '7px 16px',
              color: '#2e8555',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13,
            }}
            onClick={() => alert('Update payment method — Stripe dialog would open here.')}
          >
            Update Card
          </button>
        </div>
      </Card>

      {/* Invoices */}
      <Card>
        <SectionTitle>Past Invoices</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              {['Invoice', 'Date', 'Amount', 'Status', ''].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#718096', fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_INVOICES.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: '1px solid #f0f4f8' }}>
                <td style={{ padding: '12px 10px', fontWeight: 500 }}>{inv.id}</td>
                <td style={{ padding: '12px 10px', color: '#4a5568' }}>{inv.date}</td>
                <td style={{ padding: '12px 10px', fontWeight: 600 }}>{inv.amount}</td>
                <td style={{ padding: '12px 10px' }}>
                  <span style={{ background: '#f0faf4', color: '#2e8555', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {inv.status}
                  </span>
                </td>
                <td style={{ padding: '12px 10px' }}>
                  <button
                    onClick={() => downloadInvoice(inv.id)}
                    disabled={downloading === inv.id}
                    style={{
                      background: 'none',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      padding: '5px 12px',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: '#4a5568',
                    }}
                  >
                    {downloading === inv.id ? 'Downloading…' : '⬇ PDF'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export default function Billing(): React.JSX.Element {
  return (
    <Layout title="Billing & Usage" description="Manage your ProxyPay plan and invoices">
      <BrowserOnly fallback={<div style={{ padding: '3rem' }}>Loading billing…</div>}>
        {() => <BillingPage />}
      </BrowserOnly>
    </Layout>
  );
}
