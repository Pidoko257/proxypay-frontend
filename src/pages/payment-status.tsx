import React, { useState, useEffect, useRef } from 'react';
import Layout from '@theme/Layout';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Smartphone,
  Info
} from 'lucide-react';

type StatusState = 'IDLE' | 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'FAILED';

interface StatusDetails {
  title: string;
  announcement: string;
  description: string;
  color: string;
}

const statusMap: Record<StatusState, StatusDetails> = {
  IDLE: {
    title: 'Ready',
    announcement: 'Status polling ready. Start payment to begin.',
    description: 'Enter payment details and click start to begin simulation.',
    color: 'text-gray-500',
  },
  PENDING: {
    title: 'Pending Authorization',
    announcement: 'Payment request received and is pending authorization.',
    description: 'We have received your payment request. Please authorize it on your mobile device.',
    color: 'var(--ifm-color-warning, #e0a800)',
  },
  PROCESSING: {
    title: 'Processing Payment',
    announcement: 'Payment is now processing.',
    description: 'We are processing the transaction with the mobile money carrier.',
    color: 'var(--ifm-color-primary)',
  },
  CONFIRMED: {
    title: 'Payment Confirmed',
    announcement: 'Payment confirmed successfully.',
    description: 'Your payment was successfully received and confirmed. Thank you!',
    color: '#2e8555',
  },
  FAILED: {
    title: 'Payment Failed',
    announcement: 'Payment failed. Please try again or contact support.',
    description: 'The carrier rejected the transaction or the request timed out. Please try again.',
    color: '#df405a',
  },
};

export default function PaymentStatusPage(): React.JSX.Element {
  const [status, setStatus] = useState<StatusState>('IDLE');
  const [shouldSucceed, setShouldSucceed] = useState<boolean>(true);
  const [ariaMode, setAriaMode] = useState<'polite' | 'assertive'>('polite');
  const [ariaText, setAriaText] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('+244 923 000 000');
  const [amount, setAmount] = useState<string>('5,000 AOA');
  const [announcementsLog, setAnnouncementsLog] = useState<Array<{ time: string; text: string; mode: string }>>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const triggerAnnouncement = (nextStatus: StatusState) => {
    const details = statusMap[nextStatus];
    const newAriaMode = nextStatus === 'FAILED' ? 'assertive' : 'polite';
    
    // Set ARIA attributes first
    setAriaMode(newAriaMode);
    setAriaText(details.announcement);

    // Log the announcement visually for demonstration/testing
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAnnouncementsLog((prev) => [
      { time: timeStr, text: details.announcement, mode: newAriaMode },
      ...prev,
    ]);
  };

  const startSimulation = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAnnouncementsLog([]);
    
    // Step 1: Set to PENDING immediately
    setStatus('PENDING');
    triggerAnnouncement('PENDING');

    // Step 2: Transition to PROCESSING after 3 seconds
    timerRef.current = setTimeout(() => {
      setStatus('PROCESSING');
      triggerAnnouncement('PROCESSING');

      // Step 3: Transition to either CONFIRMED or FAILED after another 3 seconds
      timerRef.current = setTimeout(() => {
        if (shouldSucceed) {
          setStatus('CONFIRMED');
          triggerAnnouncement('CONFIRMED');
        } else {
          setStatus('FAILED');
          triggerAnnouncement('FAILED');
        }
      }, 3000);
    }, 3000);
  };

  const resetSimulation = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('IDLE');
    setAriaText('');
    setAnnouncementsLog([]);
  };

  return (
    <Layout title="Payment Status updates" description="Simulate payment polling and verify ARIA live region updates">
      <main style={{ padding: '2rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Smartphone className="pulse-animation" style={{ color: 'var(--ifm-color-primary)' }} />
            Payment Status Updates
          </h1>
          <p style={{ color: 'var(--ifm-color-emphasis-700)', fontSize: '1.1rem' }}>
            An interactive simulator to test real-time payment status polling with accessibility compliance. 
            This screen contains an ARIA live region to announce changes to assistive technologies.
          </p>
        </header>

        {/* Accessible ARIA Live Region */}
        <div 
          aria-live={ariaMode} 
          aria-atomic="true" 
          className="sr-only"
        >
          {ariaText}
        </div>

        <div className="row">
          {/* Simulator Controls & Options */}
          <div className="col col--5" style={{ marginBottom: '1.5rem' }}>
            <div className="card" style={{ height: '100%' }}>
              <div className="card__header">
                <h3>Simulation Settings</h3>
              </div>
              <div className="card__body">
                <div className="premium-form-group">
                  <label className="premium-label" htmlFor="phone-input">Mobile Money Number</label>
                  <input 
                    id="phone-input"
                    className="premium-input" 
                    type="text" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    disabled={status !== 'IDLE'}
                  />
                </div>
                
                <div className="premium-form-group">
                  <label className="premium-label" htmlFor="amount-input">Amount</label>
                  <input 
                    id="amount-input"
                    className="premium-input" 
                    type="text" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    disabled={status !== 'IDLE'}
                  />
                </div>

                <div className="premium-form-group">
                  <label className="premium-label">Expected Polling Outcome</label>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                    <label className="checkbox-label" style={{ fontWeight: 'normal' }}>
                      <input 
                        type="radio" 
                        name="outcome" 
                        checked={shouldSucceed} 
                        onChange={() => setShouldSucceed(true)}
                        disabled={status !== 'IDLE'}
                      />
                      Succeed (Confirmed)
                    </label>
                    <label className="checkbox-label" style={{ fontWeight: 'normal' }}>
                      <input 
                        type="radio" 
                        name="outcome" 
                        checked={!shouldSucceed} 
                        onChange={() => setShouldSucceed(false)}
                        disabled={status !== 'IDLE'}
                      />
                      Fail (Rejected/Timeout)
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="card__footer" style={{ display: 'flex', gap: '0.75rem' }}>
                {status === 'IDLE' ? (
                  <button 
                    className="button button--primary button--block" 
                    onClick={startSimulation}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <Play size={16} /> Start Payment Simulation
                  </button>
                ) : (
                  <button 
                    className="button button--secondary button--block" 
                    onClick={resetSimulation}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <RotateCcw size={16} /> Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Polling Screen Visualization */}
          <div className="col col--7" style={{ marginBottom: '1.5rem' }}>
            <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="card__header">
                <h3>Live Polling Status</h3>
              </div>
              <div className="card__body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="status-card">
                  <div className="status-spinner-container">
                    {status === 'IDLE' && (
                      <div style={{ padding: '0.5rem', borderRadius: '50%', background: 'rgba(0, 0, 0, 0.05)' }}>
                        <Smartphone size={48} style={{ color: '#888' }} />
                      </div>
                    )}
                    {(status === 'PENDING' || status === 'PROCESSING') && (
                      <div className="status-spinner"></div>
                    )}
                    {status === 'CONFIRMED' && (
                      <CheckCircle2 size={64} style={{ color: '#2e8555' }} />
                    )}
                    {status === 'FAILED' && (
                      <AlertCircle size={64} style={{ color: '#df405a' }} />
                    )}
                  </div>
                  
                  <h2 style={{ color: statusMap[status].color, margin: '0 0 0.5rem 0' }}>
                    {statusMap[status].title}
                  </h2>
                  
                  <p style={{ margin: 0, fontWeight: 500, fontSize: '1.05rem' }}>
                    {statusMap[status].description}
                  </p>
                  
                  {status !== 'IDLE' && (
                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#888' }}>
                      <Loader2 size={14} className="pulse-animation" style={{ animation: 'spin 2s linear infinite' }} />
                      <span>Polling for transaction updates every 3s...</span>
                    </div>
                  )}
                </div>

                {/* ARIA Live region inspector for developers to verify accessibility */}
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--ifm-toc-border-color, #ebedf0)', paddingTop: '1rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
                    <Info size={16} /> ARIA Live Log (Screen Reader Updates)
                  </h4>
                  <div 
                    style={{ 
                      maxHeight: '120px', 
                      overflowY: 'auto', 
                      background: 'rgba(0,0,0,0.03)', 
                      padding: '0.75rem', 
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace'
                    }}
                  >
                    {announcementsLog.length === 0 ? (
                      <span style={{ color: '#888' }}>No announcements triggered yet. Run the simulation to see live screen reader triggers.</span>
                    ) : (
                      announcementsLog.map((log, index) => (
                        <div key={index} style={{ marginBottom: '0.375rem', borderBottom: '1px solid rgba(0,0,0,0.03)', paddingBottom: '0.25rem' }}>
                          <span style={{ color: '#888' }}>[{log.time}]</span>{' '}
                          <span 
                            style={{ 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              backgroundColor: log.mode === 'assertive' ? 'rgba(223, 64, 90, 0.15)' : 'rgba(46, 133, 85, 0.15)',
                              color: log.mode === 'assertive' ? '#df405a' : '#2e8555',
                              fontWeight: 'bold',
                              marginRight: '0.5rem'
                            }}
                          >
                            aria-live="{log.mode}"
                          </span>
                          <span style={{ fontWeight: 500 }}>"{log.text}"</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        <section style={{ marginTop: '2rem', borderTop: '1px solid var(--ifm-toc-border-color, #ebedf0)', paddingTop: '1.5rem' }}>
          <h3>Accessibility Compliance Notes</h3>
          <ul>
            <li><strong>Live Region:</strong> Renders a container with <code>aria-live</code>. When its text updates, screen readers announce the changes immediately.</li>
            <li><strong>Politeness Levels:</strong> Normal polling updates use <code>polite</code> to avoid interrupting ongoing user speech, while errors toggle to <code>assertive</code> to inform the user of a critical failure immediately.</li>
            <li><strong>Human-Readable:</strong> Screen reader messages are fully translated into descriptive, friendly sentences rather than raw API enum statuses (e.g. <code>PROCESSING</code>).</li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
