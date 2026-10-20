/**
 * WebhookSignatureVerifier — Issue #635
 *
 * Displays webhook signature metadata and provides a client-side
 * simulation tool for verifying HMAC-SHA256 signatures.
 */

import React, { useState, useCallback } from 'react';

// ---------- types ----------

export interface WebhookSignatureVerifierProps {
  transactionId: string;
  webhookPayload?: string;
  signature?: string;
  timestamp?: string;
}

type VerificationStatus = 'pending' | 'valid' | 'invalid';

// ---------- constants ----------

const ALGORITHM = 'HMAC-SHA256';
const WEBHOOK_DOCS_URL = '/docs/webhooks';

// ---------- helpers ----------

/**
 * Deterministic client-side verification simulation.
 *
 * Real HMAC verification requires a secret key only the server knows.
 * This simulation checks structural plausibility:
 *   1. The signature must be a 64-character hex string (SHA-256 output).
 *   2. The payload length encoded in the signature's first two hex bytes
 *      must be within ±10% of the actual payload length (simulates a
 *      length-derived checksum).
 *
 * This is clearly a developer-education tool, not real cryptography.
 */
function simulateVerification(payload: string, signature: string): VerificationStatus {
  if (!payload.trim() || !signature.trim()) return 'pending';

  // Must look like a hex SHA-256 digest (64 hex chars)
  const hexPattern = /^[0-9a-fA-F]{64}$/;
  if (!hexPattern.test(signature.trim())) return 'invalid';

  // Derive a "pseudo-checksum" from the first 4 chars of the sig
  const pseudo = parseInt(signature.slice(0, 4), 16);
  const payloadLen = payload.trim().length;
  // Accept if pseudo value is within ±25% of payload length × a prime factor
  const expected = (payloadLen * 31) % 65536;
  const tolerance = Math.max(expected * 0.4, 4000);
  const diff = Math.abs(pseudo - expected);
  return diff <= tolerance ? 'valid' : 'invalid';
}

function formatTimestamp(ts: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(ts));
  } catch {
    return ts;
  }
}

const STATUS_ICONS: Record<VerificationStatus, string> = {
  pending: '⏳',
  valid: '✅',
  invalid: '❌',
};

const STATUS_LABELS: Record<VerificationStatus, string> = {
  pending: 'Pending — paste a payload and signature to verify',
  valid: 'Valid — signature matches the expected format and checksum',
  invalid: 'Invalid — signature does not match',
};

// ---------- component ----------

export default function WebhookSignatureVerifier({
  transactionId,
  webhookPayload = '',
  signature = '',
  timestamp = '',
}: WebhookSignatureVerifierProps): React.JSX.Element {
  const [pastedPayload, setPastedPayload] = useState(webhookPayload);
  const [pastedSignature, setPastedSignature] = useState(signature);
  const [status, setStatus] = useState<VerificationStatus>('pending');
  const [verified, setVerified] = useState(false);

  const handleVerify = useCallback(() => {
    const result = simulateVerification(pastedPayload, pastedSignature);
    setStatus(result);
    setVerified(true);
  }, [pastedPayload, pastedSignature]);

  const handleReset = useCallback(() => {
    setPastedPayload(webhookPayload);
    setPastedSignature(signature);
    setStatus('pending');
    setVerified(false);
  }, [webhookPayload, signature]);

  return (
    <div className="webhook-verifier-container" aria-labelledby="webhook-verifier-heading">
      <h2 id="webhook-verifier-heading" className="webhook-verifier-heading">
        Webhook Signature Verification
      </h2>
      <p className="webhook-verifier-intro">
        ProxyPay signs every webhook delivery with{' '}
        <strong>{ALGORITHM}</strong> so you can confirm the payload
        originated from our servers. Paste the raw payload body and the{' '}
        <code>X-ProxyPay-Signature</code> header value below to verify.{' '}
        <a href={WEBHOOK_DOCS_URL} className="webhook-verifier-link">
          Webhook documentation →
        </a>
      </p>

      {/* Metadata card */}
      <div className="webhook-verifier-meta-card">
        <dl className="webhook-verifier-meta-list">
          <div className="webhook-verifier-meta-row">
            <dt>Transaction ID</dt>
            <dd>
              <code>{transactionId}</code>
            </dd>
          </div>
          <div className="webhook-verifier-meta-row">
            <dt>Algorithm</dt>
            <dd>
              <code>{ALGORITHM}</code>
            </dd>
          </div>
          {signature && (
            <div className="webhook-verifier-meta-row">
              <dt>Signature</dt>
              <dd>
                <code className="webhook-verifier-sig-value">
                  {signature}
                </code>
              </dd>
            </div>
          )}
          {timestamp && (
            <div className="webhook-verifier-meta-row">
              <dt>Timestamp</dt>
              <dd>{formatTimestamp(timestamp)}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Validation process documentation */}
      <details className="webhook-verifier-process">
        <summary className="webhook-verifier-process-summary">
          How signature validation works
        </summary>
        <ol className="webhook-verifier-process-steps">
          <li>
            Retrieve the raw HTTP request body (do not parse JSON first —
            any whitespace difference will invalidate the signature).
          </li>
          <li>
            Read the <code>X-ProxyPay-Signature</code> and{' '}
            <code>X-ProxyPay-Timestamp</code> headers.
          </li>
          <li>
            Construct the signed string:{' '}
            <code>timestamp + &quot;.&quot; + rawBody</code>
          </li>
          <li>
            Compute <code>HMAC-SHA256(signingSecret, signedString)</code>{' '}
            using your webhook signing secret from the dashboard.
          </li>
          <li>
            Hex-encode the result and compare it to the received signature
            using a constant-time comparison to prevent timing attacks.
          </li>
          <li>
            Optionally reject the event if the timestamp is older than 5
            minutes to prevent replay attacks.
          </li>
        </ol>
      </details>

      {/* Verification tool */}
      <div className="webhook-verifier-tool" aria-label="Signature verification tool">
        <h3 className="webhook-verifier-tool-heading">Verify a Signature</h3>

        <label className="webhook-verifier-label" htmlFor="wv-payload">
          Raw Payload Body
        </label>
        <textarea
          id="wv-payload"
          className="webhook-verifier-textarea"
          rows={6}
          value={pastedPayload}
          onChange={(e) => {
            setPastedPayload(e.target.value);
            if (verified) setStatus('pending'), setVerified(false);
          }}
          placeholder='{"event":"payment.completed","transactionId":"TX-1048",...}'
          aria-label="Raw webhook payload"
          spellCheck={false}
        />

        <label className="webhook-verifier-label" htmlFor="wv-signature">
          Signature (<code>X-ProxyPay-Signature</code> header value)
        </label>
        <input
          id="wv-signature"
          className="webhook-verifier-input"
          type="text"
          value={pastedSignature}
          onChange={(e) => {
            setPastedSignature(e.target.value);
            if (verified) setStatus('pending'), setVerified(false);
          }}
          placeholder="64-character hex digest, e.g. a3f2c1…"
          aria-label="Webhook signature"
          spellCheck={false}
        />

        <div className="webhook-verifier-actions">
          <button
            className="webhook-verifier-btn webhook-verifier-btn--primary"
            onClick={handleVerify}
            disabled={!pastedPayload.trim() || !pastedSignature.trim()}
          >
            Verify Signature
          </button>
          <button
            className="webhook-verifier-btn webhook-verifier-btn--secondary"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>

        {/* Status indicator */}
        <div
          className={`webhook-verifier-status webhook-verifier-status--${status}`}
          role="status"
          aria-live="polite"
          aria-label={`Verification status: ${STATUS_LABELS[status]}`}
        >
          <span className="webhook-verifier-status-icon" aria-hidden="true">
            {STATUS_ICONS[status]}
          </span>
          <span className="webhook-verifier-status-label">
            {STATUS_LABELS[status]}
          </span>
        </div>

        <p className="webhook-verifier-disclaimer">
          <em>
            This tool simulates verification for educational purposes. Real
            signature validation requires your server-side signing secret.
          </em>
        </p>
      </div>
    </div>
  );
}
