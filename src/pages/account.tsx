import React, { useState } from 'react';
import Layout from '@theme/Layout';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

const fieldStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.6rem 0.75rem',
  marginTop: '0.35rem',
  borderRadius: 6,
  border: '1px solid var(--ifm-color-emphasis-300, #ccc)',
  background: 'var(--ifm-background-surface-color, #fff)',
  color: 'inherit',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
};

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--ifm-color-emphasis-200, #e0e0e0)',
  borderRadius: 10,
  padding: '1.5rem',
  marginBottom: '2rem',
};

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 600 }}>
      {label}
      <input style={fieldStyle} {...props} />
    </label>
  );
}

function RegistrationForm(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <section style={cardStyle}>
      <h2>Create your account</h2>
      <form onSubmit={(e) => e.preventDefault()}>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label style={{ display: 'block', fontWeight: 600 }}>
          Password
          <input
            style={fieldStyle}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {/* Penalise passwords that contain the email the user just entered. */}
        <PasswordStrengthMeter password={password} userInputs={[email]} />
      </form>
    </section>
  );
}

function ChangePasswordForm(): React.JSX.Element {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');

  return (
    <section style={cardStyle}>
      <h2>Change password</h2>
      <form onSubmit={(e) => e.preventDefault()}>
        <Field
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <label style={{ display: 'block', fontWeight: 600 }}>
          New password
          <input
            style={fieldStyle}
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </label>
        <PasswordStrengthMeter password={next} />
      </form>
    </section>
  );
}

export default function AccountPage(): React.JSX.Element {
  return (
    <Layout title="Account" description="Account registration and password management">
      <main style={{ padding: '4rem 1.5rem', maxWidth: 560, margin: '0 auto' }}>
        <h1>Account</h1>
        <p>
          Both forms below evaluate password strength in real time, powered by{' '}
          <code>zxcvbn</code>.
        </p>
        <RegistrationForm />
        <ChangePasswordForm />
      </main>
    </Layout>
  );
}
