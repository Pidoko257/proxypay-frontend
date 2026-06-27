import React from 'react';
import Layout from '@theme/Layout';
import { useToast } from '@site/src/contexts/ToastContext';

export default function ToastDemo(): React.JSX.Element {
  const { addToast } = useToast();

  return (
    <Layout
      title="Toast Notifications"
      description="Demo of the global toast notification system"
    >
      <main className="container margin-vert--lg">
        <h1>Toast Notifications</h1>
        <p>
          Dispatch a notification with the <code>useToast()</code> hook. Up to
          five toasts stack at once (the oldest is dismissed first); each
          auto-dismisses after 5&nbsp;seconds with a countdown bar, pauses on
          hover, and can be closed manually.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginTop: '1.5rem',
          }}
        >
          <button
            type="button"
            className="button button--success"
            onClick={() =>
              addToast({
                type: 'success',
                title: 'Payment sent',
                message: 'Your transfer completed successfully.',
              })
            }
          >
            Success
          </button>
          <button
            type="button"
            className="button button--danger"
            onClick={() =>
              addToast({
                type: 'error',
                title: 'Transaction failed',
                message: 'Insufficient balance for this transfer.',
              })
            }
          >
            Error
          </button>
          <button
            type="button"
            className="button button--warning"
            onClick={() =>
              addToast({
                type: 'warning',
                title: 'Network congestion',
                message: 'Confirmations may take longer than usual.',
              })
            }
          >
            Warning
          </button>
          <button
            type="button"
            className="button button--info"
            onClick={() =>
              addToast({
                type: 'info',
                title: 'Rate updated',
                message: 'NGN/USDC refreshed a few seconds ago.',
              })
            }
          >
            Info
          </button>
        </div>
      </main>
    </Layout>
  );
}
