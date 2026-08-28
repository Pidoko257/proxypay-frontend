import React, { useEffect, useMemo, useState } from 'react';
import { validateContrast, suggestColors } from '../utils/contrastValidator';
import { requiredField } from '../utils/formValidation';

type ThemePalette = {
  primary: string;
  secondary: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  border: string;
};

type ThemeDefinition = {
  id: string;
  name: string;
  description: string;
  palette: ThemePalette;
  darkPalette?: ThemePalette;
  fontFamily: string;
  headingFontFamily: string;
  spacing: number;
};

type SavedTheme = ThemeDefinition & {
  savedAt: string;
};

type ThemeMode = 'light' | 'dark';

const STORAGE_KEYS = {
  preference: 'proxypay-theme-preference',
  customThemes: 'proxypay-custom-themes',
};

const presetThemes: ThemeDefinition[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'A familiar, polished palette for documentation and onboarding.',
    palette: {
      primary: '#2e8555',
      secondary: '#5a2d82',
      surface: '#f7f8fa',
      surfaceAlt: '#ffffff',
      text: '#1f2937',
      muted: '#64748b',
      border: '#dbe2ea',
    },
    darkPalette: {
      primary: '#4fcf93',
      secondary: '#b28cff',
      surface: '#111827',
      surfaceAlt: '#1f2937',
      text: '#f8fafc',
      muted: '#cbd5e1',
      border: '#334155',
    },
    fontFamily: 'Inter, system-ui, sans-serif',
    headingFontFamily: 'Inter, system-ui, sans-serif',
    spacing: 12,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Soft neutrals with understated accents for a calm experience.',
    palette: {
      primary: '#4f46e5',
      secondary: '#0f766e',
      surface: '#f8fafc',
      surfaceAlt: '#ffffff',
      text: '#0f172a',
      muted: '#475569',
      border: '#e5e7eb',
    },
    darkPalette: {
      primary: '#818cf8',
      secondary: '#2dd4bf',
      surface: '#020617',
      surfaceAlt: '#0f172a',
      text: '#f8fafc',
      muted: '#cbd5e1',
      border: '#334155',
    },
    fontFamily: 'Source Sans 3, system-ui, sans-serif',
    headingFontFamily: 'Source Sans 3, system-ui, sans-serif',
    spacing: 10,
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Bright electric highlights and airy cards for a vibrant feel.',
    palette: {
      primary: '#ff6b6b',
      secondary: '#2c7be5',
      surface: '#fff7ed',
      surfaceAlt: '#ffffff',
      text: '#1e293b',
      muted: '#64748b',
      border: '#fed7aa',
    },
    darkPalette: {
      primary: '#ff8f8f',
      secondary: '#6cb4ff',
      surface: '#111827',
      surfaceAlt: '#1f2937',
      text: '#f8fafc',
      muted: '#cbd5e1',
      border: '#4338ca',
    },
    fontFamily: 'Manrope, system-ui, sans-serif',
    headingFontFamily: 'Manrope, system-ui, sans-serif',
    spacing: 14,
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Bold contrast and clear hierarchy for accessibility-first use.',
    palette: {
      primary: '#0f172a',
      secondary: '#e11d48',
      surface: '#f8fafc',
      surfaceAlt: '#ffffff',
      text: '#020617',
      muted: '#334155',
      border: '#020617',
    },
    darkPalette: {
      primary: '#f8fafc',
      secondary: '#fb7185',
      surface: '#020617',
      surfaceAlt: '#111827',
      text: '#f8fafc',
      muted: '#cbd5e1',
      border: '#f8fafc',
    },
    fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
    headingFontFamily: 'IBM Plex Sans, system-ui, sans-serif',
    spacing: 16,
  },
];

const defaultCustomTheme: ThemeDefinition = {
  id: 'custom',
  name: 'Custom Theme',
  description: 'Craft a personalized palette for your audience.',
  palette: {
    primary: '#2563eb',
    secondary: '#7c3aed',
    surface: '#f8fafc',
    surfaceAlt: '#ffffff',
    text: '#0f172a',
    muted: '#64748b',
    border: '#dbe2ea',
  },
  darkPalette: {
    primary: '#60a5fa',
    secondary: '#c084fc',
    surface: '#020617',
    surfaceAlt: '#111827',
    text: '#f8fafc',
    muted: '#cbd5e1',
    border: '#334155',
  },
  fontFamily: 'Inter, system-ui, sans-serif',
  headingFontFamily: 'Inter, system-ui, sans-serif',
  spacing: 12,
};

function getThemePalette(theme: ThemeDefinition, mode: ThemeMode): ThemePalette {
  return mode === 'dark' && theme.darkPalette ? theme.darkPalette : theme.palette;
}

function applyThemeToDocument(theme: ThemeDefinition, mode: ThemeMode): void {
  const palette = getThemePalette(theme, mode);
  const root = document.documentElement;
  root.style.setProperty('--ifm-color-primary', palette.primary);
  root.style.setProperty('--ifm-color-primary-dark', palette.primary);
  root.style.setProperty('--ifm-color-primary-darker', palette.secondary);
  root.style.setProperty('--ifm-color-primary-darkest', palette.secondary);
  root.style.setProperty('--ifm-color-primary-light', palette.secondary);
  root.style.setProperty('--ifm-color-primary-lighter', palette.secondary);
  root.style.setProperty('--ifm-color-primary-lightest', palette.secondary);
  root.style.setProperty('--ifm-background-color', palette.surface);
  root.style.setProperty('--ifm-color-content', palette.text);
  root.style.setProperty('--ifm-color-content-secondary', palette.muted);
  root.style.setProperty('--ifm-color-emphasis-300', palette.border);
  root.style.setProperty('--ifm-font-family-base', theme.fontFamily);
  root.style.setProperty('--ifm-heading-font-family', theme.headingFontFamily);
  root.style.setProperty('--proxypay-theme-spacing', `${theme.spacing}px`);
}

function exportAsJson(theme: ThemeDefinition): void {
  const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${theme.name.toLowerCase().replace(/\s+/g, '-') || 'theme'}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function readStoredTheme<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = window.localStorage.getItem(key);
  return value ? (JSON.parse(value) as T) : null;
}

function saveStoredTheme<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function validateThemeContrast(theme: ThemeDefinition, mode: ThemeMode): ContrastWarning[] {
  const palette = getThemePalette(theme, mode);
  const warnings: ContrastWarning[] = [];

  // Check text on surface contrast
  const textSurfaceContrast = validateContrast(palette.text, palette.surface);
  if (!textSurfaceContrast.isCompliant) {
    warnings.push({
      field: 'text-surface',
      colors: `Text (${palette.text}) on Surface (${palette.surface})`,
      ratio: textSurfaceContrast.ratio,
      isCompliant: false,
    });
  }

  // Check muted text on surface contrast
  const mutedSurfaceContrast = validateContrast(palette.muted, palette.surface);
  if (!mutedSurfaceContrast.isCompliant) {
    warnings.push({
      field: 'muted-surface',
      colors: `Muted (${palette.muted}) on Surface (${palette.surface})`,
      ratio: mutedSurfaceContrast.ratio,
      isCompliant: false,
    });
  }

  // Check primary text contrast
  const primaryTextContrast = validateContrast(palette.primary, palette.surface);
  if (!primaryTextContrast.isCompliant) {
    warnings.push({
      field: 'primary-surface',
      colors: `Primary (${palette.primary}) on Surface (${palette.surface})`,
      ratio: primaryTextContrast.ratio,
      isCompliant: false,
    });
  }

  return warnings;
}

interface ContrastWarning {
  field: string;
  colors: string;
  ratio: number;
  isCompliant: boolean;
}

export default function ThemeCustomizer(): React.JSX.Element {
  const [previewTheme, setPreviewTheme] = useState<ThemeDefinition>(presetThemes[0]);
  const [appliedTheme, setAppliedTheme] = useState<ThemeDefinition>(presetThemes[0]);
  const [customThemes, setCustomThemes] = useState<SavedTheme[]>([]);
  const [customTheme, setCustomTheme] = useState<ThemeDefinition>(defaultCustomTheme);
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [schemeLabel, setSchemeLabel] = useState('Light preview');
  const [contrastWarnings, setContrastWarnings] = useState<ContrastWarning[]>([]);
  const themeErrors = {
    name: requiredField(customTheme.name, 'Theme name'),
    description: requiredField(customTheme.description, 'Description'),
  };

  useEffect(() => {
    const storedPreference = readStoredTheme<ThemeDefinition>(STORAGE_KEYS.preference);
    const storedCustomThemes = readStoredTheme<SavedTheme[]>(STORAGE_KEYS.customThemes) || [];
    const preferredMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    if (storedPreference) {
      setAppliedTheme(storedPreference);
      setPreviewTheme(storedPreference);
      setCustomTheme(storedPreference);
    }

    if (storedCustomThemes.length) {
      setCustomThemes(storedCustomThemes);
    }

    setThemeMode(preferredMode);
    setSchemeLabel(preferredMode === 'dark' ? 'Dark preview' : 'Light preview');
    applyThemeToDocument(storedPreference || presetThemes[0], preferredMode);
  }, []);

  useEffect(() => {
    applyThemeToDocument(previewTheme, themeMode);
    // Validate contrast when theme or mode changes
    const warnings = validateThemeContrast(previewTheme, themeMode);
    setContrastWarnings(warnings);
  }, [previewTheme, themeMode]);

  const themeVariables = useMemo(() => {
    const palette = getThemePalette(previewTheme, themeMode);
    return {
      '--ifm-color-primary': palette.primary,
      '--ifm-color-primary-dark': palette.primary,
      '--ifm-color-primary-darker': palette.secondary,
      '--ifm-color-primary-darkest': palette.secondary,
      '--ifm-color-primary-light': palette.secondary,
      '--ifm-color-primary-lighter': palette.secondary,
      '--ifm-color-primary-lightest': palette.secondary,
      '--ifm-background-color': palette.surface,
      '--ifm-color-content': palette.text,
      '--ifm-color-content-secondary': palette.muted,
      '--ifm-color-emphasis-300': palette.border,
      '--ifm-font-family-base': previewTheme.fontFamily,
      '--ifm-heading-font-family': previewTheme.headingFontFamily,
      '--proxypay-theme-spacing': `${previewTheme.spacing}px`,
    } as React.CSSProperties;
  }, [previewTheme, themeMode]);

  const handlePresetSelect = (theme: ThemeDefinition) => {
    setPreviewTheme(theme);
    setCustomTheme(theme);
  };

  const handleLoadCustomTheme = (theme: SavedTheme) => {
    setPreviewTheme(theme);
    setCustomTheme(theme);
  };

  const handleSaveCustomTheme = () => {
    const nextTheme = {
      ...customTheme,
      id: `${customTheme.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      savedAt: new Date().toISOString(),
    } satisfies SavedTheme;

    const updated = [nextTheme, ...customThemes.filter((theme) => theme.name !== nextTheme.name)];
    setCustomThemes(updated);
    saveStoredTheme(STORAGE_KEYS.customThemes, updated);
    setPreviewTheme(nextTheme);
    setCustomTheme(nextTheme);
  };

  const handleApplyTheme = () => {
    setAppliedTheme(previewTheme);
    saveStoredTheme(STORAGE_KEYS.preference, previewTheme);
    applyThemeToDocument(previewTheme, themeMode);
  };

  const handleExportTheme = () => {
    exportAsJson(previewTheme);
  };

  const updateCustomField = (field: keyof ThemeDefinition, value: string | number) => {
    setCustomTheme((current) => ({
      ...current,
      [field]: value,
    } as ThemeDefinition));
    setPreviewTheme((current) => ({
      ...current,
      [field]: value,
    } as ThemeDefinition));
  };

  const updatePaletteField = (field: keyof ThemePalette, value: string) => {
    setCustomTheme((current) => ({
      ...current,
      palette: {
        ...current.palette,
        [field]: value,
      },
    }));
    setPreviewTheme((current) => ({
      ...current,
      palette: {
        ...current.palette,
        [field]: value,
      },
    }));
  };

  const updateDarkPaletteField = (field: keyof ThemePalette, value: string) => {
    setCustomTheme((current) => ({
      ...current,
      darkPalette: {
        ...(current.darkPalette || current.palette),
        [field]: value,
      },
    }));
    setPreviewTheme((current) => ({
      ...current,
      darkPalette: {
        ...(current.darkPalette || current.palette),
        [field]: value,
      },
    }));
  };

  const toggleThemeMode = () => {
    const nextMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextMode);
    setSchemeLabel(nextMode === 'dark' ? 'Dark preview' : 'Light preview');
  };

  const getSuggestedTextColor = (): string | null => {
    const palette = getThemePalette(customTheme, themeMode);
    const suggestions = suggestColors(palette.text, palette.surface);
    return suggestions.find((s) => s.isValid)?.color || null;
  };

  return (
    <section className="theme-customizer" style={themeVariables}>
      <div className="theme-customizer__hero">
        <div className="theme-customizer__copy">
          <p className="theme-customizer__eyebrow">Theme customization</p>
          <h2>Choose a preset, tune a custom look, and preview before you apply.</h2>
          <p>
            The selector includes built-in themes, custom options, saved presets, and JSON export so
            your docs feel right at home.
          </p>
        </div>
        <div className="theme-customizer__actions">
          <button className="button button--primary" type="button" onClick={handleApplyTheme}>
            Apply theme
          </button>
          <button className="button button--secondary" type="button" onClick={toggleThemeMode}>
            {schemeLabel}
          </button>
        </div>
      </div>

      <div className="theme-customizer__grid">
        <div className="theme-customizer__panel">
          <h3>Preset themes</h3>
          <div className="theme-customizer__list">
            {presetThemes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className="theme-tile"
                onClick={() => handlePresetSelect(theme)}
              >
                <span className="theme-tile__swatches">
                  <span style={{ background: theme.palette.primary }} />
                  <span style={{ background: theme.palette.secondary }} />
                  <span style={{ background: theme.palette.surface }} />
                </span>
                <strong>{theme.name}</strong>
                <small>{theme.description}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="theme-customizer__panel">
          <h3>Preview</h3>
          <div className="theme-preview-card">
            <div className="theme-preview-card__top">
              <span className="theme-preview-card__badge">{previewTheme.name}</span>
              <span className="theme-preview-card__chip">{themeMode === 'dark' ? 'Dark mode' : 'Light mode'}</span>
            </div>
            <h4>{previewTheme.description}</h4>
            <p>
              This preview updates instantly so you can compare fonts, spacing, and contrast before
              committing to the change.
            </p>
            <div className="theme-preview-card__actions">
              <a className="button button--primary button--sm" href="#">Sample action</a>
              <a className="button button--secondary button--sm" href="#">View docs</a>
            </div>
          </div>
        </div>
      </div>

      <div className="theme-customizer__grid theme-customizer__grid--wide">
        <div className="theme-customizer__panel">
          <h3>Create a custom theme</h3>
          <label>
            Theme name
            <input
              type="text"
              value={customTheme.name}
              onChange={(event) => updateCustomField('name', event.target.value)}
              aria-invalid={!!themeErrors.name}
            />
            {themeErrors.name && <div className="form-error">{themeErrors.name}</div>}
          </label>
          <label>
            Description
            <input
              type="text"
              value={customTheme.description}
              onChange={(event) => updateCustomField('description', event.target.value)}
              aria-invalid={!!themeErrors.description}
            />
            {themeErrors.description && <div className="form-error">{themeErrors.description}</div>}
          </label>
          <div className="theme-customizer__controls">
            <label>
              Primary color
              <input
                type="color"
                value={customTheme.palette.primary}
                onChange={(event) => updatePaletteField('primary', event.target.value)}
              />
            </label>
            <label>
              Accent color
              <input
                type="color"
                value={customTheme.palette.secondary}
                onChange={(event) => updatePaletteField('secondary', event.target.value)}
              />
            </label>
            <label>
              Surface color
              <input
                type="color"
                value={customTheme.palette.surface}
                onChange={(event) => updatePaletteField('surface', event.target.value)}
              />
            </label>
            <label>
              Text color
              <input
                type="color"
                value={customTheme.palette.text}
                onChange={(event) => updatePaletteField('text', event.target.value)}
              />
            </label>
          </div>
          <div className="theme-customizer__controls">
            <label>
              Dark primary
              <input
                type="color"
                value={(customTheme.darkPalette || customTheme.palette).primary}
                onChange={(event) => updateDarkPaletteField('primary', event.target.value)}
              />
            </label>
            <label>
              Dark surface
              <input
                type="color"
                value={(customTheme.darkPalette || customTheme.palette).surface}
                onChange={(event) => updateDarkPaletteField('surface', event.target.value)}
              />
            </label>
          </div>
          <div className="theme-customizer__controls">
            <label>
              Font family
              <select
                value={customTheme.fontFamily}
                onChange={(event) => updateCustomField('fontFamily', event.target.value)}
              >
                <option value="Inter, system-ui, sans-serif">Inter</option>
                <option value="Source Sans 3, system-ui, sans-serif">Source Sans 3</option>
                <option value="Manrope, system-ui, sans-serif">Manrope</option>
                <option value="IBM Plex Sans, system-ui, sans-serif">IBM Plex Sans</option>
              </select>
            </label>
            <label>
              Spacing
              <input
                type="range"
                min="8"
                max="24"
                value={customTheme.spacing}
                onChange={(event) => updateCustomField('spacing', Number(event.target.value))}
              />
              <span>{customTheme.spacing}px</span>
            </label>
          </div>
          <div className="theme-customizer__actions theme-customizer__actions--inline">
            <button className="button button--primary" type="button" onClick={handleSaveCustomTheme} disabled={Object.values(themeErrors).some(Boolean)}>
              Save custom theme
            </button>
            <button className="button button--secondary" type="button" onClick={handleExportTheme}>
              Export JSON
            </button>
          </div>

          {contrastWarnings.length > 0 && (
            <div className="theme-customizer__warnings">
              <h4>⚠️ Contrast Issues Detected</h4>
              <p>
                The current color combination may not meet WCAG AA accessibility standards. Users with
                vision deficiencies may struggle to read the text.
              </p>
              <ul>
                {contrastWarnings.map((warning) => {
                  const suggestedColor = suggestColors(
                    getThemePalette(customTheme, themeMode)[warning.field.split('-')[0] as keyof ThemePalette],
                    getThemePalette(customTheme, themeMode)[warning.field.split('-')[1] as keyof ThemePalette]
                  ).find((s) => s.isValid);
                  return (
                    <li key={warning.field}>
                      <strong>{warning.colors}</strong> — Ratio: {warning.ratio.toFixed(2)}:1 (need 4.5:1)
                      {suggestedColor && (
                        <div style={{ marginTop: '8px', fontSize: '0.9em' }}>
                          <span style={{ display: 'inline-block', marginRight: '8px' }}>Suggestion: </span>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '24px',
                              height: '24px',
                              backgroundColor: suggestedColor.color,
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              verticalAlign: 'middle',
                            }}
                            title={suggestedColor.color}
                          />
                          <span style={{ marginLeft: '8px' }}>
                            {suggestedColor.color} (Ratio: {suggestedColor.ratio.toFixed(2)}:1)
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="theme-customizer__panel">
          <h3>Saved custom themes</h3>
          {customThemes.length ? (
            <div className="theme-customizer__list">
              {customThemes.map((theme) => (
                <button key={theme.id} type="button" className="theme-tile" onClick={() => handleLoadCustomTheme(theme)}>
                  <strong>{theme.name}</strong>
                  <small>{theme.description}</small>
                  <small>{new Date(theme.savedAt).toLocaleDateString()}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="theme-customizer__empty">No custom themes saved yet. Save one to load it later.</p>
          )}
        </div>
      </div>
    </section>
  );
}
