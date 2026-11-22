import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import clsx from 'clsx';
import BrowserOnly from '@docusaurus/BrowserOnly';

// ---------- types ----------

export interface FeeLineItem {
  /** Short label, e.g. "Network fee" */
  label: string;
  /** Human-readable amount or percentage, e.g. "0.5%" or "$0.02" */
  amount: string;
  /** Optional longer description */
  description?: string;
}

export interface FeeBreakdownTooltipProps {
  /** The fee line items to display in the tooltip */
  fees: FeeLineItem[];
  /** Total fee string, e.g. "1.5%" */
  total?: string;
  /** URL for the "Learn more" documentation link */
  docsUrl?: string;
  /** Additional CSS class names */
  className?: string;
  /**
   * Positioning of the tooltip panel relative to the trigger icon.
   * @default 'bottom'
   */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

// ---------- info icon SVG ----------

function InfoIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="fee-tooltip-icon-svg"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ---------- inner component ----------

function FeeBreakdownTooltipInner({
  fees,
  total,
  docsUrl,
  className,
  placement = 'bottom',
}: FeeBreakdownTooltipProps) {
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  // Close on outside click / touch
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setVisible(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [visible]);

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setVisible(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible]);

  const toggle = useCallback(() => setVisible(prev => !prev), []);

  return (
    <span className={clsx('fee-tooltip-wrapper', className)}>
      {/* Trigger: info icon button */}
      <button
        ref={triggerRef}
        type="button"
        className="fee-tooltip-trigger"
        onClick={toggle}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={(e) => {
          // Keep open if mouse moves into the panel
          if (panelRef.current && panelRef.current.contains(e.relatedTarget as Node)) return;
          setVisible(false);
        }}
        aria-label="Show fee breakdown details"
        aria-describedby={tooltipId}
        aria-expanded={visible}
        aria-haspopup="true"
      >
        <InfoIcon size={16} />
      </button>

      {/* Tooltip panel */}
      <div
        ref={panelRef}
        id={tooltipId}
        className={clsx(
          'fee-tooltip-panel',
          `fee-tooltip-panel--${placement}`,
          { 'fee-tooltip-panel--visible': visible },
        )}
        role="tooltip"
        aria-label="Fee breakdown"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        <div className="fee-tooltip-arrow" aria-hidden="true" />

        <p className="fee-tooltip-heading">Fee Breakdown</p>

        <table className="fee-tooltip-table">
          <thead>
            <tr>
              <th>Fee</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {fees.map(fee => (
              <tr key={fee.label}>
                <td>
                  <span className="fee-tooltip-fee-label">{fee.label}</span>
                  {fee.description && (
                    <span className="fee-tooltip-fee-desc">{fee.description}</span>
                  )}
                </td>
                <td className="fee-tooltip-fee-amount">{fee.amount}</td>
              </tr>
            ))}
          </tbody>
          {total && (
            <tfoot>
              <tr className="fee-tooltip-total-row">
                <td>Total</td>
                <td className="fee-tooltip-fee-amount">{total}</td>
              </tr>
            </tfoot>
          )}
        </table>

        {docsUrl && (
          <a
            href={docsUrl}
            className="fee-tooltip-docs-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more about fees ↗
          </a>
        )}
      </div>
    </span>
  );
}

// ---------- public component ----------

export default function FeeBreakdownTooltip(props: FeeBreakdownTooltipProps): React.JSX.Element {
  return (
    <BrowserOnly fallback={null}>
      {() => <FeeBreakdownTooltipInner {...props} />}
    </BrowserOnly>
  );
}

// ---------- FeeBreakdownTitle ----------

/**
 * Convenience component: renders "Fee Breakdown" heading text with the
 * info icon tooltip inline.
 */
export interface FeeBreakdownTitleProps extends FeeBreakdownTooltipProps {
  /** Heading text — defaults to "Fee Breakdown" */
  headingText?: string;
}

export function FeeBreakdownTitle({ headingText = 'Fee Breakdown', ...tooltipProps }: FeeBreakdownTitleProps): React.JSX.Element {
  return (
    <span className="fee-breakdown-title">
      {headingText}
      <FeeBreakdownTooltip {...tooltipProps} />
    </span>
  );
}
