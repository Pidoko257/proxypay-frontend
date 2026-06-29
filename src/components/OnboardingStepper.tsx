import React, { useState } from 'react';

const STEPS = ['Account Setup', 'API Keys', 'Webhook Config', 'Test Transaction'] as const;

interface FormData {
  companyName: string;
  email: string;
  apiKeyName: string;
  environment: string;
  webhookUrl: string;
  webhookSecret: string;
  amount: string;
  currency: string;
}

const INITIAL_FORM: FormData = {
  companyName: '',
  email: '',
  apiKeyName: '',
  environment: 'sandbox',
  webhookUrl: '',
  webhookSecret: '',
  amount: '',
  currency: 'USD',
};

export default function OnboardingStepper(): React.JSX.Element {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [done, setDone] = useState(false);

  const set =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleNext = () => {
    setCompleted((prev) => new Set(prev).add(currentStep));
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setDone(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const stepContent: React.ReactNode[] = [
    <div key="account">
      <h3>Account Setup</h3>
      <div className="pp-stepper__field">
        <label htmlFor="companyName">Company Name</label>
        <input
          id="companyName"
          value={form.companyName}
          onChange={set('companyName')}
          placeholder="Acme Corp"
        />
      </div>
      <div className="pp-stepper__field">
        <label htmlFor="email">Business Email</label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="dev@acme.com"
        />
      </div>
    </div>,

    <div key="apikeys">
      <h3>API Keys</h3>
      <div className="pp-stepper__field">
        <label htmlFor="apiKeyName">Key Name</label>
        <input
          id="apiKeyName"
          value={form.apiKeyName}
          onChange={set('apiKeyName')}
          placeholder="my-integration"
        />
      </div>
      <div className="pp-stepper__field">
        <label htmlFor="environment">Environment</label>
        <select id="environment" value={form.environment} onChange={set('environment')}>
          <option value="sandbox">Sandbox</option>
          <option value="production">Production</option>
        </select>
      </div>
    </div>,

    <div key="webhook">
      <h3>Webhook Config</h3>
      <div className="pp-stepper__field">
        <label htmlFor="webhookUrl">Webhook URL</label>
        <input
          id="webhookUrl"
          value={form.webhookUrl}
          onChange={set('webhookUrl')}
          placeholder="https://example.com/webhook"
        />
      </div>
      <div className="pp-stepper__field">
        <label htmlFor="webhookSecret">Signing Secret</label>
        <input
          id="webhookSecret"
          type="password"
          value={form.webhookSecret}
          onChange={set('webhookSecret')}
          placeholder="whsec_..."
        />
      </div>
    </div>,

    <div key="transaction">
      <h3>Test Transaction</h3>
      <div className="pp-stepper__field">
        <label htmlFor="amount">Amount</label>
        <input
          id="amount"
          type="number"
          value={form.amount}
          onChange={set('amount')}
          placeholder="10.00"
          min="0.01"
          step="0.01"
        />
      </div>
      <div className="pp-stepper__field">
        <label htmlFor="currency">Currency</label>
        <select id="currency" value={form.currency} onChange={set('currency')}>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="KES">KES</option>
        </select>
      </div>
    </div>,
  ];

  if (done) {
    return (
      <div className="pp-stepper pp-stepper--done">
        <p>
          <strong>Setup complete.</strong> Your ProxyPay integration is ready. Check your email for
          API key details and refer to the{' '}
          <a href="/api">API Reference</a> for endpoint documentation.
        </p>
      </div>
    );
  }

  return (
    <div className="pp-stepper">
      <ol className="pp-stepper__steps" aria-label="Onboarding progress">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={[
              'pp-stepper__step',
              i === currentStep ? 'pp-stepper__step--current' : '',
              completed.has(i) ? 'pp-stepper__step--done' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={i === currentStep ? 'step' : undefined}
          >
            <span className="pp-stepper__step-icon" aria-hidden="true">
              {completed.has(i) ? '✓' : i + 1}
            </span>
            <span className="pp-stepper__step-label">{label}</span>
          </li>
        ))}
      </ol>

      <div className="pp-stepper__content">{stepContent[currentStep]}</div>

      <div className="pp-stepper__nav">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="button button--secondary"
        >
          Back
        </button>
        <button type="button" onClick={handleNext} className="button button--primary">
          {currentStep < STEPS.length - 1 ? 'Next' : 'Finish'}
        </button>
      </div>
    </div>
  );
}
