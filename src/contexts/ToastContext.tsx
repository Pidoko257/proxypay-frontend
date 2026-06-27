import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import ToastContainer from '@site/src/components/Toast/ToastContainer';

/** Severity of a toast — drives colour, icon, and screen-reader urgency. */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** Options accepted when dispatching a toast via {@link useToast}. */
export interface ToastOptions {
  type: ToastType;
  title: string;
  /** Optional secondary line shown beneath the title. */
  message?: string;
}

/** A live toast: the dispatched options plus a stable id used for dismissal. */
export interface Toast extends ToastOptions {
  id: string;
}

export interface ToastContextValue {
  toasts: Toast[];
  /** Dispatch a toast. Returns its id so callers can dismiss it early. */
  addToast: (options: ToastOptions) => string;
  /** Remove a toast by id (used by the auto-dismiss timer and the close button). */
  dismissToast: (id: string) => void;
}

/** Maximum number of toasts visible at once; older ones are evicted first. */
export const MAX_TOASTS = 5;

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;
function nextToastId(): string {
  toastCounter += 1;
  return `toast-${toastCounter}`;
}

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((options: ToastOptions): string => {
    const id = nextToastId();
    setToasts((prev) => {
      const next = [...prev, { ...options, id }];
      // Cap the stack — when full, the oldest toasts are dismissed first.
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
    return id;
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, addToast, dismissToast }),
    [toasts, addToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

/**
 * Access the toast API from any component rendered inside {@link ToastProvider}.
 *
 * @example
 * const { addToast } = useToast();
 * addToast({ type: 'success', title: 'Saved', message: 'Your changes were stored.' });
 */
export function useToast(): Pick<ToastContextValue, 'addToast' | 'dismissToast'> {
  const ctx = useContext(ToastContext);
  if (ctx === null) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return { addToast: ctx.addToast, dismissToast: ctx.dismissToast };
}
