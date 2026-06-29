import React, { useMemo } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Layout from '@theme/Layout';
import StellarTransactionOperationsCard, { Network } from '../components/StellarTransactionOperationsCard';

function TransactionPageClient(): React.JSX.Element {
  const searchParams = useMemo(() => {
    if (typeof window === 'undefined') {
      return new URLSearchParams();
    }
    return new URLSearchParams(window.location.search);
  }, []);

  const transactionHash = searchParams.get('hash')?.trim() ?? '';
  const networkParam = searchParams.get('network')?.trim().toLowerCase();
  const network: Network = networkParam === 'testnet' ? 'testnet' : 'mainnet';

  return (
    <main style={{ padding: '2rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
      <h1>Transaction details</h1>
      <p>
        Enter a transaction hash as <code>?hash=&lt;transaction_hash&gt;</code>. Add <code>&network=testnet</code> to
        view testnet operations.
      </p>

      {!transactionHash ? (
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            background: '#f8fafc',
            padding: '1rem',
            marginTop: '1.5rem',
          }}
        >
          <strong>Missing transaction hash</strong>
          <p style={{ margin: '0.5rem 0 0' }}>
            Please provide a Stellar transaction hash in the URL query string to fetch operations.
          </p>
        </div>
      ) : (
        <StellarTransactionOperationsCard transactionHash={transactionHash} network={network} />
      )}
    </main>
  );
}

export default function TransactionPage(): React.JSX.Element {
  return (
    <Layout title="Transaction Details" description="ProxyPay transaction detail dashboard page">
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading transaction details...</p>}>
        {() => <TransactionPageClient />}
      </BrowserOnly>
    </Layout>
  );
}
