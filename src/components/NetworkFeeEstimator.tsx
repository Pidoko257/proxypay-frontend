import React, { useEffect, useState, useRef } from 'react';

type Props = {
  operations?: number;
};

export default function NetworkFeeEstimator({ operations = 1 }: Props): React.JSX.Element {
  const [xlmFee, setXlmFee] = useState<number | null>(null);
  const [usdFee, setUsdFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  async function fetchFees() {
    setLoading(true);
    setError(null);
    try {
      const horizonResp = await fetch('https://horizon.stellar.org/fee_stats');
      if (!horizonResp.ok) throw new Error('Failed to fetch Horizon fee stats');
      const horizon = await horizonResp.json();

      const baseFeeStroops = Number(horizon.last_ledger_base_fee ?? horizon.base_fee ?? 100);
      const xlm = (baseFeeStroops * operations) * 1e-7;

      const priceResp = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd'
      );
      if (!priceResp.ok) throw new Error('Failed to fetch XLM price');
      const priceData = await priceResp.json();
      const usdPerXlm = Number(priceData?.stellar?.usd ?? 0);

      if (!mounted.current) return;
      setXlmFee(xlm);
      setUsdFee(xlm * usdPerXlm);
    } catch (err: any) {
      if (!mounted.current) return;
      setError(String(err.message ?? err));
      setXlmFee(null);
      setUsdFee(null);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    fetchFees();
    const id = setInterval(() => {
      fetchFees();
    }, 30_000);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operations]);

  const formatXlm = (n: number | null) => (n == null ? '—' : n.toFixed(7).replace(/0+$/, '').replace(/\.$/, ''));
  const formatUsd = (n: number | null) => (n == null ? '—' : `$${n.toFixed(2)}`);

  return (
    <div style={{ border: '1px solid #e6e6e6', padding: 12, borderRadius: 6, maxWidth: 420 }}>
      <div style={{ fontSize: 14, marginBottom: 6, fontWeight: 600 }}>Estimated network fee</div>
      <div style={{ fontSize: 16 }}>
        {loading ? (
          'Loading...'
        ) : error ? (
          <span style={{ color: 'crimson' }}>Error: {error}</span>
        ) : (
          <>
            {formatXlm(xlmFee)} XLM {xlmFee != null && usdFee != null ? `(${formatUsd(usdFee)})` : null}
          </>
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
        This is an estimate based on the current base fee and transaction complexity; the actual
        network fee may vary when the transaction is submitted.
      </div>
    </div>
  );
}
