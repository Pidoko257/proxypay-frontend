import React, { useState } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function ComponentsPage(): React.JSX.Element {
  return (
    <Layout title="Component Demos" description="ProxyPay UI component demos">
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading demos...</p>}>
        {() => {
          const ExportButton = require('../components/ExportButton').default;
          const AuditTrailDrawer = require('../components/AuditTrailDrawer').default;
          const CopyButton = require('../components/CopyButton').default;
          const { TransactionIdField, ToastContainer } = require('../components/CopyButton');
          const FeeBreakdownTooltip = require('../components/FeeBreakdownTooltip').default;
          const { FeeBreakdownTitle } = require('../components/FeeBreakdownTooltip');

          return <DemoContent
            ExportButton={ExportButton}
            AuditTrailDrawer={AuditTrailDrawer}
            CopyButton={CopyButton}
            TransactionIdField={TransactionIdField}
            ToastContainer={ToastContainer}
            FeeBreakdownTooltip={FeeBreakdownTooltip}
            FeeBreakdownTitle={FeeBreakdownTitle}
          />;
        }}
      </BrowserOnly>
    </Layout>
  );
}

// Isolate state so hooks work after BrowserOnly resolution
function DemoContent({
  ExportButton,
  AuditTrailDrawer,
  CopyButton,
  TransactionIdField,
  ToastContainer,
  FeeBreakdownTooltip,
  FeeBreakdownTitle,
}: Record<string, React.ComponentType<any>>) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sampleData = [
    { id: 'TXN-001', amount: '250.00', currency: 'USD', status: 'completed' },
    { id: 'TXN-002', amount: '75.50',  currency: 'EUR', status: 'pending'   },
    { id: 'TXN-003', amount: '1200.00',currency: 'KES', status: 'failed'    },
  ];

  const auditEvents = [
    {
      id: 'evt-1',
      type: 'created' as const,
      timestamp: '2026-09-24T10:00:00Z',
      actorId: 'usr_abc123',
      actorName: 'Alice Mwangi',
      action: 'Transaction created',
      description: 'New mobile money transaction initiated via the partner API.',
      metadata: { source: 'partner-api', ipAddress: '203.0.113.42' },
    },
    {
      id: 'evt-2',
      type: 'updated' as const,
      timestamp: '2026-09-24T10:01:30Z',
      actorId: 'sys_bridge',
      action: 'Status updated',
      description: 'Transaction status changed after Stellar network confirmation.',
      changes: [
        { field: 'status', before: 'pending', after: 'completed' },
        { field: 'stellarTxHash', before: null, after: 'abc123def456...' },
      ],
    },
    {
      id: 'evt-3',
      type: 'failed' as const,
      timestamp: '2026-09-24T10:03:00Z',
      actorId: 'sys_bridge',
      action: 'Webhook delivery failed',
      description: 'Partner webhook endpoint returned HTTP 503. Retry scheduled.',
      metadata: { attempt: 1, nextRetry: '2026-09-24T10:08:00Z' },
    },
  ];

  const fees = [
    { label: 'Network fee',  amount: '0.30%', description: 'Stellar network processing fee' },
    { label: 'Exchange fee', amount: '0.50%', description: 'Mobile money ↔ XLM conversion'  },
    { label: 'Partner fee',  amount: '0.20%', description: 'ProxyPay service fee'            },
  ];

  return (
    <main style={{ padding: '3rem 1.5rem', maxWidth: 860, margin: '0 auto' }}>
      <ToastContainer />

      <h1>UI Component Demos</h1>
      <p>
        These components implement the features from issues #500–#503.
        They are available for use throughout the documentation portal.
      </p>

      {/* Issue #500 — ExportButton */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>#500 — Export Format Options</h2>
        <p>Select CSV, JSON, or XML and click Download.</p>
        <ExportButton data={sampleData} filename="transactions" label="Export" />
      </section>

      {/* Issue #501 — AuditTrailDrawer */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>#501 — Audit Trail Drawer</h2>
        <p>Click the button to open the drawer with expandable events and type filters.</p>
        <button
          className="button button--secondary"
          onClick={() => setDrawerOpen(true)}
        >
          Open Audit Trail
        </button>
        <AuditTrailDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          events={auditEvents}
          title="Transaction Audit Trail"
        />
      </section>

      {/* Issue #502 — CopyButton */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>#502 — Copy-to-Clipboard</h2>
        <p>Click the copy icon or focus the ID field and press Ctrl+C.</p>
        <TransactionIdField
          transactionId="TXN-9f3a2b1c-0048-4e7d-88fa-3bcdef012345"
          stellarHash="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
        />
      </section>

      {/* Issue #503 — FeeBreakdownTooltip */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>#503 — Fee Breakdown Tooltip</h2>
        <p>Hover or tap the ⓘ icon to see the fee breakdown.</p>
        <p>
          <FeeBreakdownTitle
            fees={fees}
            total="1.00%"
            docsUrl="/api"
            placement="bottom"
          />
        </p>
        <p style={{ marginTop: '1rem' }}>
          Inline use:{' '}
          <strong>Processing Fee</strong>{' '}
          <FeeBreakdownTooltip
            fees={fees}
            total="1.00%"
            docsUrl="/api"
            placement="right"
          />
        </p>
      </section>
    </main>
  );
}
