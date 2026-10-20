/**
 * ColorSchemeSelector — Issue #625
 *
 * Lets users pick from predefined color schemes or define a custom palette.
 * Writes CSS variables to document.documentElement and persists the choice
 * in localStorage under `proxypay-color-scheme`.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './ColorSchemeSelector.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColorScheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
}

interface StoredScheme {
  schemeId: string;
  custom?: { primary: string; secondary: string };
}

// ---------------------------------------------------------------------------
// Predefined schemes
// ---------------------------------------------------------------------------

const PREDEFINED_SCHEMES: ColorScheme[] = [
  {
    id: 'default',
    name: 'Default',
    primary: '#2e8555',
    secondary: '#25c2a0',
    accent: '#1fa46e',
    background: '#ffffff',
    surface: '#f6f8fa',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    primary: '#1565c0',
    secondary: '#0288d1',
    accent: '#0097a7',
    background: '#f0f8ff',
    surface: '#e3f2fd',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    primary: '#e64a19',
    secondary: '#f57c00',
    accent: '#ff8f00',
    background: '#fff8f5',
    surface: '#fbe9e7',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    primary: '#6a1b9a',
    secondary: '#8e24aa',
    accent: '#ab47bc',
    background: '#fdf7ff',
    surface: '#f3e5f5',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    primary: '#37474f',
    secondary: '#546e7a',
    accent: '#607d8b',
    background: '#f5f7f8',
    surface: '#eceff1',
  },
];

const STORAGE_KEY = 'proxypay-color-scheme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadStoredScheme(): StoredScheme | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredScheme) : null;
  } catch {
    return null;
  }
}

function saveStoredScheme(scheme: StoredScheme): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scheme));
  } catch {
    // localStorage may be unavailable in some contexts
  }
}

function applyCSSVariables(scheme: ColorScheme): void {
  const root = document.documentElement;
  root.style.setProperty('--ifm-color-primary', scheme.primary);
  root.style.setProperty('--ifm-color-primary-dark', scheme.primary);
  root.style.setProperty('--proxypay-color-secondary', scheme.secondary);
  root.style.setProperty('--proxypay-color-accent', scheme.accent);
  root.style.setProperty('--proxypay-color-background', scheme.background);
  root.style.setProperty('--proxypay-color-surface', scheme.surface);
}

function buildCustomScheme(primary: string, secondary: string): ColorScheme {
  return {
    id: 'custom',
    name: 'Custom',
    primary,
    secondary,
    accent: primary,
    background: '#ffffff',
    surface: '#f6f8fa',
  };
}

function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ColorSchemeSelector(): React.JSX.Element {
  // Active applied scheme id
  const [activeId, setActiveId] = useState<string>('default');
  // Currently previewed scheme (before Apply)
  const [previewId, setPreviewId] = useState<string>('default');
  // Custom picker values
  const [customPrimary, setCustomPrimary] = useState<string>('#2e8555');
  const [customSecondary, setCustomSecondary] = useState<string>('#25c2a0');
  // Whether the custom picker section is expanded
  const [showCustom, setShowCustom] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Restore persisted scheme on mount
  useEffect(() => {
    const stored = loadStoredScheme();
    if (!stored) return;

    if (stored.schemeId === 'custom' && stored.custom) {
      setCustomPrimary(stored.custom.primary);
      setCustomSecondary(stored.custom.secondary);
      const scheme = buildCustomScheme(stored.custom.primary, stored.custom.secondary);
      applyCSSVariables(scheme);
      setActiveId('custom');
      setPreviewId('custom');
    } else {
      const scheme = PREDEFINED_SCHEMES.find((s) => s.id === stored.schemeId);
      if (scheme) {
        applyCSSVariables(scheme);
        setActiveId(stored.schemeId);
        setPreviewId(stored.schemeId);
      }
    }
  }, []);

  const resolveScheme = useCallback(
    (id: string): ColorScheme => {
      if (id === 'custom') return buildCustomScheme(customPrimary, customSecondary);
      return PREDEFINED_SCHEMES.find((s) => s.id === id) ?? PREDEFINED_SCHEMES[0];
    },
    [customPrimary, customSecondary],
  );

  const handleApply = useCallback(() => {
    const scheme = resolveScheme(previewId);
    applyCSSVariables(scheme);
    setActiveId(previewId);

    const toStore: StoredScheme =
      previewId === 'custom'
        ? { schemeId: 'custom', custom: { primary: customPrimary, secondary: customSecondary } }
        : { schemeId: previewId };
    saveStoredScheme(toStore);
  }, [previewId, resolveScheme, customPrimary, customSecondary]);

  const handleExport = useCallback(() => {
    const scheme = resolveScheme(activeId);
    downloadJSON(
      { scheme, exportedAt: new Date().toISOString() },
      `proxypay-color-scheme-${activeId}.json`,
    );
  }, [activeId, resolveScheme]);

  // Keyboard navigation for scheme cards
  const handleCardKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, id: string) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setPreviewId(id);
      }
    },
    [],
  );

  const previewScheme = resolveScheme(previewId);

  return (
    <div
      className={styles.container}
      ref={containerRef}
      aria-label="Color scheme selector"
    >
      <h2 className={styles.heading}>Color Scheme</h2>
      <p className={styles.description}>
        Choose a predefined palette or create a custom color scheme for the portal.
      </p>

      {/* Predefined scheme cards */}
      <div
        className={styles.grid}
        role="radiogroup"
        aria-label="Predefined color schemes"
      >
        {PREDEFINED_SCHEMES.map((scheme) => {
          const isSelected = previewId === scheme.id;
          return (
            <button
              key={scheme.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${scheme.name} color scheme`}
              className={`${styles.card} ${isSelected ? styles.cardSelected : ''} ${activeId === scheme.id ? styles.cardActive : ''}`}
              onClick={() => setPreviewId(scheme.id)}
              onKeyDown={(e) => handleCardKeyDown(e, scheme.id)}
            >
              <div className={styles.swatchRow} aria-hidden="true">
                <span
                  className={styles.swatch}
                  style={{ backgroundColor: scheme.primary }}
                  title={`Primary: ${scheme.primary}`}
                />
                <span
                  className={styles.swatch}
                  style={{ backgroundColor: scheme.secondary }}
                  title={`Secondary: ${scheme.secondary}`}
                />
                <span
                  className={styles.swatch}
                  style={{ backgroundColor: scheme.accent }}
                  title={`Accent: ${scheme.accent}`}
                />
              </div>
              <span className={styles.cardName}>{scheme.name}</span>
              {activeId === scheme.id && (
                <span className={styles.activeBadge} aria-label="Currently applied">
                  ✓ Applied
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom picker toggle */}
      <div className={styles.customSection}>
        <button
          type="button"
          className={styles.customToggle}
          aria-expanded={showCustom}
          aria-controls="custom-picker-panel"
          onClick={() => setShowCustom((v) => !v)}
        >
          <span className={styles.customToggleIcon}>{showCustom ? '▾' : '▸'}</span>
          Custom colors
          {activeId === 'custom' && (
            <span className={styles.activeBadge} aria-label="Currently applied">
              ✓ Applied
            </span>
          )}
        </button>

        {showCustom && (
          <div id="custom-picker-panel" className={styles.customPanel}>
            <div className={styles.pickerRow}>
              <label className={styles.pickerLabel} htmlFor="custom-primary">
                Primary color
                <input
                  id="custom-primary"
                  type="color"
                  className={styles.colorInput}
                  value={customPrimary}
                  onChange={(e) => {
                    setCustomPrimary(e.target.value);
                    setPreviewId('custom');
                  }}
                  aria-label="Choose primary brand color"
                />
                <span className={styles.colorHex}>{customPrimary}</span>
              </label>

              <label className={styles.pickerLabel} htmlFor="custom-secondary">
                Secondary color
                <input
                  id="custom-secondary"
                  type="color"
                  className={styles.colorInput}
                  value={customSecondary}
                  onChange={(e) => {
                    setCustomSecondary(e.target.value);
                    setPreviewId('custom');
                  }}
                  aria-label="Choose secondary brand color"
                />
                <span className={styles.colorHex}>{customSecondary}</span>
              </label>
            </div>

            {/* Live preview */}
            <div className={styles.previewBox} aria-label="Color preview" aria-live="polite">
              <span
                className={styles.previewSwatch}
                style={{ backgroundColor: customPrimary }}
                aria-hidden="true"
              />
              <span
                className={styles.previewSwatch}
                style={{ backgroundColor: customSecondary }}
                aria-hidden="true"
              />
              <span className={styles.previewLabel}>
                Preview — Primary &amp; Secondary
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Preview bar for selected predefined scheme */}
      {previewId !== 'custom' && (
        <div className={styles.previewBar} aria-label="Selected scheme preview" aria-live="polite">
          <span className={styles.previewBarLabel}>Previewing: {previewScheme.name}</span>
          <div className={styles.previewSwatches} aria-hidden="true">
            <span className={styles.previewSwatch} style={{ backgroundColor: previewScheme.primary }} />
            <span className={styles.previewSwatch} style={{ backgroundColor: previewScheme.secondary }} />
            <span className={styles.previewSwatch} style={{ backgroundColor: previewScheme.accent }} />
            <span className={styles.previewSwatch} style={{ backgroundColor: previewScheme.surface }} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.applyButton}
          onClick={handleApply}
          aria-label={`Apply ${previewScheme.name} color scheme`}
          disabled={previewId === activeId && previewId !== 'custom'}
        >
          Apply scheme
        </button>
        <button
          type="button"
          className={styles.exportButton}
          onClick={handleExport}
          aria-label="Export current color scheme as JSON"
        >
          Export JSON
        </button>
      </div>
    </div>
  );
}
