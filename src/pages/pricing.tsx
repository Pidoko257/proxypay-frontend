import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';

interface Provider {
  id: string;
  name: string;
  baseFeePercent: number;
  fixedFee: number;
}

interface DestinationCurrency {
  id: string;
  name: string;
  exchangeRate: number;
  symbol: string;
}

interface FeeConfig {
  providers: Provider[];
  destinationCurrencies: DestinationCurrency[];
  proxypayFee: {
    percent: number;
    minimum: number;
  };
  stellarFee: {
    flatXLM: number;
    xlmPriceUsd: number;
  };
}

// Fallback configuration if fetch fails or during SSR
const FALLBACK_CONFIG: FeeConfig = {
  providers: [
    { id: 'mtn', name: 'MTN Mobile Money', baseFeePercent: 1.2, fixedFee: 0.15 },
    { id: 'orange', name: 'Orange Money', baseFeePercent: 1.5, fixedFee: 0.2 },
    { id: 'mpesa', name: 'M-Pesa', baseFeePercent: 1.0, fixedFee: 0.1 },
    { id: 'stellar_usdc', name: 'Stellar USDC', baseFeePercent: 0.2, fixedFee: 0.02 },
  ],
  destinationCurrencies: [
    { id: 'USD', name: 'US Dollar (USD)', exchangeRate: 1.0, symbol: '$' },
    { id: 'EUR', name: 'Euro (EUR)', exchangeRate: 0.92, symbol: '€' },
    { id: 'KES', name: 'Kenyan Shilling (KES)', exchangeRate: 131.5, symbol: 'KES' },
    { id: 'GHS', name: 'Ghanaian Cedi (GHS)', exchangeRate: 14.8, symbol: 'GH₵' },
    { id: 'XAF', name: 'Central African CFA Franc (XAF)', exchangeRate: 605.2, symbol: 'FCFA' },
  ],
  proxypayFee: {
    percent: 0.5,
    minimum: 0.25,
  },
  stellarFee: {
    flatXLM: 0.00001,
    xlmPriceUsd: 0.12,
  },
};

export default function PricingPage(): React.JSX.Element {
  const [config, setConfig] = useState<FeeConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [amount, setAmount] = useState<number>(100);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('mtn');
  const [selectedDestCurrencyId, setSelectedDestCurrencyId] = useState<string>('GHS');

  // Load fee config from JSON file
  useEffect(() => {
    const loadFeeConfig = async () => {
      try {
        // Fetch from the static directory endpoint (accounting for baseUrl)
        const response = await fetch('/proxypay/fee-config.json');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setConfig(data);
      } catch (err) {
        console.warn('Failed to load remote fee config, falling back to local copy', err);
        setConfig(FALLBACK_CONFIG);
      } finally {
        setLoading(false);
      }
    };
    loadFeeConfig();
  }, []);

  // Compute fee breakdown
  const activeConfig = config || FALLBACK_CONFIG;
  const provider = activeConfig.providers.find((p) => p.id === selectedProviderId) || activeConfig.providers[0];
  const destCurrency = activeConfig.destinationCurrencies.find((c) => c.id === selectedDestCurrencyId) || activeConfig.destinationCurrencies[0];

  // Base fee calculations in USD
  const proxypayFeeUsd = Math.max(activeConfig.proxypayFee.minimum, amount * (activeConfig.proxypayFee.percent / 100));
  const operatorFeeUsd = amount * (provider.baseFeePercent / 100) + provider.fixedFee;
  const stellarFeeUsd = activeConfig.stellarFee.flatXLM * activeConfig.stellarFee.xlmPriceUsd;
  const totalFeesUsd = proxypayFeeUsd + operatorFeeUsd + stellarFeeUsd;
  const netAmountUsd = Math.max(0, amount - totalFeesUsd);

  // Conversion to destination currency
  const rate = destCurrency.exchangeRate;
  const symbol = destCurrency.symbol;

  const grossAmountDest = amount * rate;
  const proxypayFeeDest = proxypayFeeUsd * rate;
  const operatorFeeDest = operatorFeeUsd * rate;
  const stellarFeeDest = stellarFeeUsd * rate;
  const totalFeesDest = totalFeesUsd * rate;
  const netAmountDest = netAmountUsd * rate;

  // Percentage splits for progress indicator
  const feePercent = amount > 0 ? (totalFeesUsd / amount) * 100 : 0;
  const netPercent = amount > 0 ? (netAmountUsd / amount) * 100 : 0;

  return (
    <Layout title="Pricing Calculator" description="ProxyPay transaction fee breakdown calculator">
      <main className="premium-container">
        <div className="premium-header">
          <h1>Payment Fee Calculator</h1>
          <p>Estimate final settlement amounts and calculate standard routing fees across networks in real time.</p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0' }}>
            <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
            <p style={{ marginTop: '1rem', color: 'var(--ifm-color-emphasis-600)' }}>Loading fee rates from config file...</p>
          </div>
        ) : (
          <div className="grid-2">
            
            {/* Input Form Column */}
            <div className="premium-card">
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>💰</span> Calculator Inputs
              </h3>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Send Amount (USD/USDC Value)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--ifm-color-emphasis-500)', fontWeight: 600 }}>$</span>
                  <input
                    type="number"
                    style={{
                      width: '100%',
                      padding: '10px 10px 10px 24px',
                      borderRadius: '6px',
                      border: '1px solid var(--ifm-color-emphasis-300)',
                      fontSize: '1rem',
                      background: 'var(--ifm-background-color)',
                      color: 'inherit',
                    }}
                    value={amount}
                    min="1"
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Source Provider
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--ifm-color-emphasis-300)',
                    fontSize: '1rem',
                    background: 'var(--ifm-background-color)',
                    color: 'inherit',
                  }}
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                >
                  {activeConfig.providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.baseFeePercent}% + ${p.fixedFee.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Destination Settlement Currency
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--ifm-color-emphasis-300)',
                    fontSize: '1rem',
                    background: 'var(--ifm-background-color)',
                    color: 'inherit',
                  }}
                  value={selectedDestCurrencyId}
                  onChange={(e) => setSelectedDestCurrencyId(e.target.value)}
                >
                  {activeConfig.destinationCurrencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Rate: {c.exchangeRate})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Calculations Breakdown Column */}
            <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📊</span> Fee Breakdown & Net Settlement
                </h3>
                
                {/* Visual Ratio Bar */}
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--ifm-color-primary)' }}>Net Received: {netPercent.toFixed(1)}%</span>
                    <span style={{ color: '#ef4444' }}>Fees: {feePercent.toFixed(1)}%</span>
                  </div>
                  <div style={{ display: 'flex', height: '10px', borderRadius: '9999px', overflow: 'hidden', background: '#e2e8f0' }}>
                    <div style={{ width: `${netPercent}%`, backgroundColor: 'var(--ifm-color-primary)', transition: 'width 0.2s ease' }}></div>
                    <div style={{ width: `${feePercent}%`, backgroundColor: '#ef4444', transition: 'width 0.2s ease' }}></div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* ProxyPay Fee */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--ifm-color-emphasis-200)', paddingBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>ProxyPay Service Fee</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ifm-color-emphasis-600)' }}>
                        {activeConfig.proxypayFee.percent}% (min ${activeConfig.proxypayFee.minimum.toFixed(2)})
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>{symbol} {proxypayFeeDest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ifm-color-emphasis-500)' }}>${proxypayFeeUsd.toFixed(2)} USD</div>
                    </div>
                  </div>

                  {/* Operator Fee */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--ifm-color-emphasis-200)', paddingBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Operator Margin ({provider.name})</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ifm-color-emphasis-600)' }}>
                        {provider.baseFeePercent}% + ${provider.fixedFee.toFixed(2)} standard rate
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>{symbol} {operatorFeeDest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ifm-color-emphasis-500)' }}>${operatorFeeUsd.toFixed(2)} USD</div>
                    </div>
                  </div>

                  {/* Stellar Fee */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--ifm-color-emphasis-200)', paddingBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Stellar Network gas fee</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ifm-color-emphasis-600)' }}>
                        Flat {activeConfig.stellarFee.flatXLM.toFixed(5)} XLM (at ${activeConfig.stellarFee.xlmPriceUsd}/XLM)
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>{symbol} {stellarFeeDest.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 })}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ifm-color-emphasis-500)' }}>${stellarFeeUsd.toFixed(5)} USD</div>
                    </div>
                  </div>

                  {/* Total Fees */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', color: '#ef4444' }}>
                    <div style={{ fontWeight: 600 }}>Total Routing Fees</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>- {symbol} {totalFeesDest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div style={{ fontSize: '0.75rem' }}>${totalFeesUsd.toFixed(2)} USD</div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Net Recieved Total */}
              <div style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                borderRadius: '8px',
                backgroundColor: 'var(--ifm-color-primary-lightest)',
                color: '#1b5e20',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', opacity: 0.85 }}>Net Amount Received</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Converted at {rate} / USD</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.6rem' }}>{symbol} {netAmountDest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', opacity: 0.85 }}>${netAmountUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</div>
                </div>
              </div>

            </div>

          </div>
        )}

        <div className="premium-card" style={{ marginTop: '2rem' }}>
          <h4 style={{ marginTop: 0 }}>ℹ️ Fee Policy Notes</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ifm-color-emphasis-700)' }}>
            These figures represent routing estimates. Operator network fees can fluctuate based on real-time mobile money aggregator channels
            and Stellar transaction volume. The calculated pricing updates immediately in the browser on every keypress without needing submission.
          </p>
        </div>
      </main>
    </Layout>
  );
}
