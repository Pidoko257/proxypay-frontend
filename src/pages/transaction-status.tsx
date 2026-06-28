import React, { useState, useEffect, useRef } from 'react';
import Layout from '@theme/Layout';
import DashboardLayout from '../components/DashboardLayout';

type TxStatus = 'Initiated' | 'Processing' | 'Confirmed' | 'Settled' | 'Failed' | 'Timeout';

const STEPS: TxStatus[] = ['Initiated', 'Processing', 'Confirmed', 'Settled'];
const TERMINAL: Set<TxStatus> = new Set(['Settled', 'Failed', 'Timeout']);
const POLL_INTERVAL_MS = 5000;
const TIMEOUT_MS = 120_000;

// Placeholder for the actual API call.
// Replace with: const res = await fetch(`/api/transactions/${id}`); return res.json();
async function getTransactionStatus(
  _id: string
): Promise<{ status: TxStatus; errorCode?: string }> {
  return { status: 'Processing' };
}

export default function TransactionStatusPage(): React.JSX.Element {
  const [txId, setTxId] = useState('');
  const [status, setStatus] = useState<TxStatus | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pollingRef = useRef(false);

  function stopPolling() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    pollingRef.current = false;
    setPolling(false);
  }

  function startPolling(id: string) {
    stopPolling();
    setStatus('Initiated');
    setErrorCode(null);
    setElapsed(0);
    startTimeRef.current = Date.now();
    pollingRef.current = true;
    setPolling(true);

    intervalRef.current = setInterval(async () => {
      if (!pollingRef.current) return;

      const elapsedMs = Date.now() - startTimeRef.current;
      setElapsed(Math.floor(elapsedMs / 1000));

      if (elapsedMs >= TIMEOUT_MS) {
        setStatus('Timeout');
        stopPolling();
        return;
      }

      try {
        const result = await getTransactionStatus(id);
        setStatus(result.status);
        if (result.errorCode) setErrorCode(result.errorCode);
        if (TERMINAL.has(result.status)) stopPolling();
      } catch {
        setStatus('Failed');
        setErrorCode('NETWORK_ERROR');
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  const activeIndex = status ? STEPS.indexOf(status as (typeof STEPS)[number]) : -1;
  const isError = status === 'Failed' || status === 'Timeout';

  return (
    <Layout title="Transaction Status" description="Real-time transaction status">
      <DashboardLayout>
        <h1>Transaction Status</h1>
        <p>Enter a transaction ID to track payment progress in real time.</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (txId.trim()) startPolling(txId.trim());
          }}
          style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', maxWidth: 480 }}
        >
          <input
            type="text"
            value={txId}
            onChange={(e) => setTxId(e.target.value)}
            placeholder="e.g. txn_abc123"
            aria-label="Transaction ID"
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--ifm-color-emphasis-300)',
              borderRadius: 4,
              fontSize: '0.95rem',
              background: 'var(--ifm-background-color)',
              color: 'var(--ifm-font-color-base)',
            }}
          />
          <button
            type="submit"
            className="button button--primary"
            disabled={polling || !txId.trim()}
          >
            {polling ? 'Polling…' : 'Check status'}
          </button>
        </form>

        {status !== null && (
          <>
            {/* Progress stepper */}
            <div
              role="list"
              aria-label="Transaction progress steps"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                marginBottom: '2rem',
                overflowX: 'auto',
                paddingBottom: '0.5rem',
              }}
            >
              {STEPS.map((step, i) => {
                const done = activeIndex > i;
                const active = activeIndex === i && !isError;
                const failed = isError && i === Math.max(activeIndex, 0);
                return (
                  <React.Fragment key={step}>
                    <div
                      role="listitem"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: 72,
                      }}
                    >
                      <div
                        aria-current={active ? 'step' : undefined}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          background: failed
                            ? '#d73a49'
                            : done || active
                            ? 'var(--ifm-color-primary)'
                            : 'var(--ifm-color-emphasis-200)',
                          color: done || active || failed ? '#fff' : 'var(--ifm-font-color-secondary)',
                          border: active
                            ? '2px solid var(--ifm-color-primary-dark)'
                            : '2px solid transparent',
                          transition: 'background 0.3s ease',
                        }}
                      >
                        {done ? '✓' : i + 1}
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          marginTop: '0.4rem',
                          textAlign: 'center',
                          color: active
                            ? 'var(--ifm-color-primary)'
                            : failed
                            ? '#d73a49'
                            : 'var(--ifm-font-color-secondary)',
                        }}
                      >
                        {step}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        aria-hidden="true"
                        style={{
                          flex: 1,
                          height: 2,
                          alignSelf: 'flex-start',
                          marginTop: 17,
                          minWidth: 16,
                          background: done
                            ? 'var(--ifm-color-primary)'
                            : 'var(--ifm-color-emphasis-200)',
                          transition: 'background 0.3s ease',
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* ARIA live region — status changes are announced to screen readers */}
            <div aria-live="polite" aria-atomic="true" style={{ marginBottom: '1rem' }}>
              <p style={{ fontWeight: 600, fontSize: '1.05rem', margin: 0 }}>
                Status: {status}
                {polling && (
                  <span
                    style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.85rem',
                      color: 'var(--ifm-font-color-secondary)',
                      fontWeight: 400,
                    }}
                  >
                    (updating every 5s &mdash; {elapsed}s elapsed)
                  </span>
                )}
              </p>
            </div>

            {/* Failed / Timeout */}
            {isError && (
              <div
                role="alert"
                style={{
                  background: '#fff0f0',
                  border: '1px solid #d73a49',
                  borderRadius: 6,
                  padding: '1rem 1.25rem',
                  marginBottom: '1rem',
                }}
              >
                <strong>
                  {status === 'Timeout' ? 'Request timed out' : 'Payment failed'}
                </strong>
                {errorCode && (
                  <p
                    style={{
                      margin: '0.3rem 0 0',
                      fontSize: '0.9rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    Error code: {errorCode}
                  </p>
                )}
                <button
                  className="button button--sm button--primary"
                  onClick={() => {
                    if (txId.trim()) startPolling(txId.trim());
                  }}
                  style={{ marginTop: '0.75rem' }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Settled */}
            {status === 'Settled' && (
              <div
                role="status"
                style={{
                  background: 'var(--ifm-color-success-contrast-background, #eafbea)',
                  border: '1px solid var(--ifm-color-success, #2e8555)',
                  borderRadius: 6,
                  padding: '1rem 1.25rem',
                }}
              >
                <strong>Payment settled successfully.</strong>
              </div>
            )}
          </>
        )}
      </DashboardLayout>
    </Layout>
  );
}
