import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPaymentFormSchema, PaymentFormData } from '../validation/paymentFormSchema';
import { getSupportedCurrencies, getCurrencyConfig } from '../config/currencyValidation';

interface PaymentFormProps {
  onSubmit?: (data: PaymentFormData) => void;
  defaultCurrency?: string;
}

export default function PaymentForm({ onSubmit, defaultCurrency = 'XAF' }: PaymentFormProps) {
  const [selectedCurrency, setSelectedCurrency] = React.useState(defaultCurrency);
  const supportedCurrencies = getSupportedCurrencies();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(createPaymentFormSchema(selectedCurrency)),
    defaultValues: {
      currency: defaultCurrency,
      amount: '',
      recipient: '',
      description: '',
    },
  });

  const watchedCurrency = watch('currency');

  // Update schema when currency changes
  useEffect(() => {
    if (watchedCurrency) {
      setSelectedCurrency(watchedCurrency);
      // Re-validate amount field when currency changes
      trigger('amount');
    }
  }, [watchedCurrency, trigger]);

  const currencyConfig = getCurrencyConfig(selectedCurrency);

  const handleFormSubmit = (data: PaymentFormData) => {
    console.log('Form submitted:', data);
    onSubmit?.(data);
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Payment Initiation</h2>
      
      <form onSubmit={handleSubmit(handleFormSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Currency Selection */}
        <div>
          <label
            htmlFor="currency"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            Currency
          </label>
          <select
            id="currency"
            {...register('currency')}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '1rem',
              backgroundColor: 'white',
            }}
          >
            {supportedCurrencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency} - {getCurrencyConfig(currency).name}
              </option>
            ))}
          </select>
          {errors.currency && (
            <span style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
              {errors.currency.message}
            </span>
          )}
        </div>

        {/* Amount Field with Validation */}
        <div>
          <label
            htmlFor="amount"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            Amount ({selectedCurrency})
          </label>
          <input
            id="amount"
            type="number"
            step={currencyConfig.type === 'crypto' ? '0.0000001' : '0.01'}
            placeholder={`Enter amount (${currencyConfig.min} - ${currencyConfig.max})`}
            {...register('amount', {
              onBlur: () => trigger('amount'),
            })}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: errors.amount ? '1px solid #dc2626' : '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '1rem',
            }}
          />
          {/* Inline error message */}
          {errors.amount && (
            <span style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
              {errors.amount.message}
            </span>
          )}
          {/* Validation hint */}
          {!errors.amount && (
            <span style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
              Min: {currencyConfig.min} {selectedCurrency} | Max: {currencyConfig.max} {selectedCurrency} | 
              Max decimals: {currencyConfig.decimalPlaces}
            </span>
          )}
        </div>

        {/* Recipient Field */}
        <div>
          <label
            htmlFor="recipient"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            Recipient
          </label>
          <input
            id="recipient"
            type="text"
            placeholder="Enter recipient phone number or address"
            {...register('recipient')}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: errors.recipient ? '1px solid #dc2626' : '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '1rem',
            }}
          />
          {errors.recipient && (
            <span style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
              {errors.recipient.message}
            </span>
          )}
        </div>

        {/* Description Field (Optional) */}
        <div>
          <label
            htmlFor="description"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            Description (Optional)
          </label>
          <textarea
            id="description"
            rows={3}
            placeholder="Enter payment description"
            {...register('description')}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '1rem',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          style={{
            padding: '0.875rem 1.5rem',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
        >
          Initiate Payment
        </button>
      </form>
    </div>
  );
}
