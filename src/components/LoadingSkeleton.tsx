import React from 'react';

export default function LoadingSkeleton({ className = '' }: { className?: string }): React.JSX.Element {
  return <div className={`proxypay-skeleton ${className}`} aria-busy="true" aria-label="Loading" />;
}
