import React from 'react';
import type { Toast } from '@site/src/contexts/ToastContext';
import ToastItem from './ToastItem';
import styles from './styles.module.css';

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

/**
 * Fixed-position stack that renders the active toasts. Each {@link ToastItem}
 * is its own ARIA live region (assertive for error/warning, polite otherwise),
 * so screen readers announce notifications as they appear.
 */
export default function ToastContainer({
  toasts,
  onDismiss,
}: ToastContainerProps): React.JSX.Element {
  return (
    <div className={styles.container} role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
