import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import InteractiveExample from '../components/InteractiveExample';

export default function Home(): React.JSX.Element {
  return (
    <Layout title="Developer Portal" description="ProxyPay partner API docs">
      <main style={{ padding: '4rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <h1>ProxyPay API Documentation Portal</h1>
        <p>
          This portal publishes a searchable, first-class API reference for partners using the
          canonical <code>openapi.yaml</code> in this repository.
        </p>
        <p>
          <Link className="button button--primary button--lg" to="/api">
            Open API Reference
          </Link>
        </p>

        <h2 style={{ marginTop: '3rem' }}>Interactive Examples</h2>
        <p style={{ color: 'var(--ifm-font-color-secondary)' }}>
          Try out the API with these interactive code examples. You can modify the code and run it directly in your browser.
        </p>

        <InteractiveExample
          title="Making a GET Request"
          description="Example of how to make a simple GET request to the ProxyPay API"
          initialCode={`// Example: Fetch payment status
const paymentId = 'pay_1234567890';

// Simulate API response
const response = {
  id: paymentId,
  status: 'completed',
  amount: 100.00,
  currency: 'USD',
  created_at: '2024-01-15T10:30:00Z'
};

console.log('Payment Status:', response.status);
console.log('Amount:', response.amount, response.currency);
response;`}
        />

        <InteractiveExample
          title="Creating a Payment"
          description="Example of how to create a new payment using the API"
          initialCode={`// Example: Create a new payment
const paymentData = {
  amount: 50.00,
  currency: 'USD',
  description: 'Test payment',
  customer_id: 'cust_9876543210'
};

// Simulate API response
const response = {
  id: 'pay_new_' + Date.now(),
  status: 'pending',
  ...paymentData,
  created_at: new Date().toISOString()
};

console.log('Payment created with ID:', response.id);
console.log('Status:', response.status);
response;`}
        />

        <InteractiveExample
          title="Error Handling"
          description="Example of how to handle API errors properly"
          initialCode={`// Example: Error handling
function handleApiResponse(response) {
  if (response.status >= 400 && response.status < 500) {
    console.error('Client error:', response.message);
    return null;
  }
  if (response.status >= 500) {
    console.error('Server error:', response.message);
    return null;
  }
  return response.data;
}

// Test with error response
const errorResponse = {
  status: 401,
  message: 'Invalid API token'
};

const result = handleApiResponse(errorResponse);
console.log('Result:', result);`}
        />
      </main>
    </Layout>
  );
}
