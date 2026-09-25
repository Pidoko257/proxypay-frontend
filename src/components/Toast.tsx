import React from 'react';

type ToastProps = {
  children: React.ReactNode;
  onDismiss: () => void;
};

export default function Toast({ children, onDismiss }: ToastProps): React.JSX.Element {
  return (
    <div className="dashboard__toast" role="alert">
      <span>{children}</span>
      <button type="button" className="dashboard__toast-close" onClick={onDismiss} aria-label="Dismiss notification">
        Dismiss
      </button>
    </div>
  );
}
