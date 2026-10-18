import React, { useState, useRef, useId } from 'react';

interface HelpTooltipProps {
  /** Explanation text shown in the tooltip */
  text: string;
  /** Optional URL linking to full documentation */
  docLink?: string;
  /** Accessible label for the trigger button (default: "Help") */
  ariaLabel?: string;
}

/**
 * HelpTooltip — shows a ⓘ/? icon that reveals an explanatory tooltip on
 * hover or keyboard focus. Fully keyboard-accessible and screen-reader
 * friendly. Positioned above the trigger so it does not obstruct content
 * below it.
 */
export default function HelpTooltip({
  text,
  docLink,
  ariaLabel = 'Help',
}: HelpTooltipProps): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  function show() {
    setVisible(true);
  }

  function hide() {
    setVisible(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setVisible((v) => !v);
    }
    if (e.key === 'Escape') {
      setVisible(false);
      triggerRef.current?.focus();
    }
  }

  const wrapperStyle: React.CSSProperties = {
    display: 'inline-block',
    position: 'relative',
    verticalAlign: 'middle',
    marginLeft: 5,
  };

  const triggerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: '1.5px solid var(--ifm-color-primary)',
    background: 'transparent',
    color: 'var(--ifm-color-primary)',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
    transition: 'background 0.15s, color 0.15s',
    // Highlight on hover handled inline to avoid needing CSS class
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 'calc(100% + 8px)',
    left: '50%',
    transform: 'translateX(-50%)',
    minWidth: 200,
    maxWidth: 280,
    background: '#1e293b',
    color: '#f8fafc',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 12,
    lineHeight: 1.5,
    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
    zIndex: 9999,
    pointerEvents: 'auto',
    whiteSpace: 'normal',
    // Arrow
  };

  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderTop: '6px solid #1e293b',
  };

  return (
    <span style={wrapperStyle}>
      <button
        ref={triggerRef}
        type="button"
        style={triggerStyle}
        aria-label={ariaLabel}
        aria-describedby={visible ? tooltipId : undefined}
        aria-expanded={visible}
        tabIndex={0}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onKeyDown={handleKeyDown}
      >
        ?
      </button>

      {visible && (
        <div
          id={tooltipId}
          role="tooltip"
          style={tooltipStyle}
          // Keep tooltip open while the user moves mouse into it
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div style={arrowStyle} aria-hidden="true" />
          <p style={{ margin: 0 }}>{text}</p>
          {docLink && (
            <a
              href={docLink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-block',
                marginTop: 6,
                color: '#93c5fd',
                fontSize: 11,
                textDecoration: 'underline',
              }}
              // Prevent blur from hiding tooltip when clicking the link
              onMouseDown={(e) => e.preventDefault()}
            >
              Learn more →
            </a>
          )}
        </div>
      )}
    </span>
  );
}
