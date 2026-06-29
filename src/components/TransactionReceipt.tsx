import React, { useRef, useCallback } from 'react';

export type ReceiptData = {
  transactionId: string;
  date: string;
  amountPaid: string;
  currency: string;
  fees: string;
  recipientName: string;
  recipientAccount: string;
  stellarHash: string;
  status?: string;
};

const SAMPLE: ReceiptData = {
  transactionId: 'TXN-000042',
  date: new Date().toLocaleString(),
  amountPaid: '250.00',
  currency: 'USDC',
  fees: '0.0025',
  recipientName: 'Acme Corp',
  recipientAccount: 'GDDEX...A9F3',
  stellarHash: 'a1b2c3d4e5f67890abcdef1234567890',
  status: 'Completed',
};

function ReceiptBody({ data }: { data: ReceiptData }) {
  const rows: [string, string][] = [
    ['Transaction ID', data.transactionId],
    ['Date', data.date],
    ['Status', data.status ?? 'Completed'],
    ['Amount Paid', `${data.amountPaid} ${data.currency}`],
    ['Transaction Fee', `${data.fees} ${data.currency}`],
    ['Total', `${(parseFloat(data.amountPaid) + parseFloat(data.fees)).toFixed(4)} ${data.currency}`],
    ['Recipient Name', data.recipientName],
    ['Recipient Account', data.recipientAccount],
    ['Stellar Hash', data.stellarHash],
  ];

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      maxWidth: 480, fontFamily: 'system-ui, sans-serif', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '20px 24px', textAlign: 'center' }}>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>ProxyPay</div>
        <div style={{ color: '#c7d2fe', fontSize: 12, marginTop: 2 }}>Payment Receipt</div>
      </div>

      {/* Success badge */}
      <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
        <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 20, padding: '5px 16px', fontSize: 13, fontWeight: 700 }}>
          ✓ {data.status ?? 'Completed'}
        </span>
      </div>

      {/* Amount highlight */}
      <div style={{ textAlign: 'center', padding: '4px 0 16px' }}>
        <span style={{ fontSize: 36, fontWeight: 800, color: '#1e293b' }}>{data.amountPaid}</span>
        <span style={{ fontSize: 18, color: '#64748b', marginLeft: 6 }}>{data.currency}</span>
      </div>

      {/* Detail rows */}
      <div style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '12px 24px' }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, minWidth: 120 }}>{label}</span>
            <span style={{
              fontSize: 12, color: '#1e293b', textAlign: 'right', wordBreak: 'break-all',
              fontFamily: label === 'Stellar Hash' || label === 'Recipient Account' ? 'monospace' : 'inherit',
              fontWeight: label === 'Amount Paid' || label === 'Total' ? 700 : 400,
            }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 24px', textAlign: 'center', fontSize: 10, color: '#cbd5e1' }}>
        Powered by ProxyPay · Stellar Network · proxypay.io
      </div>
    </div>
  );
}

export default function TransactionReceipt({ data = SAMPLE }: { data?: ReceiptData }) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const downloadPDF = useCallback(() => {
    const el = receiptRef.current;
    if (!el) return;

    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>ProxyPay Receipt – ${data.transactionId}</title><style>
      body { margin: 0; padding: 32px; background: #f8fafc; display: flex; justify-content: center; }
      @media print { body { background: #fff; padding: 0; } @page { margin: 10mm; } }
    </style></head><body>${el.outerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
  }, [data.transactionId]);

  const shareLink = useCallback(() => {
    const params = new URLSearchParams({
      txn: data.transactionId,
      amount: data.amountPaid,
      currency: data.currency,
      hash: data.stellarHash,
    });
    const url = `${window.location.origin}/receipt?${params}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => alert('Receipt link copied to clipboard!'));
    } else {
      prompt('Copy this receipt link:', url);
    }
  }, [data]);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div ref={receiptRef}>
        <ReceiptBody data={data} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={downloadPDF} style={btnStyle('#6366f1')}>
          ⬇ Download PDF
        </button>
        <button onClick={shareLink} style={btnStyle('#0ea5e9')}>
          🔗 Share Link
        </button>
      </div>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '8px 18px', borderRadius: 7, border: 'none', background: bg,
    color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  };
}
