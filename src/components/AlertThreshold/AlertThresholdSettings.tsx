import React, { useState, useEffect } from 'react';
import type { MetricThreshold } from './types';
import { DEFAULT_THRESHOLDS } from './types';
import { loadThresholds, persistThresholds } from './useAlertThresholds';

export default function AlertThresholdSettings(): React.JSX.Element {
  const [thresholds, setThresholds] = useState<MetricThreshold[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setThresholds(loadThresholds());
  }, []);

  function handleChange(
    index: number,
    field: keyof MetricThreshold,
    value: string | number | boolean,
  ): void {
    setThresholds((prev) =>
      prev.map((t, i) =>
        i === index ? { ...t, [field]: value } : t,
      ),
    );
    setSaved(false);
  }

  function handleSave(): void {
    persistThresholds(thresholds);
    // Notify other components via storage event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', { key: 'proxypay_alert_thresholds' }));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset(): void {
    setThresholds(DEFAULT_THRESHOLDS);
    setSaved(false);
  }

  const containerStyle: React.CSSProperties = {
    border: '1px solid var(--ifm-color-emphasis-300)',
    borderRadius: 8,
    padding: '1.25rem',
    marginBottom: '1.5rem',
    background: 'var(--ifm-background-surface-color)',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '6px 8px',
    borderBottom: '2px solid var(--ifm-color-emphasis-300)',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '6px 8px',
    borderBottom: '1px solid var(--ifm-color-emphasis-200)',
  };

  const numInputStyle: React.CSSProperties = {
    width: 80,
    padding: '4px 6px',
    borderRadius: 4,
    border: '1px solid var(--ifm-color-emphasis-400)',
    fontSize: 13,
    background: 'var(--ifm-background-color)',
    color: 'var(--ifm-font-color-base)',
  };

  return (
    <div style={containerStyle}>
      <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: 16 }}>
        Alert Threshold Settings
      </h3>
      <p style={{ fontSize: 13, color: 'var(--ifm-color-emphasis-600)', marginTop: 0 }}>
        Configure warning and critical thresholds for transaction metrics. Changes are stored in
        your browser.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle} aria-label="Metric threshold configuration">
          <thead>
            <tr>
              <th style={thStyle}>Metric</th>
              <th style={thStyle}>Unit</th>
              <th style={{ ...thStyle, color: '#92400e' }}>⚠ Warning</th>
              <th style={{ ...thStyle, color: '#991b1b' }}>✕ Critical</th>
              <th style={thStyle}>Higher is bad?</th>
            </tr>
          </thead>
          <tbody>
            {thresholds.map((thr, i) => (
              <tr key={thr.metricKey}>
                <td style={tdStyle}>
                  <strong>{thr.label}</strong>
                </td>
                <td style={tdStyle}>{thr.unit || '—'}</td>
                <td style={tdStyle}>
                  <input
                    type="number"
                    style={numInputStyle}
                    value={thr.warningValue}
                    min={0}
                    onChange={(e) =>
                      handleChange(i, 'warningValue', parseFloat(e.target.value) || 0)
                    }
                    aria-label={`${thr.label} warning threshold`}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    type="number"
                    style={numInputStyle}
                    value={thr.criticalValue}
                    min={0}
                    onChange={(e) =>
                      handleChange(i, 'criticalValue', parseFloat(e.target.value) || 0)
                    }
                    aria-label={`${thr.label} critical threshold`}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    type="checkbox"
                    checked={thr.higherIsBad !== false}
                    onChange={(e) => handleChange(i, 'higherIsBad', e.target.checked)}
                    aria-label={`${thr.label} higher is bad`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          className="button button--primary"
          style={{ fontSize: 13 }}
          onClick={handleSave}
        >
          Save Thresholds
        </button>
        <button
          className="button button--secondary"
          style={{ fontSize: 13 }}
          onClick={handleReset}
        >
          Reset to Defaults
        </button>
        {saved && (
          <span
            role="status"
            style={{ fontSize: 13, color: 'var(--ifm-color-primary)', alignSelf: 'center' }}
          >
            ✓ Saved
          </span>
        )}
      </div>
    </div>
  );
}
