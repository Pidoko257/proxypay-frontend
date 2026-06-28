import React from 'react';
import Layout from '@theme/Layout';
import PaymentForm from '../components/PaymentForm';
import { PaymentFormData } from '../validation/paymentFormSchema';

export default function PaymentDemoPage(): React.JSX.Element {
  const handlePaymentSubmit = (data: PaymentFormData) => {
    console.log('Payment submitted:', data);
    alert(`Payment initiated:\nCurrency: ${data.currency}\nAmount: ${data.amount}\nRecipient: ${data.recipient}`);
  };

  return (
    <Layout title="Payment Form Demo" description="Payment initiation form with currency validation">
      <main style={{ padding: '2rem 1.5rem', maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ marginBottom: '1rem' }}>Payment Form Demo</h1>
        <p style={{ marginBottom: '2rem', color: '#4b5563' }}>
          This form demonstrates client-side validation for payment amounts with currency-specific constraints.
          The amount field validates against minimum/maximum limits and decimal precision based on the selected currency.
        </p>
        
        <PaymentForm onSubmit={handlePaymentSubmit} />
        
        <div style={{ marginTop: '3rem', padding: '1.5rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Validation Features</h3>
          <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
            <li><strong>Currency-specific limits:</strong> Each currency has configurable min/max amounts</li>
            <li><strong>Decimal precision:</strong> Fiat currencies allow 2 decimals, XLM allows 7 decimals</li>
            <li><strong>Real-time validation:</strong> Errors appear on blur and on submit</li>
            <li><strong>Inline error messages:</strong> Clear feedback below the amount field</li>
            <li><strong>Dynamic schema:</strong> Validation rules update when currency changes</li>
          </ul>
        </div>
      </main>
    </Layout>
  );
}
