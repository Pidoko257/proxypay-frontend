import React, { useState } from 'react';
import HelpTooltip from './HelpTooltip';

const brand = '#2e8555';

export default function TooltipDemo(): JSX.Element {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [recipient, setRecipient] = useState('');
  const [memo, setMemo] = useState('');

  return (
    <>
      <style>{`
        .td-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          max-width: 760px;
          margin: 0 auto;
          padding: 24px 16px;
          color: #1c1e21;
        }
        .td-container h2 { color: ${brand}; margin-bottom: 4px; }
        .td-container p.subtitle { color: #555; margin-top: 0; margin-bottom: 28px; }
        .td-card {
          border: 1px solid #dde1e7;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
          background: #fff;
        }
        .td-card h3 {
          margin-top: 0;
          color: ${brand};
          font-size: 1rem;
          border-bottom: 1px solid #eee;
          padding-bottom: 8px;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 0;
        }
        .td-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-bottom: 14px;
        }
        .td-field label {
          font-size: 0.84rem;
          font-weight: 600;
          color: #444;
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .td-field input, .td-field select, .td-field textarea {
          padding: 8px 10px;
          border: 1px solid #cdd1d9;
          border-radius: 5px;
          font-size: 0.9rem;
          background: #fafbfc;
          transition: border-color 0.15s;
        }
        .td-field input:focus, .td-field select:focus, .td-field textarea:focus {
          outline: none;
          border-color: ${brand};
        }
        .td-inline-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .td-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.82rem;
          font-weight: 600;
          background: #eafaf1;
          color: ${brand};
          border: 1px solid #b7e4c7;
        }
        .td-metric-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-bottom: 10px;
          font-size: 0.95rem;
        }
        .td-metric-value {
          font-size: 1.4rem;
          font-weight: 800;
          color: #1c1e21;
        }
        .td-metric-label {
          color: #666;
          font-size: 0.85rem;
        }
        .td-section-note {
          font-size: 0.8rem;
          color: #888;
          margin-top: 4px;
          font-style: italic;
        }
        .td-divider {
          border: none;
          border-top: 1px solid #f0f2f5;
          margin: 18px 0;
        }
        .td-status-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 0.9rem;
        }
        .td-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .td-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          background: ${brand};
          color: #fff;
          transition: opacity 0.15s;
        }
        .td-btn:hover { opacity: 0.85; }
      `}</style>

      <div className="td-container">
        <h2>Help &amp; Tooltips Demo</h2>
        <p className="subtitle">
          Hover or focus the <strong>?</strong> icons next to any label to see contextual help.
          Keyboard-navigable: Tab to reach, Enter/Space to toggle, Escape to close.
        </p>

        {/* 1 — Transaction Form */}
        <div className="td-card">
          <h3>
            Send Transaction
            <HelpTooltip
              text="Initiate a Mobile Money ↔ Stellar bridge transaction. Funds are settled on the Stellar network within seconds."
              docLink="/api"
            />
          </h3>

          {/* Field 1: Amount */}
          <div className="td-field">
            <label>
              Amount
              <HelpTooltip
                text="Enter the transaction amount in the selected currency. Minimum is 0.01. Amounts are converted at the live XLM rate before settlement."
                docLink="/api"
              />
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Field 2: Currency */}
          <div className="td-field">
            <label>
              Currency
              <HelpTooltip
                text="Choose the source currency. USD, KES, GHS, and NGN are supported Mobile Money currencies. XLM is the native Stellar token used for settlement."
                docLink="/api"
              />
            </label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD</option>
              <option value="XLM">XLM</option>
              <option value="KES">KES</option>
              <option value="GHS">GHS</option>
              <option value="NGN">NGN</option>
            </select>
          </div>

          {/* Field 3: Recipient */}
          <div className="td-field">
            <label>
              Recipient Address
              <HelpTooltip
                text="A valid Stellar public key (G...) or a registered ProxyPay alias. Aliases are mapped to Stellar addresses in the directory service."
                docLink="/api"
              />
            </label>
            <input
              type="text"
              placeholder="GXXXXXXXXXXXXXXXX or alias@proxypay"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          {/* Field 4: Memo */}
          <div className="td-field">
            <label>
              Memo
              <HelpTooltip
                text="An optional Stellar memo attached to the transaction. Use TEXT memos for human-readable notes (max 28 bytes) or ID memos for numeric reference numbers."
              />
            </label>
            <input
              type="text"
              placeholder="Optional memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          <button className="td-btn">Send Transaction</button>
        </div>

        {/* 2 — Metric Dashboard */}
        <div className="td-card">
          <h3>
            Network Metrics
            <HelpTooltip
              text="Live performance indicators for the ProxyPay bridge network. Values are aggregated over a rolling 5-minute window."
            />
          </h3>

          <div className="td-metric-row">
            <span className="td-metric-value">99.8%</span>
            <span className="td-metric-label">Success Rate</span>
            <HelpTooltip
              text="Percentage of transactions that completed without error in the last 5 minutes. Below 95% triggers an incident alert."
              docLink="/alert-thresholds"
            />
          </div>

          <div className="td-metric-row">
            <span className="td-metric-value">340 ms</span>
            <span className="td-metric-label">Avg Response Time</span>
            <HelpTooltip
              text="Mean end-to-end latency from API request receipt to Stellar ledger confirmation. Measured at the gateway layer."
              docLink="/alert-thresholds"
            />
          </div>

          <div className="td-metric-row">
            <span className="td-metric-value">1,284</span>
            <span className="td-metric-label">Transaction Volume (24h)</span>
            <HelpTooltip
              text="Total number of transactions processed in the last 24 hours across all corridors and currencies."
              docLink="/alert-thresholds"
            />
          </div>

          <hr className="td-divider" />

          <div className="td-status-row">
            <span className="td-dot" style={{ background: '#27ae60' }} />
            <span>All systems operational</span>
            <HelpTooltip
              text="Current operational status. Green = all systems normal. Check the status page for incident history and scheduled maintenance."
            />
          </div>
        </div>

        {/* 3 — Compliance Badge */}
        <div className="td-card">
          <h3>Compliance Status</h3>
          <div className="td-inline-row">
            <span className="td-badge">
              ✓ AML Compliant
            </span>
            <HelpTooltip
              text="This account has passed Anti-Money Laundering (AML) checks. Transactions above $10,000 require additional KYC documentation."
              docLink="/compliance-report"
            />
            <span className="td-badge">
              ✓ KYC Verified
            </span>
            <HelpTooltip
              text="Know Your Customer (KYC) identity verification is complete. Your account is approved for all transaction corridors."
              docLink="/compliance-report"
            />
          </div>
          <p className="td-section-note">
            Compliance status is re-evaluated monthly or when transaction patterns change.
          </p>
        </div>
      </div>
    </>
  );
}
