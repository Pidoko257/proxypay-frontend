import React from 'react';
import clsx from 'clsx';

interface EmptyStateProps {
  illustration: React.ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
}

export default function EmptyState({
  illustration,
  title,
  message,
  action,
  className,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className={clsx('empty-state', className)}>
      <div className="empty-state-illustration">{illustration}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className={clsx(
            'empty-state-action',
            action.variant === 'secondary' ? 'variant-secondary' : 'variant-primary'
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
