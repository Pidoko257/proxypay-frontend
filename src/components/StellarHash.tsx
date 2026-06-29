import React, { useState, useCallback } from 'react';

interface StellarHashProps {
  hash: string;
  network?: 'mainnet' | 'testnet';
  truncatePrefix?: number;
  truncateSuffix?: number;
}

const STELLAR_EXPLORER_URLS: Record<string, string> = {
  mainnet: 'https://stellar.expert/explorer/public/tx',
  testnet: 'https://stellar.expert/explorer/testnet/tx',
};

export default function StellarHash({
  hash,
  network = 'testnet',
  truncatePrefix = 6,
  truncateSuffix = 6,
}: StellarHashProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const truncated = `${hash.slice(0, truncatePrefix)}...${hash.slice(-truncateSuffix)}`;
  const explorerUrl = `${STELLAR_EXPLORER_URLS[network]}/${hash}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = hash;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [hash]);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
        fontSize: '0.875rem',
        position: 'relative',
      }}
    >
      <span
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{ cursor: 'default', position: 'relative' }}
      >
        <code>{truncated}</code>
        {showTooltip && (
          <span
            style={{
              position: 'absolute',
              bottom: '125%',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#1c1e21',
              color: '#fff',
              padding: '0.3rem 0.6rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              zIndex: 1000,
              pointerEvents: 'none',
            }}
          >
            {hash}
          </span>
        )}
      </span>

      <button
        onClick={handleCopy}
        title="Copy hash"
        style={{
          background: 'none',
          border: '1px solid var(--ifm-color-emphasis-300)',
          borderRadius: '4px',
          cursor: 'pointer',
          padding: '0.2rem 0.4rem',
          fontSize: '0.75rem',
          lineHeight: 1,
        }}
      >
        {copied ? '✓' : '📋'}
      </button>

      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`View on Stellar Explorer (${network})`}
        style={{
          textDecoration: 'none',
          fontSize: '0.75rem',
        }}
      >
        ↗
      </a>
    </span>
  );
}
