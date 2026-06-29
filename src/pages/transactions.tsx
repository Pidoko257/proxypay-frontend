import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Layout from '@theme/Layout';
import { 
  ArrowRight, 
  ExternalLink, 
  X, 
  Calendar, 
  Hash, 
  DollarSign, 
  Layers, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';

interface AuditEvent {
  event: string;
  timestamp: string;
  status: 'success' | 'failed' | 'info';
}

interface Transaction {
  id: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  momoReference: string;
  stellarHash: string;
  amount: string;
  currency: string;
  feeBreakdown: {
    baseFee: string;
    networkFee: string;
    processingFee: string;
  };
  createdAt: string;
  processedAt: string;
  auditTrail: AuditEvent[];
}

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'TX-1001',
    status: 'COMPLETED',
    momoReference: 'MOMO-738910-ANG',
    stellarHash: '86f5c531d044238e8544ba8f7a62df864a781b2c3de9886a117b3c2d665f80e9',
    amount: '15,000.00',
    currency: 'AOA',
    feeBreakdown: {
      baseFee: '100.00',
      networkFee: '10.00',
      processingFee: '40.00',
    },
    createdAt: '2026-06-29 14:32:00',
    processedAt: '2026-06-29 14:32:45',
    auditTrail: [
      { event: 'Transaction initialized', timestamp: '14:32:00', status: 'success' },
      { event: 'Mobile Money transfer detected', timestamp: '14:32:15', status: 'success' },
      { event: 'Stellar transaction submitted', timestamp: '14:32:30', status: 'success' },
      { event: 'Stellar ledger confirmed', timestamp: '14:32:45', status: 'success' },
    ],
  },
  {
    id: 'TX-1002',
    status: 'PENDING',
    momoReference: 'MOMO-910243-ANG',
    stellarHash: '12a9c3948e718276f5c531d044ba8f7a62df864a781b2c3de9886a117b3c2d6',
    amount: '8,500.00',
    currency: 'AOA',
    feeBreakdown: {
      baseFee: '50.00',
      networkFee: '10.00',
      processingFee: '25.00',
    },
    createdAt: '2026-06-29 15:10:00',
    processedAt: '--',
    auditTrail: [
      { event: 'Transaction initialized', timestamp: '15:10:00', status: 'success' },
      { event: 'Waiting for Mobile Money notification', timestamp: '15:10:05', status: 'info' },
    ],
  },
  {
    id: 'TX-1003',
    status: 'FAILED',
    momoReference: 'MOMO-482019-ANG',
    stellarHash: '',
    amount: '25,000.00',
    currency: 'AOA',
    feeBreakdown: {
      baseFee: '200.00',
      networkFee: '0.00',
      processingFee: '0.00',
    },
    createdAt: '2026-06-29 11:05:00',
    processedAt: '2026-06-29 11:15:00',
    auditTrail: [
      { event: 'Transaction initialized', timestamp: '11:05:00', status: 'success' },
      { event: 'Mobile Money transfer authorization request sent', timestamp: '11:05:30', status: 'success' },
      { event: 'Authorization timed out by carrier', timestamp: '11:15:00', status: 'failed' },
    ],
  },
];

interface DrawerProps {
  tx: Transaction;
  isOpen: boolean;
  onClose: () => void;
  triggerElement: HTMLElement | null;
}

function TransactionDetailDrawer({ tx, isOpen, onClose, triggerElement }: DrawerProps): React.JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const [animatedOpen, setAnimatedOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Handle mounting on client side for portals in Docusaurus
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle animation state
  useEffect(() => {
    if (isOpen) {
      // Small timeout to ensure transition triggers after mount
      const t = setTimeout(() => setAnimatedOpen(true), 10);
      return () => clearTimeout(t);
    } else {
      setAnimatedOpen(false);
    }
  }, [isOpen]);

  // Focus trapping and Key listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusableSelectors = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusable = Array.from(drawerRef.current.querySelectorAll(focusableSelectors)) as HTMLElement[];
        
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Trap focus inside the drawer on open
    if (drawerRef.current) {
      const closeBtn = drawerRef.current.querySelector('.drawer-close-btn') as HTMLElement;
      if (closeBtn) {
        closeBtn.focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to row trigger
      if (triggerElement) {
        triggerElement.focus();
      }
    };
  }, [isOpen, onClose, triggerElement]);

  if (!mounted) return null;

  const totalFee = (
    parseFloat(tx.feeBreakdown.baseFee) + 
    parseFloat(tx.feeBreakdown.networkFee) + 
    parseFloat(tx.feeBreakdown.processingFee)
  ).toFixed(2);

  const drawerElement = (
    <>
      {/* Backdrop overlay */}
      <div 
        className={`drawer-backdrop ${animatedOpen ? 'open' : ''}`}
        onClick={onClose}
      />
      
      {/* Drawer Container */}
      <div 
        ref={drawerRef}
        className={`drawer-container ${animatedOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
      >
        <div className="drawer-header">
          <div>
            <span 
              style={{ 
                fontSize: '0.75rem', 
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor: tx.status === 'COMPLETED' ? 'rgba(46, 133, 85, 0.12)' : tx.status === 'PENDING' ? 'rgba(224, 168, 0, 0.12)' : 'rgba(223, 64, 90, 0.12)',
                color: tx.status === 'COMPLETED' ? '#2e8555' : tx.status === 'PENDING' ? '#e0a800' : '#df405a',
                marginRight: '0.5rem'
              }}
            >
              {tx.status}
            </span>
            <h2 id="drawer-title" style={{ margin: '0.25rem 0 0 0', fontSize: '1.25rem' }}>
              Transaction {tx.id}
            </h2>
          </div>
          <button 
            type="button" 
            className="drawer-close-btn" 
            onClick={onClose}
            aria-label="Close transaction details"
          >
            <X size={20} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Details Section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', borderBottom: '1px solid var(--ifm-toc-border-color, #ebedf0)', paddingBottom: '0.5rem' }}>
              <Layers size={16} /> Specifications
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ifm-color-emphasis-600)' }}>Amount</span>
                <span style={{ fontWeight: 600 }}>{tx.amount} {tx.currency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ifm-color-emphasis-600)' }}>Mobile Money Ref</span>
                <span style={{ fontFamily: 'monospace' }}>{tx.momoReference}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ifm-color-emphasis-600)' }}>Created Timestamp</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> {tx.createdAt}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ifm-color-emphasis-600)' }}>Confirmed Timestamp</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> {tx.processedAt}</span>
              </div>
            </div>
          </div>

          {/* Fee breakdown */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', borderBottom: '1px solid var(--ifm-toc-border-color, #ebedf0)', paddingBottom: '0.5rem' }}>
              <DollarSign size={16} /> Fee Breakdown
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ifm-color-emphasis-600)' }}>Base Gateway Fee</span>
                <span>{tx.feeBreakdown.baseFee} {tx.currency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ifm-color-emphasis-600)' }}>Network Fee</span>
                <span>{tx.feeBreakdown.networkFee} {tx.currency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ifm-color-emphasis-600)' }}>Carrier Processing Fee</span>
                <span>{tx.feeBreakdown.processingFee} {tx.currency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dotted var(--ifm-toc-border-color, #ebedf0)', paddingTop: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                <span>Total Fees Charged</span>
                <span>{totalFee} {tx.currency}</span>
              </div>
            </div>
          </div>

          {/* Stellar Transaction Link */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', borderBottom: '1px solid var(--ifm-toc-border-color, #ebedf0)', paddingBottom: '0.5rem' }}>
              <Hash size={16} /> Stellar Ledger Reference
            </h4>
            {tx.stellarHash ? (
              <div style={{ fontSize: '0.85rem' }}>
                <div style={{ 
                  fontFamily: 'monospace', 
                  wordBreak: 'break-all', 
                  backgroundColor: 'rgba(0,0,0,0.03)', 
                  padding: '0.625rem', 
                  borderRadius: '6px',
                  marginBottom: '0.5rem'
                }}>
                  {tx.stellarHash}
                </div>
                <a 
                  href={`https://stellar.expert/explorer/public/tx/${tx.stellarHash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="button button--secondary button--sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', width: 'fit-content' }}
                >
                  View on Stellar.expert <ExternalLink size={12} />
                </a>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.85rem', color: 'var(--ifm-color-emphasis-600)' }}>
                <HelpCircle size={14} />
                <span>No Stellar transaction ledger link generated (Failed/Pending momo).</span>
              </div>
            )}
          </div>

          {/* Audit Trail Vertical Timeline */}
          <div>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', borderBottom: '1px solid var(--ifm-toc-border-color, #ebedf0)', paddingBottom: '0.5rem' }}>
              <Calendar size={16} /> Audit Trail
            </h4>
            
            <div className="timeline">
              {tx.auditTrail.map((item, index) => (
                <div key={index} className="timeline-item">
                  <div className={`timeline-dot ${item.status === 'failed' ? 'failed' : ''}`} />
                  <div className="timeline-content">
                    <strong>{item.event}</strong>
                    <div className="timeline-time">{item.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          <button type="button" className="button button--secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(drawerElement, document.body);
}

export default function TransactionsPage(): React.JSX.Element {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const openDrawer = (tx: Transaction, element: HTMLButtonElement) => {
    triggerRef.current = element;
    setSelectedTx(tx);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    // Keep reference details in state until transitions finish
    setTimeout(() => setSelectedTx(null), 300);
  };

  return (
    <Layout title="Transaction Management" description="Monitor ledger transfers, inspect mobile money gateway events, and audit flows">
      <main style={{ padding: '2rem 1.5rem', maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers style={{ color: 'var(--ifm-color-primary)' }} />
            Transactions Audit
          </h1>
          <p style={{ color: 'var(--ifm-color-emphasis-700)', fontSize: '1.1rem' }}>
            A detailed log of recent mobile-money-to-Stellar operations. Click any transaction row to inspect audit trails, 
            Stellar explorer ledger confirmations, and fee breakups.
          </p>
        </header>

        {/* Transactions Table */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--ifm-toc-border-color, #ebedf0)', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0, fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--ifm-toc-border-color, #ebedf0)', textAlign: 'left', backgroundColor: 'var(--ifm-background-surface-color, #f5f6f7)' }}>
                <th style={{ padding: '1rem 1.25rem' }}>Tx ID</th>
                <th style={{ padding: '1rem 1.25rem' }}>Status</th>
                <th style={{ padding: '1rem 1.25rem' }}>MoMo Reference</th>
                <th style={{ padding: '1rem 1.25rem' }}>Amount</th>
                <th style={{ padding: '1rem 1.25rem' }}>Created At</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_TRANSACTIONS.map((tx) => (
                <tr 
                  key={tx.id} 
                  style={{ borderBottom: '1px solid var(--ifm-toc-border-color, #ebedf0)', transition: 'background-color 0.2s' }}
                  className="table-row-hover"
                >
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>{tx.id}</td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span 
                      style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        backgroundColor: tx.status === 'COMPLETED' ? 'rgba(46, 133, 85, 0.12)' : tx.status === 'PENDING' ? 'rgba(224, 168, 0, 0.12)' : 'rgba(223, 64, 90, 0.12)',
                        color: tx.status === 'COMPLETED' ? '#2e8555' : tx.status === 'PENDING' ? '#e0a800' : '#df405a',
                      }}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', color: 'var(--ifm-color-emphasis-700)' }}>{tx.momoReference}</td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>{tx.amount} {tx.currency}</td>
                  <td style={{ padding: '1rem 1.25rem', color: 'var(--ifm-color-emphasis-600)' }}>{tx.createdAt}</td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                    <button 
                      type="button"
                      className="button button--secondary button--sm"
                      onClick={(e) => openDrawer(tx, e.currentTarget)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      Details <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Floating Detail Drawer (Portal rendered) */}
        {selectedTx && (
          <TransactionDetailDrawer 
            tx={selectedTx}
            isOpen={drawerOpen}
            onClose={closeDrawer}
            triggerElement={triggerRef.current}
          />
        )}
      </main>
    </Layout>
  );
}
