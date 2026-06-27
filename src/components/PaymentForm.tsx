import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * PaymentForm — Mobile-responsive payment initiation form.
 * Issue #36: Build Mobile Responsive Payment Initiation Form
 *
 * Acceptance Criteria:
 *   ✓ Single-column layout on screens < 640px
 *   ✓ All interactive elements ≥ 44×44px touch targets
 *   ✓ Focused inputs scroll into view above virtual keyboard (iOS/Android)
 *   ✓ Works on iOS Safari and Android Chrome
 */

interface FormData {
  recipientPhone: string;
  recipientName: string;
  amount: string;
  currency: string;
  network: string;
  reference: string;
  note: string;
}

interface FormErrors {
  [key: string]: string;
}

const CURRENCIES = [
  { value: 'XLM', label: 'XLM — Stellar Lumens' },
  { value: 'USDC', label: 'USDC — USD Coin' },
  { value: 'NGN', label: 'NGN — Nigerian Naira' },
  { value: 'KES', label: 'KES — Kenyan Shilling' },
  { value: 'GHS', label: 'GHS — Ghanaian Cedi' },
];

const NETWORKS = [
  { value: 'MTN', label: 'MTN Mobile Money' },
  { value: 'AIRTEL', label: 'Airtel Money' },
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'VODAFONE', label: 'Vodafone Cash' },
];

const INITIAL_FORM: FormData = {
  recipientPhone: '',
  recipientName: '',
  amount: '',
  currency: 'USDC',
  network: 'MTN',
  reference: '',
  note: '',
};

export default function PaymentForm(): React.JSX.Element {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // Scroll focused input into view when the virtual keyboard appears (iOS/Android)
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        formRef.current?.contains(target) &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA')
      ) {
        // Small delay to let keyboard animate open
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 350);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
      // Clear error on edit
      setErrors((prev) => {
        if (!prev[name]) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      });
    },
    [],
  );

  const validate = useCallback((): FormErrors => {
    const errs: FormErrors = {};
    if (!form.recipientPhone.trim()) {
      errs.recipientPhone = 'Recipient phone number is required';
    } else if (!/^\+?\d{7,15}$/.test(form.recipientPhone.replace(/\s/g, ''))) {
      errs.recipientPhone = 'Enter a valid phone number (e.g. +2348012345678)';
    }
    if (!form.recipientName.trim()) {
      errs.recipientName = 'Recipient name is required';
    }
    if (!form.amount.trim()) {
      errs.amount = 'Amount is required';
    } else if (Number(form.amount) <= 0 || isNaN(Number(form.amount))) {
      errs.amount = 'Enter a valid positive amount';
    }
    if (!form.currency) errs.currency = 'Select a currency';
    if (!form.network) errs.network = 'Select a network';
    return errs;
  }, [form]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3500);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const errs = validate();
      setErrors(errs);

      if (Object.keys(errs).length > 0) {
        // Focus the first errored field
        const firstKey = Object.keys(errs)[0];
        const el = formRef.current?.querySelector<HTMLElement>(`[name="${firstKey}"]`);
        el?.focus();
        return;
      }

      setSubmitting(true);

      // Simulate API call (replace with actual endpoint)
      try {
        await new Promise((resolve) => setTimeout(resolve, 1800));
        showToast('✓ Payment initiated successfully!');
        setForm(INITIAL_FORM);
      } catch {
        showToast('✗ Payment failed. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [validate, showToast],
  );

  const estimatedFee = form.amount
    ? (Number(form.amount) * 0.015).toFixed(2)
    : '0.00';

  return (
    <div className="payment-page">
      {/* Success / Error Toast */}
      <div
        className={`payment-toast${toastVisible ? ' payment-toast--visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        {toastMessage}
      </div>

      <div className="payment-card">
        {/* Header */}
        <div className="payment-card__header">
          <div className="payment-card__icon" aria-hidden="true">
            💸
          </div>
          <h1 className="payment-card__title">Initiate Payment</h1>
          <p className="payment-card__subtitle">
            Send funds via Mobile Money ↔ Stellar bridge
          </p>
        </div>

        <hr className="payment-card__divider" />

        {/* Form */}
        <form
          ref={formRef}
          className="payment-form"
          onSubmit={handleSubmit}
          noValidate
          autoComplete="off"
        >
          {/* Recipient Phone */}
          <div className="payment-form__group">
            <label htmlFor="pay-phone" className="payment-form__label payment-form__label--required">
              Recipient Phone
            </label>
            <input
              id="pay-phone"
              name="recipientPhone"
              type="tel"
              inputMode="tel"
              className={`payment-form__input${errors.recipientPhone ? ' payment-form__input--error' : ''}`}
              placeholder="+234 801 234 5678"
              value={form.recipientPhone}
              onChange={handleChange}
              autoComplete="tel"
            />
            {errors.recipientPhone && (
              <p className="payment-form__error" role="alert">
                {errors.recipientPhone}
              </p>
            )}
          </div>

          {/* Recipient Name */}
          <div className="payment-form__group">
            <label htmlFor="pay-name" className="payment-form__label payment-form__label--required">
              Recipient Name
            </label>
            <input
              id="pay-name"
              name="recipientName"
              type="text"
              className={`payment-form__input${errors.recipientName ? ' payment-form__input--error' : ''}`}
              placeholder="Jane Doe"
              value={form.recipientName}
              onChange={handleChange}
              autoComplete="name"
            />
            {errors.recipientName && (
              <p className="payment-form__error" role="alert">
                {errors.recipientName}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="payment-form__group">
            <label htmlFor="pay-amount" className="payment-form__label payment-form__label--required">
              Amount
            </label>
            <div className="payment-form__amount-wrapper">
              <input
                id="pay-amount"
                name="amount"
                type="number"
                inputMode="decimal"
                className={`payment-form__input${errors.amount ? ' payment-form__input--error' : ''}`}
                placeholder="0.00"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
              />
              <span className="payment-form__currency-tag">{form.currency}</span>
            </div>
            {errors.amount && (
              <p className="payment-form__error" role="alert">
                {errors.amount}
              </p>
            )}
          </div>

          {/* Currency */}
          <div className="payment-form__group">
            <label htmlFor="pay-currency" className="payment-form__label payment-form__label--required">
              Currency
            </label>
            <select
              id="pay-currency"
              name="currency"
              className={`payment-form__select${errors.currency ? ' payment-form__select--error' : ''}`}
              value={form.currency}
              onChange={handleChange}
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.currency && (
              <p className="payment-form__error" role="alert">
                {errors.currency}
              </p>
            )}
          </div>

          {/* Mobile Money Network */}
          <div className="payment-form__group">
            <label htmlFor="pay-network" className="payment-form__label payment-form__label--required">
              Network
            </label>
            <select
              id="pay-network"
              name="network"
              className={`payment-form__select${errors.network ? ' payment-form__select--error' : ''}`}
              value={form.network}
              onChange={handleChange}
            >
              {NETWORKS.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
            {errors.network && (
              <p className="payment-form__error" role="alert">
                {errors.network}
              </p>
            )}
          </div>

          {/* Payment Reference */}
          <div className="payment-form__group">
            <label htmlFor="pay-ref" className="payment-form__label">
              Reference
            </label>
            <input
              id="pay-ref"
              name="reference"
              type="text"
              className="payment-form__input"
              placeholder="INV-2026-001 (optional)"
              value={form.reference}
              onChange={handleChange}
            />
          </div>

          {/* Note */}
          <div className="payment-form__group payment-form__group--full">
            <label htmlFor="pay-note" className="payment-form__label">
              Note
            </label>
            <textarea
              id="pay-note"
              name="note"
              className="payment-form__textarea"
              placeholder="Add a note for the recipient (optional)"
              value={form.note}
              onChange={handleChange}
              rows={3}
            />
          </div>

          {/* Fee Summary */}
          <div className="payment-form__summary">
            <span className="payment-form__summary-label">Estimated Fee (1.5%)</span>
            <span className="payment-form__summary-value">
              {estimatedFee} {form.currency}
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="payment-form__submit"
            disabled={submitting}
            id="pay-submit-btn"
          >
            {submitting ? (
              <>
                <span className="payment-form__spinner" />
                Processing…
              </>
            ) : (
              'Send Payment'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
