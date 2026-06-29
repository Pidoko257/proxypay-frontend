import React from 'react';
import Link from '@docusaurus/Link';

interface Props {
  currentVersion: string;
  latestVersion: string;
  migrationGuideUrl: string;
}

export default function DeprecatedVersionBanner({
  currentVersion,
  latestVersion,
  migrationGuideUrl,
}: Props): React.JSX.Element {
  return (
    <div
      role="alert"
      style={{
        background: '#fef9c3',
        borderLeft: '4px solid #ca8a04',
        color: '#713f12',
        padding: '0.75rem 1.25rem',
        marginBottom: '1.5rem',
        borderRadius: '0 4px 4px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap',
      }}
    >
      <strong>&#9888; Deprecated:</strong>
      <span>
        You are viewing the <strong>{currentVersion}</strong> API docs, which is no longer receiving
        new features and will be sunset. Please migrate to{' '}
        <strong>{latestVersion}</strong>.
      </span>
      <Link
        to={migrationGuideUrl}
        style={{ color: '#92400e', fontWeight: 600, whiteSpace: 'nowrap' }}
      >
        View Migration Guide &rarr;
      </Link>
    </div>
  );
}
