/**
 * Theme helpers for `RedocViewer`.
 *
 * Fix #356: Redoc's theme engine consumes raw colour strings — it does not
 * resolve CSS custom properties.  The viewer therefore reads the computed
 * `--ifm-*` values at init time.  Previously those values were captured only on
 * the first render, so switching the site theme afterwards left Redoc showing
 * the old palette.  These helpers make the colour snapshot reproducible and
 * comparable so the viewer can detect a theme change and re-initialise.
 */

export interface RedocThemeColors {
  primary: string;
  background: string;
  surface: string;
  text: string;
}

export const DEFAULT_REDOC_THEME_COLORS: RedocThemeColors = {
  primary: '#2e8555',
  background: '#ffffff',
  surface: '#f5f6f7',
  text: '#1c1e21',
};

/**
 * Read the current Docusaurus theme colours from the document root.
 * Falls back to the classic-light palette when a value is missing or when
 * running without a DOM (SSR).
 */
export function readRedocThemeColors(
  win: Window | undefined = typeof window !== 'undefined' ? window : undefined,
): RedocThemeColors {
  if (!win || typeof win.getComputedStyle !== 'function' || !win.document) {
    return { ...DEFAULT_REDOC_THEME_COLORS };
  }

  const style = win.getComputedStyle(win.document.documentElement);
  const read = (prop: string, fallback: string): string =>
    style.getPropertyValue(prop).trim() || fallback;

  return {
    primary: read('--ifm-color-primary', DEFAULT_REDOC_THEME_COLORS.primary),
    background: read(
      '--ifm-background-color',
      DEFAULT_REDOC_THEME_COLORS.background,
    ),
    surface: read(
      '--ifm-background-surface-color',
      DEFAULT_REDOC_THEME_COLORS.surface,
    ),
    text: read('--ifm-font-color-base', DEFAULT_REDOC_THEME_COLORS.text),
  };
}

/** Structural equality for two colour snapshots. */
export function redocThemeColorsEqual(
  a: RedocThemeColors,
  b: RedocThemeColors,
): boolean {
  return (
    a.primary === b.primary &&
    a.background === b.background &&
    a.surface === b.surface &&
    a.text === b.text
  );
}

/** Build the `theme` object passed to `Redoc.init()`. */
export function buildRedocTheme(colors: RedocThemeColors) {
  return {
    rightPanel: {
      backgroundColor: colors.surface || DEFAULT_REDOC_THEME_COLORS.surface,
    },
    colors: {
      primary: { main: colors.primary },
      error: { main: '#f93e3e' },
      text: { primary: colors.text },
      background: colors.background,
    },
    sidebar: {
      activeTextColor: colors.primary,
    },
    typography: {
      fontFamily: 'inherit',
    },
  };
}
