import React, { useState, useRef, useEffect, useId } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FeeBreakdown {
  networkFee: number;
  serviceFee: number;
  conversionFee: number;
}

interface FeeTooltipProps {
  fees: FeeBreakdown;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const wrapperStyle: React.CSSProperties = {
  fontFamily: 'inherit',
};

const titleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.45rem',
  marginBottom: '0.6rem',
};

const titleStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 700,
  color: '#1f2937',
  margin: 0,
};

const infoIconStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '1.1rem',
  height: '1.1rem',
  fontSize: '0.85rem',
  color: '#6b7280',
  cursor: 'pointer',
  position: 'relative',
  userSelect: 'none',
  background: 'transparent',
  border: 'none',
  padding: 0,
  lineHeight: 1,
};

const tooltipContainerStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
};

const tooltipBoxStyle = (above: boolean): React.CSSProperties => ({
  position: 'absolute',
  [above ? 'bottom' : 'top']: 'calc(100% + 8px)',
  left: '50%',
  transform: 'translateX(-50%)',
  background: '#1f2937',
  color: '#f9fafb',
  borderRadius: '8px',
  padding: '0.75rem 1rem',
  minWidth: '240px',
  maxWidth: '300px',
  fontSize: '0.78rem',
  lineHeight: 1.55,
  zIndex: 100,
  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
  pointerEvents: 'none',
});

const tooltipArrowStyle = (above: boolean): React.CSSProperties => ({
  position: 'absolute',
  [above ? 'top' : 'bottom']: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 0,
  height: 0,
  borderLeft: '6px solid transparent',
  borderRight: '6px solid transparent',
  [above ? 'borderBottom' : 'borderTop']: '6px solid #1f2937',
});

const tooltipTitleStyle: React.CSSProperties = {
  fontWeight: 700,
  marginBottom: '0.5rem',
  fontSize: '0.82rem',
  borderBottom: '1px solid rgba(255,255,255,0.15)',
  paddingBottom: '0.4rem',
};

const tooltipRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  marginBottom: '0.4rem',
};

const tooltipLabelStyle: React.CSSProperties = {
  fontWeight: 600,
  color: '#d1d5db',
};

const tooltipDescStyle: React.CSSProperties = {
  color: '#9ca3af',
};

const tooltipLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  marginTop: '0.55rem',
  color: '#93c5fd',
  fontSize: '0.75rem',
  pointerEvents: 'auto',
  textDecoration: 'underline',
};

// Fee table styles
const feeTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const feeRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.35rem 0',
  borderBottom: '1px solid #f3f4f6',
};

const feeLabelStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#374151',
};

const feeAmountStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#111827',
  fontVariantNumeric: 'tabular-nums',
};

const totalRowStyle: React.CSSProperties = {
  ...feeRowStyle,
  borderBottom: 'none',
  borderTop: '2px solid #e5e7eb',
  marginTop: '0.1rem',
  paddingTop: '0.5rem',
  fontWeight: 700,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatUSD(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

// ── Tooltip content ────────────────────────────────────────────────────────────

function TooltipContent({ above }: { above: boolean }): React.JSX.Element {
  return (
    <div style={tooltipBoxStyle(above)} role="tooltip">
      <div style={tooltipArrowStyle(above)} aria-hidden="true" />
      <div style={tooltipTitleStyle}>About These Fees</div>

      <div style={tooltipRowStyle}>
        <span style={tooltipLabelStyle}>Network Fee</span>
        <span style={tooltipDescStyle}>Blockchain transaction cost paid to the Stellar network validators.</span>
      </div>

      <div style={tooltipRowStyle}>
        <span style={tooltipLabelStyle}>Service Fee</span>
        <span style={tooltipDescStyle}>ProxyPay processing charge for routing and settlement services.</span>
      </div>

      <div style={{ ...tooltipRowStyle, marginBottom: 0 }}>
        <span style={tooltipLabelStyle}>Conversion Fee</span>
        <span style={tooltipDescStyle}>Currency exchange markup applied during fiat ↔ XLM conversion.</span>
      </div>

      {/* Link to fee documentation — pointerEvents re-enabled on the link itself */}
      <a href="#fee-documentation" style={tooltipLinkStyle}>
        Learn more about fees →
      </a>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function FeeTooltip({ fees }: FeeTooltipProps): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  const [above, setAbove] = useState(false);
  const iconRef = useRef<HTMLButtonElement>(null);
  const tooltipId = useId();

  const totalFee = fees.networkFee + fees.serviceFee + fees.conversionFee;

  // Determine whether tooltip should appear above or below the icon
  const updatePosition = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setAbove(spaceBelow < 200);
    }
  };

  const show = () => {
    updatePosition();
    setVisible(true);
  };

  const hide = () => setVisible(false);

  const toggle = () => {
    if (visible) {
      hide();
    } else {
      show();
    }
  };

  // Close tooltip on outside click (for tap/mobile)
  useEffect(() => {
    if (!visible) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (iconRef.current && !iconRef.current.contains(e.target as Node)) {
        hide();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [visible]);

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [visible]);

  return (
    <div style={wrapperStyle}>
      {/* Title row with info icon */}
      <div style={titleRowStyle}>
        <h3 style={titleStyle}>Fee Breakdown</h3>

        {/* Info icon button */}
        <div style={tooltipContainerStyle}>
          <button
            ref={iconRef}
            style={infoIconStyle}
            type="button"
            aria-label="Fee breakdown information"
            aria-describedby={visible ? tooltipId : undefined}
            aria-expanded={visible}
            // Desktop: hover
            onMouseEnter={show}
            onMouseLeave={hide}
            // Mobile: tap
            onClick={toggle}
          >
            ⓘ
          </button>

          {/* Tooltip */}
          {visible && (
            <div id={tooltipId}>
              <TooltipContent above={above} />
            </div>
          )}
        </div>
      </div>

      {/* Fee rows table */}
      <table style={feeTableStyle} aria-label="Fee breakdown">
        <tbody>
          <tr>
            <td style={feeRowStyle}>
              <span style={feeLabelStyle}>Network Fee</span>
              <span style={feeAmountStyle}>{formatUSD(fees.networkFee)}</span>
            </td>
          </tr>
          <tr>
            <td style={feeRowStyle}>
              <span style={feeLabelStyle}>Service Fee</span>
              <span style={feeAmountStyle}>{formatUSD(fees.serviceFee)}</span>
            </td>
          </tr>
          <tr>
            <td style={feeRowStyle}>
              <span style={feeLabelStyle}>Conversion Fee</span>
              <span style={feeAmountStyle}>{formatUSD(fees.conversionFee)}</span>
            </td>
          </tr>
          <tr>
            <td style={totalRowStyle}>
              <span style={{ ...feeLabelStyle, fontWeight: 700 }}>Total Fees</span>
              <span style={{ ...feeAmountStyle, fontSize: '0.92rem' }}>{formatUSD(totalFee)}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
