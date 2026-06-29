import React, { useState } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { TimezoneProvider, useTimezone } from '../../components/TimezoneContext';

const COMMON_TZ = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const SAMPLE_TIMESTAMPS = [
  { label: 'API key created', iso: '2024-03-15T09:32:00Z' },
  { label: 'Last login',      iso: '2024-06-28T14:05:42Z' },
  { label: 'Last API call',   iso: '2024-06-30T07:18:55Z' },
];

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

function TimezoneSettings() {
  const { timezone, setTimezone, formatTimestamp } = useTimezone();
  const [saved, setSaved] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setTimezone(e.target.value);
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card>
      <SectionTitle>Time Zone Preferences</SectionTitle>
      <p style={{ color: '#4a5568', fontSize: 14, marginBottom: 20 }}>
        All timestamps in the dashboard will display in your chosen time zone using the{' '}
        <code>Intl.DateTimeFormat</code> API.
      </p>

      <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#2d3748' }}>
        Time Zone
      </label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={timezone}
          onChange={handleChange}
          style={{
            padding: '9px 14px',
            borderRadius: 8,
            border: '1.5px solid #e2e8f0',
            fontSize: 14,
            color: '#2d3748',
            minWidth: 260,
            cursor: 'pointer',
          }}
        >
          {COMMON_TZ.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <button
          onClick={handleSave}
          style={{
            background: '#2e8555',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '9px 20px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {/* Live preview */}
      <div style={{ marginTop: 24, borderTop: '1px solid #f0f4f8', paddingTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#718096', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Preview — timestamps in {timezone}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '6px 10px', color: '#a0aec0', fontSize: 12 }}>Event</th>
              <th style={{ textAlign: 'left', padding: '6px 10px', color: '#a0aec0', fontSize: 12 }}>UTC (raw)</th>
              <th style={{ textAlign: 'left', padding: '6px 10px', color: '#a0aec0', fontSize: 12 }}>Local time</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_TIMESTAMPS.map((t) => (
              <tr key={t.label} style={{ borderBottom: '1px solid #f7fafc' }}>
                <td style={{ padding: '10px 10px', color: '#2d3748', fontWeight: 500 }}>{t.label}</td>
                <td style={{ padding: '10px 10px', color: '#718096', fontFamily: 'monospace' }}>{t.iso}</td>
                <td style={{ padding: '10px 10px', color: '#2e8555', fontWeight: 600 }}>{formatTimestamp(t.iso)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ProfileSettings() {
  return (
    <Card>
      <SectionTitle>Profile</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 480 }}>
        {[
          { label: 'Display Name', value: 'Jane Developer' },
          { label: 'Email', value: 'jane@example.com' },
        ].map((f) => (
          <div key={f.label}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#718096', marginBottom: 6 }}>{f.label}</label>
            <input
              defaultValue={f.value}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#2d3748', boxSizing: 'border-box' }}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

function SettingsPage() {
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Account Settings</h1>
      <p style={{ color: '#718096', marginBottom: '2rem' }}>Manage your profile, time zone, and notification preferences.</p>
      <ProfileSettings />
      <TimezoneSettings />
    </div>
  );
}

export default function Settings(): React.JSX.Element {
  return (
    <Layout title="Account Settings" description="ProxyPay account preferences">
      <BrowserOnly fallback={<div style={{ padding: '3rem' }}>Loading settings…</div>}>
        {() => (
          <TimezoneProvider>
            <SettingsPage />
          </TimezoneProvider>
        )}
      </BrowserOnly>
    </Layout>
  );
}
