import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';

interface NotificationPreference {
  id: string;
  name: string;
  description: string;
  email: boolean;
  webhook: boolean;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  isExiting?: boolean;
}

const INITIAL_PREFERENCES: NotificationPreference[] = [
  {
    id: 'payment.settled',
    name: 'Payment Settled',
    description: 'Triggered when an incoming payment is successfully received and settled in your account.',
    email: true,
    webhook: true,
  },
  {
    id: 'payment.failed',
    name: 'Payment Failed',
    description: 'Triggered when a payment attempt fails, expires, or is rejected.',
    email: true,
    webhook: false,
  },
  {
    id: 'kyc.status_change',
    name: 'KYC Status Change',
    description: 'Triggered when a compliance review changes the status of a linked customer.',
    email: false,
    webhook: true,
  },
  {
    id: 'payout.processed',
    name: 'Payout Processed',
    description: 'Triggered when a payout to a bank account or mobile money operator has been processed.',
    email: false,
    webhook: false,
  },
];

export default function SettingsPage(): React.JSX.Element {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingState, setSavingState] = useState<{ [key: string]: boolean }>({});
  const [simulateFailure, setSimulateFailure] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Load preferences (Mock API GET)
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setLoading(true);
        // Simulate API network delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        const stored = localStorage.getItem('proxyPay_notification_prefs');
        if (stored) {
          setPreferences(JSON.parse(stored));
        } else {
          localStorage.setItem('proxyPay_notification_prefs', JSON.stringify(INITIAL_PREFERENCES));
          setPreferences(INITIAL_PREFERENCES);
        }
      } catch (err) {
        showToast('Failed to load preferences from the API.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchPreferences();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove toast after 4 seconds, with exit animation
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 4000);
  };

  // Optimistic toggle function
  const handleToggle = async (id: string, channel: 'email' | 'webhook', currentValue: boolean) => {
    const newValue = !currentValue;
    const saveKey = `${id}-${channel}`;

    // 1. Optimistic Update (Update UI immediately)
    setPreferences((prev) =>
      prev.map((pref) => (pref.id === id ? { ...pref, [channel]: newValue } : pref))
    );
    
    // Show saving status for this toggle
    setSavingState((prev) => ({ ...prev, [saveKey]: true }));

    // 2. Perform mock API call
    try {
      // Simulate network request duration
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (simulateFailure) {
            reject(new Error('API save failed'));
          } else {
            resolve(true);
          }
        }, 1000);
      });

      // Successful Save: Persist in local storage mock DB
      const stored = localStorage.getItem('proxyPay_notification_prefs');
      const currentPrefs: NotificationPreference[] = stored ? JSON.parse(stored) : [];
      const updatedPrefs = currentPrefs.map((pref) =>
        pref.id === id ? { ...pref, [channel]: newValue } : pref
      );
      localStorage.setItem('proxyPay_notification_prefs', JSON.stringify(updatedPrefs));
      
      showToast(`Updated ${id} ${channel} notification preference.`, 'success');
    } catch (error) {
      // 3. Failed Save: Revert UI immediately & show error toast
      setPreferences((prev) =>
        prev.map((pref) => (pref.id === id ? { ...pref, [channel]: currentValue } : pref))
      );
      showToast(`Failed to update ${channel} preference for ${id}. Connection refused.`, 'error');
    } finally {
      // Remove saving state indicator
      setSavingState((prev) => {
        const next = { ...prev };
        delete next[saveKey];
        return next;
      });
    }
  };

  return (
    <Layout title="Notification Settings" description="Configure webhook and email alert preferences">
      <main className="premium-container">
        
        {/* Toast Container */}
        <div className="toast-container">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast-item toast-${toast.type} ${toast.isExiting ? 'toast-exit' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>
                  {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
                </span>
                <span style={{ flexGrow: 1 }}>{toast.message}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="premium-header">
          <h1>Notification Settings</h1>
          <p>Configure which system events trigger developer email alerts and API webhooks.</p>
        </div>

        <div className="premium-card" style={{ borderLeft: '4px solid var(--ifm-color-primary)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛠️</span> Developer Testing Sandbox
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ifm-color-emphasis-700)' }}>
            Toggle the switch below to simulate network errors on the API. When active, saving notification changes
            will fail, showcasing the optimistic UI rollback mechanism and error toast alerts.
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="switch-container">
              <input
                type="checkbox"
                id="simulate-failure"
                className="switch-input"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
              />
              <label htmlFor="simulate-failure" className="switch-label"></label>
            </div>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: simulateFailure ? '#ef4444' : 'inherit' }}>
              Simulate API Failures {simulateFailure ? '(Active - Updates will fail)' : '(Inactive - Updates will succeed)'}
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0' }}>
            <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
            <p style={{ marginTop: '1rem', color: 'var(--ifm-color-emphasis-600)' }}>Loading notification preferences from API...</p>
          </div>
        ) : (
          <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="premium-table-wrapper">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th style={{ width: '50%' }}>Notification Type / Event Name</th>
                    <th style={{ width: '25%', textAlign: 'center' }}>Email Notifications</th>
                    <th style={{ width: '25%', textAlign: 'center' }}>Webhook Events</th>
                  </tr>
                </thead>
                <tbody>
                  {preferences.map((pref) => {
                    const emailSaving = savingState[`${pref.id}-email`];
                    const webhookSaving = savingState[`${pref.id}-webhook`];

                    return (
                      <tr key={pref.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>
                            <code>{pref.id}</code>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--ifm-color-emphasis-600)' }}>
                            {pref.name} — {pref.description}
                          </div>
                        </td>
                        <td align="center">
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <div className="switch-container">
                              <input
                                type="checkbox"
                                id={`email-${pref.id}`}
                                className="switch-input"
                                checked={pref.email}
                                disabled={emailSaving}
                                onChange={() => handleToggle(pref.id, 'email', pref.email)}
                              />
                              <label htmlFor={`email-${pref.id}`} className="switch-label"></label>
                            </div>
                            {emailSaving && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--ifm-color-primary)', fontWeight: 500 }}>
                                Saving...
                              </span>
                            )}
                          </div>
                        </td>
                        <td align="center">
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <div className="switch-container">
                              <input
                                type="checkbox"
                                id={`webhook-${pref.id}`}
                                className="switch-input"
                                checked={pref.webhook}
                                disabled={webhookSaving}
                                onChange={() => handleToggle(pref.id, 'webhook', pref.webhook)}
                              />
                              <label htmlFor={`webhook-${pref.id}`} className="switch-label"></label>
                            </div>
                            {webhookSaving && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--ifm-color-primary)', fontWeight: 500 }}>
                                Saving...
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--ifm-color-emphasis-500)' }}>
            All settings are stored in your developer profile. Webhooks route to your configured endpoints.
          </span>
        </div>
      </main>
    </Layout>
  );
}
