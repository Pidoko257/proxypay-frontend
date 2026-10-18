import React from 'react';
import type { AlertLevel, ThresholdViolation } from './types';

interface AlertStatusBadgeProps {
  level: AlertLevel;
  violations: ThresholdViolation[];
}

const LEVEL_CONFIG: Record<AlertLevel, { bg: string; color: string; label: string; icon: string }> = {
  ok: {
    bg: '#166534',
    color: '#fff',
    label: 'All Clear',
    icon: '✓',
  },
  warning: {
    bg: '#92400e',
    color: '#fff',
    label: 'Warning',
    icon: '⚠',
  },
  critical: {
    bg: '#991b1b',
    color: '#fff',
    label: 'Critical',
    icon: '✕',
  },
};

export default function AlertStatusBadge({
  level,
  violations,
}: AlertStatusBadgeProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const config = LEVEL_CONFIG[level];

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    background: config.bg,
    color: config.color,
    cursor: violations.length > 0 ? 'pointer' : 'default',
    border: 'none',
    userSelect: 'none',
    position: 'relative',
  };

  const popoverStyle: React.CSSProperties = {
    position: 'absolute',
    top: '110%',
    right: 0,
    minWidth: 300,
    background: 'var(--ifm-background-surface-color)',
    border: '1px solid var(--ifm-color-emphasis-300)',
    borderRadius: 6,
    padding: '0.75rem',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    zIndex: 1000,
    fontSize: 12,
    color: 'var(--ifm-font-color-base)',
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        style={badgeStyle}
        onClick={() => violations.length > 0 && setOpen((o) => !o)}
        aria-label={`Alert status: ${config.label}${violations.length > 0 ? `. ${violations.length} violation(s). Click to view.` : ''}`}
        aria-expanded={open}
        aria-haspopup={violations.length > 0 ? 'true' : undefined}
      >
        <span aria-hidden="true">{config.icon}</span>
        {config.label}
        {violations.length > 0 && (
          <span
            style={{
              background: 'rgba(255,255,255,0.25)',
              borderRadius: 10,
              padding: '0 5px',
              marginLeft: 2,
            }}
          >
            {violations.length}
          </span>
        )}
      </button>

      {open && violations.length > 0 && (
        <div style={popoverStyle} role="dialog" aria-label="Alert violations">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>Active Violations</strong>
            <button
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                color: 'var(--ifm-font-color-base)',
              }}
              onClick={() => setOpen(false)}
              aria-label="Close violations panel"
            >
              ✕
            </button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {violations.map((v, i) => (
              <li
                key={i}
                style={{
                  padding: '6px 0',
                  borderBottom: i < violations.length - 1 ? '1px solid var(--ifm-color-emphasis-200)' : 'none',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    padding: '1px 6px',
                    borderRadius: 3,
                    fontSize: 10,
                    fontWeight: 700,
                    background: v.level === 'critical' ? '#991b1b' : '#92400e',
                    color: '#fff',
                    marginRight: 6,
                    textTransform: 'uppercase',
                  }}
                >
                  {v.level}
                </span>
                <strong>{v.metricLabel}</strong>: {v.currentValue} (threshold: {v.threshold})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
