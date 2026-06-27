import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Toast, ToastType } from '@site/src/contexts/ToastContext';
import styles from './styles.module.css';

/** How long a toast stays before auto-dismissing. */
export const TOAST_DURATION_MS = 5000;
/** Length of the slide/fade-out animation before the toast is unmounted. */
const EXIT_ANIMATION_MS = 200;

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

export default function ToastItem({
  toast,
  onDismiss,
}: ToastItemProps): React.JSX.Element {
  const [exiting, setExiting] = useState(false);
  const [paused, setPaused] = useState(false);

  const remainingRef = useRef(TOAST_DURATION_MS);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Trigger the exit animation, then remove the toast from the stack.
  const beginExit = useCallback(() => {
    clearTimer();
    setExiting(true);
    window.setTimeout(() => onDismiss(toast.id), EXIT_ANIMATION_MS);
  }, [clearTimer, onDismiss, toast.id]);

  const startTimer = useCallback(() => {
    startRef.current = Date.now();
    timerRef.current = setTimeout(beginExit, remainingRef.current);
  }, [beginExit]);

  useEffect(() => {
    startTimer();
    return clearTimer;
  }, [startTimer, clearTimer]);

  // Pause the countdown (timer + animation) while the pointer is over the toast,
  // so it can't disappear mid-read; resume with the time that was left.
  const handleMouseEnter = useCallback(() => {
    clearTimer();
    remainingRef.current = Math.max(
      0,
      remainingRef.current - (Date.now() - startRef.current),
    );
    setPaused(true);
  }, [clearTimer]);

  const handleMouseLeave = useCallback(() => {
    setPaused(false);
    startTimer();
  }, [startTimer]);

  const isAssertive = toast.type === 'error' || toast.type === 'warning';

  return (
    <div
      className={clsx(styles.toast, styles[toast.type], exiting && styles.exiting)}
      role={isAssertive ? 'alert' : 'status'}
      aria-atomic="true"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className={styles.icon} aria-hidden="true">
        {ICONS[toast.type]}
      </span>
      <div className={styles.body}>
        <p className={styles.title}>{toast.title}</p>
        {toast.message ? <p className={styles.message}>{toast.message}</p> : null}
      </div>
      <button
        type="button"
        className={styles.close}
        aria-label="Dismiss notification"
        onClick={beginExit}
      >
        ✕
      </button>
      <span
        className={styles.countdown}
        style={{
          animationDuration: `${TOAST_DURATION_MS}ms`,
          animationPlayState: paused || exiting ? 'paused' : 'running',
        }}
        aria-hidden="true"
      />
    </div>
  );
}
