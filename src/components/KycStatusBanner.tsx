import React, { useState } from 'react';
import Link from '@docusaurus/Link';

export type KycStatus = 'pending' | 'approved' | 'rejected' | 'incomplete';

interface BannerConfig {
  message: string;
  ctaLabel: string;
  ctaHref: string;
  backgroundColor: string;
  color: string;
  borderColor: string;
}

const BANNER_CONFIG: Record<KycStatus, BannerConfig> = {
  pending: {
    message: 'Your KYC verification is under review. This typically takes 1–2 business days.',
    ctaLabel: 'Check Status',
    ctaHref: '/kyc/status',
    backgroundColor: '#fff8e1',
    color: '#7c5800',
    borderColor: '#f9a825',
  },
  approved: {
    message: 'Your account is fully verified. All features are unlocked.',
    ctaLabel: 'View Profile',
    ctaHref: '/profile',
    backgroundColor: '#e8f5e9',
    color: '#1b5e20',
    borderColor: '#2e8555',
  },
  rejected: {
    message: 'Your KYC verification was rejected. Please resubmit with valid documents.',
    ctaLabel: 'Resubmit Documents',
    ctaHref: '/kyc/resubmit',
    backgroundColor: '#ffebee',
    color: '#b71c1c',
    borderColor: '#c62828',
  },
  incomplete: {
    message: 'Your KYC verification is incomplete. Complete it to unlock all features.',
    ctaLabel: 'Complete Verification',
    ctaHref: '/kyc/start',
    backgroundColor: '#fff3e0',
    color: '#e65100',
    borderColor: '#ef6c00',
  },
};

export interface KycStatusBannerProps {
  status: KycStatus;
}

export default function KycStatusBanner({
  status,
}: KycStatusBannerProps): React.JSX.Element | null {
  const [dismissed, setDismissed] = useState(false);

  if (status === 'approved' && dismissed) return null;

  const config = BANNER_CONFIG[status];

  return (
    <div
      role="banner"
      aria-label={`KYC status: ${status}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1.5rem',
        backgroundColor: config.backgroundColor,
        color: config.color,
        borderLeft: `4px solid ${config.borderColor}`,
        borderRadius: '4px',
        marginBottom: '1rem',
        gap: '1rem',
      }}
    >
      <span>{config.message}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        <Link
          href={config.ctaHref}
          style={{
            color: config.color,
            fontWeight: 600,
            textDecoration: 'underline',
            whiteSpace: 'nowrap',
          }}
        >
          {config.ctaLabel}
        </Link>
        {status === 'approved' && (
          <button
            type="button"
            aria-label="Dismiss KYC status banner"
            onClick={() => setDismissed(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: config.color,
              fontSize: '1.25rem',
              lineHeight: 1,
              padding: '0 0.25rem',
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
