import React, { useState, useCallback } from 'react';

interface FormValues {
  email: string;
  webhookUrl: string;
  alertThreshold: string;
}

interface FormErrors {
  email?: string;
  webhookUrl?: string;
  alertThreshold?: string;
}

interface TouchedFields {
  email: boolean;
  webhookUrl: boolean;
  alertThreshold: boolean;
}

function validateEmail(value: string): string | undefined {
  if (!value.trim()) return 'Email is required.';
  // Simple but solid email regex
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Please enter a valid email address.';
  return undefined;
}

function validateWebhookUrl(value: string): string | undefined {
  if (!value.trim()) return 'Webhook URL is required.';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return 'Webhook URL must use http or https.';
    }
  } catch {
    return 'Please enter a valid URL (e.g. https://example.com/webhook).';
  }
  return undefined;
}

function validateAlertThreshold(value: string): string | undefined {
  if (!value.trim()) return 'Alert threshold is required.';
  const num = Number(value);
  if (isNaN(num)) return 'Alert threshold must be a number.';
  if (num <= 0) return 'Alert threshold must be greater than 0.';
  return undefined;
}

function validate(values: FormValues): FormErrors {
  return {
    email: validateEmail(values.email),
    webhookUrl: validateWebhookUrl(values.webhookUrl),
    alertThreshold: validateAlertThreshold(values.alertThreshold),
  };
}

const initialValues: FormValues = { email: '', webhookUrl: '', alertThreshold: '' };
const initialTouched: TouchedFields = { email: false, webhookUrl: false, alertThreshold: false };

const invalidFieldStyle: React.CSSProperties = {
  borderColor: '#e53e3e',
  outline: 'none',
};

const validFieldStyle: React.CSSProperties = {
  borderColor: '#cbd5e0',
};

const baseInputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem 0.75rem',
  fontSize: '0.9375rem',
  borderRadius: 6,
  border: '1px solid #cbd5e0',
  boxSizing: 'border-box',
  color: 'var(--pp-text, #1a202c)',
  backgroundColor: 'var(--pp-surface, #fff)',
};

export default function NotificationSettings(): React.JSX.Element {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [touched, setTouched] = useState<TouchedFields>(initialTouched);
  const [submitted, setSubmitted] = useState(false);
  const [success, setSuccess] = useState(false);

  const errors = validate(values);
  const hasErrors = Object.values(errors).some(Boolean);
  const hasBeenTouched = Object.values(touched).some(Boolean);
  const isSubmitDisabled = hasErrors || !hasBeenTouched;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setValues((prev) => ({ ...prev, [name]: value }));
      setSuccess(false);
    },
    []
  );

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      // Mark all fields as touched to reveal any remaining errors
      setTouched({ email: true, webhookUrl: true, alertThreshold: true });

      const currentErrors = validate(values);
      if (Object.values(currentErrors).some(Boolean)) return;

      setSuccess(true);
    },
    [values]
  );

  const fieldError = (field: keyof FormErrors) =>
    touched[field] ? errors[field] : undefined;

  const inputStyle = (field: keyof FormErrors): React.CSSProperties => ({
    ...baseInputStyle,
    ...(fieldError(field) ? invalidFieldStyle : validFieldStyle),
  });

  return (
    <div
      style={{
        maxWidth: 520,
        margin: '2rem auto',
        padding: '2rem',
        borderRadius: 8,
        border: '1px solid var(--pp-border, #e2e8f0)',
        backgroundColor: 'var(--pp-surface, #fff)',
        color: 'var(--pp-text, #1a202c)',
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>
        Notification Settings
      </h2>

      {success && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 6,
            backgroundColor: '#c6f6d5',
            color: '#276749',
            marginBottom: '1.25rem',
            fontSize: '0.9375rem',
          }}
        >
          ✓ Settings saved successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate aria-label="Notification settings form">
        {/* Email */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="email"
            style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9375rem' }}
          >
            Email address <span aria-hidden="true" style={{ color: '#e53e3e' }}>*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-required="true"
            aria-describedby={fieldError('email') ? 'email-error' : undefined}
            aria-invalid={!!fieldError('email')}
            placeholder="you@example.com"
            style={inputStyle('email')}
          />
          {fieldError('email') && (
            <p
              id="email-error"
              role="alert"
              style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#e53e3e' }}
            >
              {fieldError('email')}
            </p>
          )}
        </div>

        {/* Webhook URL */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="webhookUrl"
            style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9375rem' }}
          >
            Webhook URL <span aria-hidden="true" style={{ color: '#e53e3e' }}>*</span>
          </label>
          <input
            id="webhookUrl"
            name="webhookUrl"
            type="url"
            value={values.webhookUrl}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-required="true"
            aria-describedby={fieldError('webhookUrl') ? 'webhookUrl-error' : undefined}
            aria-invalid={!!fieldError('webhookUrl')}
            placeholder="https://example.com/webhook"
            style={inputStyle('webhookUrl')}
          />
          {fieldError('webhookUrl') && (
            <p
              id="webhookUrl-error"
              role="alert"
              style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#e53e3e' }}
            >
              {fieldError('webhookUrl')}
            </p>
          )}
        </div>

        {/* Alert Threshold */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label
            htmlFor="alertThreshold"
            style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9375rem' }}
          >
            Alert threshold (USD) <span aria-hidden="true" style={{ color: '#e53e3e' }}>*</span>
          </label>
          <input
            id="alertThreshold"
            name="alertThreshold"
            type="number"
            min="0.01"
            step="0.01"
            value={values.alertThreshold}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-required="true"
            aria-describedby={
              fieldError('alertThreshold') ? 'alertThreshold-error' : 'alertThreshold-hint'
            }
            aria-invalid={!!fieldError('alertThreshold')}
            placeholder="100"
            style={inputStyle('alertThreshold')}
          />
          <p
            id="alertThreshold-hint"
            style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--pp-text-muted, #718096)' }}
          >
            Send an alert when a transaction exceeds this amount.
          </p>
          {fieldError('alertThreshold') && (
            <p
              id="alertThreshold-error"
              role="alert"
              style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#e53e3e' }}
            >
              {fieldError('alertThreshold')}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitDisabled}
          aria-disabled={isSubmitDisabled}
          style={{
            padding: '0.625rem 1.5rem',
            borderRadius: 6,
            border: 'none',
            backgroundColor: isSubmitDisabled ? '#a0aec0' : 'var(--pp-primary, #2e8555)',
            color: '#fff',
            fontSize: '0.9375rem',
            fontWeight: 600,
            cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          Save settings
        </button>
      </form>
    </div>
  );
}
