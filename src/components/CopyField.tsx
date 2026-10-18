import React, { useState, useRef, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CopyFieldProps {
  label: string;
  value: string;
}

// ── Styles (inline) ────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  position: 'relative',
};

const codeStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.45rem 0.75rem',
  borderRadius: '6px',
  border: '1.5px solid #d1d5db',
  background: '#f9fafb',
  fontFamily: "'SFMono-Regular', Menlo, Consolas, monospace",
  fontSize: '0.82rem',
  color: '#1f2937',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  userSelect: 'all',
  cursor: 'text',
  outline: 'none',
};

const codeStyleFocused: React.CSSProperties = {
  ...codeStyle,
  borderColor: '#3b82f6',
  boxShadow: '0 0 0 3px rgba(59,130,246,0.15)',
};

const copyBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  padding: '0.42rem 0.8rem',
  borderRadius: '6px',
  border: '1.5px solid #d1d5db',
  background: '#fff',
  color: '#374151',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.12s, border-color 0.12s',
  display: 'flex',
  alignItems: 'center',
  gap: '0.3rem',
};

const copyBtnSuccessStyle: React.CSSProperties = {
  ...copyBtnStyle,
  background: '#d1fae5',
  borderColor: '#6ee7b7',
  color: '#065f46',
};

const toastStyle: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 'calc(100% + 6px)',
  background: '#1f2937',
  color: '#f9fafb',
  fontSize: '0.75rem',
  fontWeight: 500,
  padding: '0.3rem 0.65rem',
  borderRadius: '5px',
  pointerEvents: 'none',
  zIndex: 50,
  whiteSpace: 'nowrap',
  transition: 'opacity 0.4s',
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function CopyField({ label, value }: CopyFieldProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const [focused, setFocused] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for environments without clipboard API
      const sel = window.getSelection();
      const range = document.createRange();
      const el = document.createElement('span');
      el.textContent = value;
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      range.selectNodeContents(el);
      sel?.removeAllRanges();
      sel?.addRange(range);
      document.execCommand('copy');
      document.body.removeChild(el);
    }

    setCopied(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [value]);

  // Keyboard shortcut: Ctrl+C / Cmd+C when the code element is focused
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      const isCopy = (e.ctrlKey || e.metaKey) && e.key === 'c';
      if (isCopy) {
        // Let the browser handle natural text selection copy,
        // but also show the toast to confirm the shortcut.
        triggerCopy();
        // Do NOT e.preventDefault() so the browser still copies normally.
      }
    },
    [triggerCopy],
  );

  return (
    <div style={containerStyle}>
      {/* Read-only code display */}
      <code
        style={focused ? codeStyleFocused : codeStyle}
        tabIndex={0}
        role="textbox"
        aria-label={label}
        aria-readonly="true"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        title={value}
      >
        {value}
      </code>

      {/* Copy button */}
      <button
        style={copied ? copyBtnSuccessStyle : copyBtnStyle}
        onClick={triggerCopy}
        aria-label={`Copy ${label}`}
        type="button"
      >
        {copied ? (
          <>
            <span aria-hidden="true">✓</span> Copied
          </>
        ) : (
          <>
            <span aria-hidden="true">⎘</span> Copy
          </>
        )}
      </button>

      {/* Toast notification */}
      {copied && (
        <div
          style={toastStyle}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          Copied!
        </div>
      )}
    </div>
  );
}
