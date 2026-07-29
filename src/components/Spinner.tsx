import React from 'react';
import clsx from 'clsx';
import styles from './Spinner.module.css';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
  label?: string;
  className?: string;
}

const sizeClass: Record<SpinnerSize, string> = {
  sm: styles.spinnerSm,
  md: styles.spinnerMd,
  lg: styles.spinnerLg,
};

export default function Spinner({
  size = 'md',
  color,
  label = 'Loading...',
  className,
}: SpinnerProps): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(styles.spinner, sizeClass[size], className)}
      style={color ? ({ '--spinner-color': color } as React.CSSProperties) : undefined}
    >
      <span className={styles.visuallyHidden}>{label}</span>
    </div>
  );
}
