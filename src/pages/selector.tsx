import React from 'react';
import Layout from '@theme/Layout';
import CountryCurrencySelector from '../components/CountryCurrencySelector';

export default function SelectorPage(): React.JSX.Element {
  return (
    <Layout title="Country & Currency Selector" description="Searchable country and currency selector demo">
      <main style={{ padding: '2rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <h1>Country and Currency Selector</h1>
        <p>
          Search for supported countries by name, currency code, or country code. Each option
          displays the country flag, name, currency code, and supported mobile money providers.
        </p>

        <h2>Select a Country</h2>
        <CountryCurrencySelector
          onSelect={(country) => {
            alert(`Selected: ${country.name} (${country.currency})`);
          }}
        />
      </main>
    </Layout>
  );
}
