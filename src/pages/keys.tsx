import React, { useState, useEffect, useRef, useId } from 'react';
import Layout from '@theme/Layout';
import DashboardLayout from '../components/DashboardLayout';

interface ApiKey {
  id: string;
  name: string;
  maskedValue: string;
  createdAt: string;
  lastUsed: string | null;
}

interface NewKey {
  fullValue: string;
}

function generateKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'ppk_';
  for (let i = 0; i < 36; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function maskKey(value: string): string {
  if (value.length <= 4) return value;
  return '•'.repeat(value.length - 4) + value.slice(-4);
}

export default function KeysPage(): React.JSX.Element {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState('');
  const [newKey, setNewKey] = useState<NewKey | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const revokeCancelRef = useRef<HTMLButtonElement>(null);
  const formId = useId();

  useEffect(() => {
    if (revokeTarget) revokeCancelRef.current?.focus();
  }, [revokeTarget]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nameInput.trim()) {
      setNameError('Key name is required.');
      nameInputRef.current?.focus();
      return;
    }
    setNameError('');
    const fullValue = generateKey();
    setKeys((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: nameInput.trim(),
        maskedValue: maskKey(fullValue),
        createdAt: new Date().toISOString(),
        lastUsed: null,
      },
    ]);
    setNewKey({ fullValue });
    setNameInput('');
    setCopied(false);
  }

  function handleCopy(value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleRevoke() {
    if (!revokeTarget) return;
    setKeys((prev) => prev.filter((k) => k.id !== revokeTarget.id));
    if (newKey) setNewKey(null);
    setRevokeTarget(null);
  }

  return (
    <Layout title="API Keys" description="Manage your ProxyPay API keys">
      <DashboardLayout>
        <h1>API Keys</h1>
        <p>
          API keys authenticate requests to the ProxyPay API. A key value is
          shown in full only once, at creation time.
        </p>

        {/* Create form */}
        <form
          onSubmit={handleCreate}
          noValidate
          style={{ marginBottom: '2rem', maxWidth: 560 }}
        >
          <label
            htmlFor={`${formId}-name`}
            style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem' }}
          >
            Key name
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <input
                ref={nameInputRef}
                id={`${formId}-name`}
                type="text"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  if (nameError) setNameError('');
                }}
                placeholder="e.g. Production server"
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? `${formId}-name-error` : undefined}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: `1px solid ${nameError ? '#d73a49' : 'var(--ifm-color-emphasis-300)'}`,
                  borderRadius: 4,
                  fontSize: '0.95rem',
                  background: 'var(--ifm-background-color)',
                  color: 'var(--ifm-font-color-base)',
                  boxSizing: 'border-box',
                }}
              />
              {nameError && (
                <span
                  id={`${formId}-name-error`}
                  role="alert"
                  style={{
                    color: '#d73a49',
                    fontSize: '0.85rem',
                    display: 'block',
                    marginTop: '0.25rem',
                  }}
                >
                  {nameError}
                </span>
              )}
            </div>
            <button type="submit" className="button button--primary">
              Create key
            </button>
          </div>
        </form>

        {/* Newly created key reveal — shown exactly once */}
        {newKey && (
          <div
            role="status"
            style={{
              background: 'var(--ifm-color-success-contrast-background, #eafbea)',
              border: '1px solid var(--ifm-color-success, #2e8555)',
              borderRadius: 6,
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              maxWidth: 680,
            }}
          >
            <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
              Copy your new API key — it won&apos;t be shown again.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <code
                style={{
                  flex: 1,
                  wordBreak: 'break-all',
                  background: 'rgba(0,0,0,0.05)',
                  padding: '0.3rem 0.5rem',
                  borderRadius: 3,
                  fontSize: '0.9rem',
                }}
              >
                {newKey.fullValue}
              </code>
              <button
                className="button button--sm button--outline button--primary"
                onClick={() => handleCopy(newKey.fullValue)}
                aria-label="Copy API key to clipboard"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button
              onClick={() => setNewKey(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginTop: '0.5rem',
                fontSize: '0.82rem',
                color: 'var(--ifm-font-color-secondary)',
                padding: 0,
              }}
            >
              I&apos;ve saved it — dismiss
            </button>
          </div>
        )}

        {/* Key list */}
        {keys.length === 0 ? (
          <p style={{ color: 'var(--ifm-font-color-secondary)', fontStyle: 'italic' }}>
            No API keys yet. Create one above.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--ifm-color-emphasis-300)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem' }}>Key</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem' }}>Created</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem' }}>Last used</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr
                    key={key.id}
                    style={{ borderBottom: '1px solid var(--ifm-color-emphasis-200)' }}
                  >
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{key.name}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <code style={{ fontSize: '0.85rem', letterSpacing: '0.02em' }}>
                        {key.maskedValue}
                      </code>
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        fontSize: '0.85rem',
                        color: 'var(--ifm-font-color-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {new Date(key.createdAt).toLocaleDateString()}
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        fontSize: '0.85rem',
                        color: 'var(--ifm-font-color-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {key.lastUsed
                        ? new Date(key.lastUsed).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <button
                        className="button button--sm button--danger"
                        onClick={() => setRevokeTarget(key)}
                        aria-label={`Revoke key ${key.name}`}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Revoke confirmation modal */}
        {revokeTarget && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="revoke-dialog-title"
            aria-describedby="revoke-dialog-desc"
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
              onClick={() => setRevokeTarget(null)}
              aria-hidden="true"
            />
            <div
              style={{
                position: 'relative',
                background: 'var(--ifm-background-color)',
                borderRadius: 8,
                padding: '2rem',
                maxWidth: 420,
                width: '90%',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              }}
            >
              <h2 id="revoke-dialog-title" style={{ marginTop: 0, fontSize: '1.2rem' }}>
                Revoke &ldquo;{revokeTarget.name}&rdquo;?
              </h2>
              <p id="revoke-dialog-desc" style={{ color: 'var(--ifm-font-color-secondary)' }}>
                This action cannot be undone. Any requests using this key will
                fail immediately.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  ref={revokeCancelRef}
                  className="button button--secondary"
                  onClick={() => setRevokeTarget(null)}
                >
                  Cancel
                </button>
                <button className="button button--danger" onClick={handleRevoke}>
                  Revoke key
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </Layout>
  );
}
