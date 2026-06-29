import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';

type ProfileFieldKey = 'displayName' | 'companyName';

type ProfileData = {
  displayName: string;
  companyName: string;
};

const defaultProfile: ProfileData = {
  displayName: 'Your display name',
  companyName: 'Your company name',
};

export default function ProfilePage(): React.JSX.Element {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [editingField, setEditingField] = useState<ProfileFieldKey | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch('/api/profile');
        if (!response.ok) {
          throw new Error('Profile endpoint unavailable');
        }

        const data = (await response.json()) as Partial<ProfileData>;
        setProfile({
          displayName: data.displayName ?? defaultProfile.displayName,
          companyName: data.companyName ?? defaultProfile.companyName,
        });
      } catch {
        setProfile(defaultProfile);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const startEdit = (field: ProfileFieldKey) => {
    setEditingField(field);
    setDraftValue(profile[field]);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setDraftValue('');
    setError(null);
  };

  const saveEdit = async () => {
    if (!editingField) {
      return;
    }

    const trimmedValue = draftValue.trim();
    if (!trimmedValue) {
      setError('Value cannot be empty.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [editingField]: trimmedValue }),
      });

      if (!response.ok) {
        throw new Error('Unable to save profile.');
      }

      setProfile((current) => ({
        ...current,
        [editingField]: trimmedValue,
      }));
      setEditingField(null);
      setDraftValue('');
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      cancelEdit();
    } else if (event.key === 'Enter') {
      saveEdit();
    }
  };

  const fieldRow = (field: ProfileFieldKey, label: string) => {
    const isEditing = editingField === field;

    return (
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>{label}</label>
        {isEditing ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
            <input
              type="text"
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={saving}
              style={{
                flex: 1,
                minWidth: 220,
                padding: '10px 12px',
                border: '1px solid #ccc',
                borderRadius: 4,
                fontSize: '1rem',
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving || draftValue.trim() === profile[field].trim()}
              style={{
                padding: '10px 16px',
                borderRadius: 4,
                border: '1px solid #0b5fff',
                background: '#0b5fff',
                color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              style={{
                padding: '10px 16px',
                borderRadius: 4,
                border: '1px solid #ccc',
                background: '#fff',
                color: '#111',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => startEdit(field)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                startEdit(field);
              }
            }}
            style={{
              padding: '14px 16px',
              borderRadius: 8,
              border: '1px solid #d9d9d9',
              background: '#fafafa',
              cursor: 'pointer',
              minHeight: 52,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ color: profile[field] ? '#111' : '#6f6f6f' }}>
              {profile[field] || `Click to add ${label.toLowerCase()}`}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout title="User Profile" description="Edit your ProxyPay profile inline">
      <main style={{ padding: '4rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <h1>User Profile</h1>
        <p style={{ marginBottom: 24 }}>
          Click a field to edit it in place, then Save or Cancel. Changes are saved immediately with a
          PATCH request.
        </p>

        {loading ? (
          <p>Loading profile…</p>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)' }}>
            {fieldRow('displayName', 'Display Name')}
            {fieldRow('companyName', 'Company Name')}
            {error ? (
              <div style={{ color: '#b91c1c', marginTop: 12 }}>{error}</div>
            ) : null}
          </div>
        )}
      </main>
    </Layout>
  );
}
