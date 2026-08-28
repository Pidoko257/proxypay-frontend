/**
 * Tests for Redoc theme helpers (issue #356).
 * Verifies that a theme change is detected and that the generated Redoc theme
 * reflects the current colours (theme change propagation).
 */

import {
  DEFAULT_REDOC_THEME_COLORS,
  buildRedocTheme,
  readRedocThemeColors,
  redocThemeColorsEqual,
} from '../redocTheme';

/** Build a fake window whose CSS custom properties can be swapped at runtime. */
function fakeWindow(vars: Record<string, string>) {
  const current = { ...vars };
  return {
    win: {
      document: { documentElement: {} },
      getComputedStyle: () => ({
        getPropertyValue: (prop: string) => current[prop] ?? '',
      }),
    } as unknown as Window,
    setVars: (next: Record<string, string>) => {
      Object.assign(current, next);
    },
  };
}

describe('redocTheme (#356)', () => {
  it('falls back to the default palette without a DOM', () => {
    expect(readRedocThemeColors(undefined)).toEqual(DEFAULT_REDOC_THEME_COLORS);
  });

  it('reads the current --ifm-* custom properties', () => {
    const { win } = fakeWindow({
      '--ifm-color-primary': '#2e8555',
      '--ifm-background-color': '#ffffff',
      '--ifm-background-surface-color': '#f5f6f7',
      '--ifm-font-color-base': '#1c1e21',
    });
    expect(readRedocThemeColors(win)).toEqual({
      primary: '#2e8555',
      background: '#ffffff',
      surface: '#f5f6f7',
      text: '#1c1e21',
    });
  });

  it('detects a light -> dark theme change', () => {
    const { win, setVars } = fakeWindow({
      '--ifm-color-primary': '#25c2a0',
      '--ifm-background-color': '#ffffff',
      '--ifm-background-surface-color': '#f5f6f7',
      '--ifm-font-color-base': '#1c1e21',
    });

    const before = readRedocThemeColors(win);

    setVars({
      '--ifm-background-color': '#1b1b1d',
      '--ifm-background-surface-color': '#242526',
      '--ifm-font-color-base': '#e3e3e3',
    });
    const after = readRedocThemeColors(win);

    expect(redocThemeColorsEqual(before, after)).toBe(false);
    expect(redocThemeColorsEqual(after, after)).toBe(true);
  });

  it('propagates the current colours into the Redoc theme object', () => {
    const dark = {
      primary: '#25c2a0',
      background: '#1b1b1d',
      surface: '#242526',
      text: '#e3e3e3',
    };
    const theme = buildRedocTheme(dark);
    expect(theme.colors.primary.main).toBe('#25c2a0');
    expect(theme.colors.background).toBe('#1b1b1d');
    expect(theme.colors.text.primary).toBe('#e3e3e3');
    expect(theme.rightPanel.backgroundColor).toBe('#242526');
    expect(theme.sidebar.activeTextColor).toBe('#25c2a0');
  });

  it('uses fallbacks for missing custom properties', () => {
    const { win } = fakeWindow({ '--ifm-color-primary': '#abcdef' });
    const colors = readRedocThemeColors(win);
    expect(colors.primary).toBe('#abcdef');
    expect(colors.background).toBe(DEFAULT_REDOC_THEME_COLORS.background);
    expect(colors.surface).toBe(DEFAULT_REDOC_THEME_COLORS.surface);
    expect(colors.text).toBe(DEFAULT_REDOC_THEME_COLORS.text);
  });
});
