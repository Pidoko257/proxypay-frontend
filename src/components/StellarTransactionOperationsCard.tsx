import React, { useEffect, useMemo, useState } from 'react';

type Network = 'mainnet' | 'testnet';

type StellarOperation = Record<string, unknown>;

interface Props {
  transactionHash: string;
  network?: Network;
}

const HORIZON_URLS: Record<Network, string> = {
  mainnet: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
};

const stellarexpertUrl = (transactionHash: string, network: Network) => {
  const base = network === 'testnet' ? 'https://stellar.expert/explorer/testnet' : 'https://stellar.expert/explorer/public';
  return `${base}/tx/${transactionHash}`;
};

const formatAsset = (
  amount: unknown,
  assetType: unknown,
  assetCode: unknown,
  assetIssuer: unknown,
): string => {
  const value = typeof amount === 'string' || typeof amount === 'number' ? amount : '—';
  if (assetType === 'native') {
    return `${value} XLM`;
  }

  const code = typeof assetCode === 'string' ? assetCode : 'ASSET';
  return `${value} ${code}`;
};

const renderOperationDetails = (op: StellarOperation) => {
  const type = typeof op.type === 'string' ? op.type : 'operation';

  switch (type) {
    case 'payment':
      return (
        <>
          {formatAsset(op.amount, op.asset_type, op.asset_code, op.asset_issuer)}
          {' to '}
          {typeof op.to === 'string' ? op.to : 'unknown'}
        </>
      );

    case 'path_payment_strict_receive':
      return (
        <>
          receive {formatAsset(op.amount, op.asset_type, op.asset_code, op.asset_issuer)}
          {' from '}
          {typeof op.from === 'string' ? op.from : 'unknown'}
        </>
      );

    case 'path_payment_strict_send':
      return (
        <>
          send {formatAsset(op.send_amount, op.send_asset_type, op.send_asset_code, op.send_asset_issuer)}
          {' to '}
          {typeof op.to === 'string' ? op.to : 'unknown'}
        </>
      );

    case 'manage_sell_offer':
    case 'manage_buy_offer':
      return (
        <>
          {type === 'manage_sell_offer' ? 'Sell' : 'Buy'}{' '}
          {formatAsset(op.amount, op.selling_asset_type, op.selling_asset_code, op.selling_asset_issuer)}
          {' for '}
          {formatAsset(op.buy_amount, op.buying_asset_type, op.buying_asset_code, op.buying_asset_issuer)}
          {typeof op.price === 'string' ? ` @ ${op.price}` : ''}
        </>
      );

    case 'create_account':
      return (
        <>
          create account{' '}
          {typeof op.account === 'string' ? op.account : 'unknown'}
          {' with starting balance '}
          {typeof op.starting_balance === 'string' ? op.starting_balance : '—'} XLM
        </>
      );

    default:
      return <>{JSON.stringify(op, null, 2)}</>;
  }
};

const StellarTransactionOperationsCard = ({ transactionHash, network = 'mainnet' }: Props) => {
  const [operations, setOperations] = useState<StellarOperation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const horizonBase = useMemo(() => HORIZON_URLS[network], [network]);
  const explorerUrl = useMemo(() => stellarexpertUrl(transactionHash, network), [transactionHash, network]);

  useEffect(() => {
    let cancelled = false;

    const fetchOperations = async () => {
      setLoading(true);
      setError(null);
      setOperations(null);

      try {
        const response = await fetch(
          `${horizonBase}/transactions/${encodeURIComponent(transactionHash)}/operations?limit=200`,
        );

        if (response.status === 404) {
          setError(
            `Transaction not found on ${network}. Confirm this hash is for the selected network or switch to testnet/mainnet as appropriate.`,
          );
          return;
        }

        if (!response.ok) {
          const body = await response.text();
          setError(`Unable to load operations: ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`);
          return;
        }

        const data = await response.json();
        const records = Array.isArray(data._embedded?.records) ? data._embedded.records : [];

        if (!cancelled) {
          setOperations(records);
          if (records.length === 0) {
            setError('No Stellar operations were returned for this transaction.');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(`Failed to fetch Stellar operations: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchOperations();

    return () => {
      cancelled = true;
    };
  }, [horizonBase, network, transactionHash]);

  return (
    <section
      style={{
        border: '1px solid rgba(46, 133, 85, 0.15)',
        borderRadius: 16,
        padding: '1.5rem',
        background: 'rgba(46, 133, 85, 0.04)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.05)',
        marginTop: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <p style={{ margin: 0, color: '#205d3b', fontSize: '0.95rem', fontWeight: 700 }}>ProxyPay</p>
          <h2 style={{ margin: '0.35rem 0 0', fontSize: '1.5rem' }}>Stellar transaction operations</h2>
          <p style={{ margin: '0.5rem 0 0', color: '#374151' }}>
            Inline summary of transaction operations sourced from Horizon for hash{' '}
            <code style={{ background: '#f8fafc', padding: '0.1rem 0.35rem', borderRadius: 5 }}>{transactionHash}</code>
          </p>
        </div>

        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer noopener"
          style={{ color: '#2e8555', fontWeight: 600, textDecoration: 'none' }}
        >
          View full StellarExpert details ↗
        </a>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        {loading && <p>Loading Stellar operations…</p>}

        {!loading && error && (
          <div
            style={{
              border: '1px solid #f3c4c4',
              background: '#fff1f2',
              color: '#9f1239',
              borderRadius: 12,
              padding: '1rem',
            }}
          >
            <strong>Unable to display operations:</strong>
            <p style={{ margin: '0.5rem 0 0' }}>{error}</p>
          </div>
        )}

        {!loading && !error && operations && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {operations.map((operation, index) => (
                <div
                  key={`${operation.id ?? index}-${operation.type ?? index}`}
                  style={{
                    border: '1px solid rgba(46, 133, 85, 0.15)',
                    borderRadius: 12,
                    padding: '1rem',
                    background: '#ffffff',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
                    Operation {index + 1}
                  </p>
                  <h3 style={{ margin: '0.35rem 0 0.75rem', fontSize: '1.05rem', color: '#111827' }}>
                    {typeof operation.type === 'string' ? operation.type.replace(/_/g, ' ') : 'Unknown operation'}
                  </h3>
                  <p style={{ margin: 0, color: '#334155' }}>{renderOperationDetails(operation)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export type { Network };
export default StellarTransactionOperationsCard;
