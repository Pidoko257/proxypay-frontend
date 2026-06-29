import React, { useState, useCallback } from 'react';

const HORIZON_URL = 'https://horizon.stellar.org';

type Asset = { type: 'native' } | { type: 'credit_alphanum4' | 'credit_alphanum12'; code: string; issuer: string };

type PathRecord = {
  source_amount: string;
  destination_amount: string;
  path: Asset[];
  source_asset_type: string;
  source_asset_code?: string;
  destination_asset_type: string;
  destination_asset_code?: string;
};

function assetLabel(asset: Asset): string {
  if (asset.type === 'native') return 'XLM';
  return (asset as { type: string; code: string }).code;
}

function buildHorizonAssetParams(prefix: 'source' | 'destination', code: string): Record<string, string> {
  const clean = code.trim().toUpperCase();
  if (clean === 'XLM') return { [`${prefix}_asset_type`]: 'native' };
  return {
    [`${prefix}_asset_type`]: clean.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12',
    [`${prefix}_asset_code`]: clean,
    [`${prefix}_asset_issuer`]: '',
  };
}

function PathArrow() {
  return <span style={{ color: '#94a3b8', fontSize: 18, margin: '0 4px' }}>→</span>;
}

function AssetBadge({ label, highlight = false }: { label: string; highlight?: boolean }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      background: highlight ? '#6366f1' : '#e2e8f0', color: highlight ? '#fff' : '#334155',
    }}>
      {label}
    </span>
  );
}

function RateLabel({ src, dst }: { src: string; dst: string }) {
  const srcAmt = parseFloat(src);
  const dstAmt = parseFloat(dst);
  if (!srcAmt || !dstAmt) return null;
  const rate = (dstAmt / srcAmt).toFixed(6);
  return <span style={{ color: '#64748b', fontSize: 11, marginLeft: 6 }}>1 src ≈ {rate} dst</span>;
}

export default function StellarPathVisualizer() {
  const [sourceAsset, setSourceAsset] = useState('XLM');
  const [destAsset, setDestAsset] = useState('USDC');
  const [amount, setAmount] = useState('100');
  const [paths, setPaths] = useState<PathRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPaths = useCallback(async () => {
    setLoading(true);
    setError('');
    setPaths([]);
    try {
      const srcParams = buildHorizonAssetParams('source', sourceAsset);
      const dstParams = buildHorizonAssetParams('destination', destAsset);

      const qs = new URLSearchParams({
        ...srcParams,
        ...dstParams,
        destination_amount: amount,
      });
      // remove empty issuer params
      for (const k of [...qs.keys()]) {
        if (qs.get(k) === '') qs.delete(k);
      }

      const res = await fetch(`${HORIZON_URL}/paths/strict-receive?${qs}`);
      if (!res.ok) throw new Error(`Horizon returned ${res.status}`);
      const data = await res.json();
      setPaths((data._embedded?.records ?? []).slice(0, 5));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch paths');
    } finally {
      setLoading(false);
    }
  }, [sourceAsset, destAsset, amount]);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 700 }}>
      <h3 style={{ marginBottom: 4, color: '#1e293b' }}>Stellar Path Payment Visualizer</h3>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
        Discover asset paths across the Stellar DEX via the Horizon API.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <label style={labelStyle}>
          <span style={spanStyle}>Source Asset</span>
          <input value={sourceAsset} onChange={e => setSourceAsset(e.target.value)} style={inputStyle} placeholder="XLM" />
        </label>
        <label style={labelStyle}>
          <span style={spanStyle}>Destination Asset</span>
          <input value={destAsset} onChange={e => setDestAsset(e.target.value)} style={inputStyle} placeholder="USDC" />
        </label>
        <label style={labelStyle}>
          <span style={spanStyle}>Amount (destination)</span>
          <input value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} type="number" min="0" placeholder="100" />
        </label>
        <button onClick={fetchPaths} disabled={loading} style={btnStyle}>
          {loading ? 'Searching…' : 'Find Paths'}
        </button>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>Error: {error}</div>}

      {paths.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
            Top {paths.length} path{paths.length > 1 ? 's' : ''} found
          </div>
          {paths.map((p, i) => {
            const srcLabel = p.source_asset_code ?? 'XLM';
            const dstLabel = p.destination_asset_code ?? 'XLM';
            return (
              <div key={i} style={{
                border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px',
                marginBottom: 10, background: i === 0 ? '#f8faff' : '#fff',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginRight: 6 }}>
                    #{i + 1}{i === 0 ? ' BEST' : ''}
                  </span>
                  <AssetBadge label={srcLabel} highlight />
                  {p.path.length > 0 && p.path.map((hop, hi) => (
                    <React.Fragment key={hi}>
                      <PathArrow />
                      <AssetBadge label={assetLabel(hop)} />
                    </React.Fragment>
                  ))}
                  <PathArrow />
                  <AssetBadge label={dstLabel} highlight />
                </div>
                <div style={{ fontSize: 12, color: '#475569', display: 'flex', gap: 16 }}>
                  <span>Source: <strong>{parseFloat(p.source_amount).toFixed(4)} {srcLabel}</strong></span>
                  <span>Destination: <strong>{parseFloat(p.destination_amount).toFixed(4)} {dstLabel}</strong></span>
                  <RateLabel src={p.source_amount} dst={p.destination_amount} />
                </div>
                {p.path.length === 0 && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Direct exchange (no hops)</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && paths.length === 0 && !error && (
        <div style={{ color: '#94a3b8', fontSize: 13 }}>Enter source/destination assets and click "Find Paths".</div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const spanStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' };
const inputStyle: React.CSSProperties = {
  padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db',
  fontSize: 13, width: 130, outline: 'none',
};
const btnStyle: React.CSSProperties = {
  alignSelf: 'flex-end', padding: '7px 18px', borderRadius: 6, border: 'none',
  background: '#6366f1', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13,
};
