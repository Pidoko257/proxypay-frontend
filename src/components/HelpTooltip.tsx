import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface HelpTooltipProps {
  text: string;
  docLink?: string;
  ariaLabel?: string;
}

interface TooltipPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
}

const TOOLTIP_OFFSET = 10;
const ARROW_SIZE = 7;

function computePosition(
  triggerRect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number
): TooltipPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;

  // Prefer top placement
  let placement: 'top' | 'bottom' = 'top';
  let top = triggerRect.top + scrollY - tooltipHeight - TOOLTIP_OFFSET - ARROW_SIZE;

  if (top < scrollY + 8) {
    // Not enough space above — go below
    placement = 'bottom';
    top = triggerRect.bottom + scrollY + TOOLTIP_OFFSET + ARROW_SIZE;
  }

  // Center horizontally over the trigger
  let left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipWidth / 2;

  // Clamp within viewport
  left = Math.max(scrollX + 8, Math.min(left, scrollX + vw - tooltipWidth - 8));

  // Clamp vertical
  if (placement === 'bottom' && top + tooltipHeight > scrollY + vh - 8) {
    // Still doesn't fit below; go back to top and clamp
    placement = 'top';
    top = triggerRect.top + scrollY - tooltipHeight - TOOLTIP_OFFSET - ARROW_SIZE;
    top = Math.max(scrollY + 8, top);
  }

  return { top, left, placement };
}

export default function HelpTooltip({ text, docLink, ariaLabel }: HelpTooltipProps): JSX.Element {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<TooltipPosition>({ top: 0, left: 0, placement: 'top' });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const computed = computePosition(triggerRect, tooltipRect.width || 280, tooltipRect.height || 80);
    setPos(computed);
  }, []);

  useEffect(() => {
    if (visible) {
      // Use rAF to measure after render
      requestAnimationFrame(() => updatePosition());
    }
  }, [visible, updatePosition]);

  useEffect(() => {
    if (!visible) return;
    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [visible, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!visible) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        tooltipRef.current && !tooltipRef.current.contains(target)
      ) {
        setVisible(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [visible]);

  function handleMouseEnter() {
    setVisible(true);
  }

  function handleMouseLeave() {
    setVisible(false);
  }

  function handleFocus() {
    setVisible(true);
  }

  function handleBlur() {
    setVisible(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setVisible((v) => !v);
    } else if (e.key === 'Escape') {
      setVisible(false);
    }
  }

  const label = ariaLabel ?? 'Help: ' + text.substring(0, 60);

  const arrowStyle: React.CSSProperties =
    pos.placement === 'top'
      ? {
          position: 'absolute',
          bottom: -ARROW_SIZE,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: `${ARROW_SIZE}px solid transparent`,
          borderRight: `${ARROW_SIZE}px solid transparent`,
          borderTop: `${ARROW_SIZE}px solid #1a1a2e`,
        }
      : {
          position: 'absolute',
          top: -ARROW_SIZE,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: `${ARROW_SIZE}px solid transparent`,
          borderRight: `${ARROW_SIZE}px solid transparent`,
          borderBottom: `${ARROW_SIZE}px solid #1a1a2e`,
        };

  const tooltipNode = (
    <div
      ref={tooltipRef}
      role="tooltip"
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        maxWidth: 280,
        background: '#1a1a2e',
        color: '#fff',
        padding: '8px 12px',
        borderRadius: 6,
        fontSize: '0.82rem',
        lineHeight: 1.45,
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        pointerEvents: docLink ? 'auto' : 'none',
      }}
    >
      <div style={{ position: 'relative' }}>
        <span style={{ display: 'block' }}>{text}</span>
        {docLink && (
          <a
            href={docLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              marginTop: 6,
              color: '#3cad6e',
              fontWeight: 600,
              fontSize: '0.78rem',
              textDecoration: 'none',
            }}
          >
            Learn more →
          </a>
        )}
        <div style={arrowStyle} />
      </div>
    </div>
  );

  return (
    <>
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-expanded={visible}
        aria-haspopup="true"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#e8f5ee',
          border: '1.5px solid #2e8555',
          color: '#2e8555',
          fontSize: '0.72rem',
          fontWeight: 700,
          cursor: 'pointer',
          userSelect: 'none',
          verticalAlign: 'middle',
          marginLeft: 4,
          lineHeight: 1,
          outline: 'none',
          transition: 'background 0.15s',
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        ?
      </span>
      {mounted && visible && createPortal(tooltipNode, document.body)}
    </>
  );
}
