/**
 * Transaction date field component with validation and explicit unavailable state.
 *
 * Displays formatted transaction timestamps with graceful fallback for:
 * - Missing dates (null, undefined)
 * - Malformed dates (invalid strings)
 * - Out-of-range dates (very old or far future)
 *
 * @example
 * <TransactionDateField label="Created" timestamp={tx.createdAt} />
 */

import React from 'react';
import { formatDate, formatDateRelative, type FormattedDate } from '../utils/dateValidator';

export interface TransactionDateFieldProps {
  /** Display label for the date field */
  label: string;
  /** Timestamp to format (string, Date, number, or invalid value) */
  timestamp: unknown;
  /** Display mode: 'standard' for locale-aware formatting, 'relative' for relative time */
  mode?: 'standard' | 'relative';
  /** Optional CSS class for custom styling */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
  /** Whether to show validation hint on unavailable dates (accessibility) */
  showHint?: boolean;
}

const defaultLabelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: '#9ca3af',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '0.25rem',
};

const defaultValueStyle: React.CSSProperties = {
  fontSize: '0.88rem',
  color: '#1f2937',
  fontWeight: 500,
};

const unavailableValueStyle: React.CSSProperties = {
  ...defaultValueStyle,
  color: '#9ca3af',
  fontStyle: 'italic',
};

/**
 * TransactionDateField component
 *
 * Renders a date field with validation and explicit "unavailable" state.
 */
export const TransactionDateField: React.FC<TransactionDateFieldProps> = ({
  label,
  timestamp,
  mode = 'standard',
  className,
  style,
  showHint = false,
}) => {
  const formatted: FormattedDate = mode === 'relative'
    ? formatDateRelative(timestamp)
    : formatDate(timestamp);

  const valueStyle = formatted.isAvailable
    ? defaultValueStyle
    : unavailableValueStyle;

  const ariaLabel = `${label}: ${formatted.formatted}${
    formatted.validationReason ? ` (${formatted.validationReason})` : ''
  }`;

  return (
    <div style={style} className={className} role="presentation">
      <div style={defaultLabelStyle}>{label}</div>
      <div
        style={valueStyle}
        role="status"
        aria-label={ariaLabel}
        title={formatted.isAvailable ? undefined : formatted.validationReason}
      >
        {formatted.formatted}
      </div>
      {showHint && !formatted.isAvailable && (
        <div
          style={{
            fontSize: '0.7rem',
            color: '#d97706',
            marginTop: '0.25rem',
          }}
          role="note"
        >
          ⚠ Data unavailable
        </div>
      )}
    </div>
  );
};

export default TransactionDateField;
