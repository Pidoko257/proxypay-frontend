import React from 'react';
import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export default function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  count = 1,
}: SkeletonProps): React.JSX.Element {
  const skeletonStyle: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1em' : '40px'),
  };

  const baseClasses = clsx(
    'skeleton',
    `skeleton-${variant}`,
    className
  );

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={baseClasses}
      style={skeletonStyle}
      aria-hidden="true"
    />
  ));

  return <>{skeletons}</>;
}
