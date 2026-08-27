/**
 * Live-preview helpers for the Theme Customizer.
 *
 * The customizer needs to show how real UI elements (buttons, cards, inputs,
 * badges) look with the current palette *before* the theme is applied to the
 * whole site. These helpers turn a palette into a scoped set of CSS custom
 * properties plus a couple of derived colours, without touching `document`.
 */

export interface PreviewPalette {
  primary: string;
  secondary: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  border: string;
}

export type PreviewTokens = Record<string, string>;

/**
 * Build the CSS custom properties that scope the preview area. Applying these
 * to a wrapper element lets the sample components restyle in real time as the
 * user drags a colour picker.
 */
export function buildPreviewTokens(palette: PreviewPalette, spacing: number): PreviewTokens {
  return {
    '--tp-primary': palette.primary,
    '--tp-secondary': palette.secondary,
    '--tp-surface': palette.surface,
    '--tp-surface-alt': palette.surfaceAlt,
    '--tp-text': palette.text,
    '--tp-muted': palette.muted,
    '--tp-border': palette.border,
    '--tp-on-primary': readableTextColor(palette.primary),
    '--tp-on-secondary': readableTextColor(palette.secondary),
    '--tp-spacing': `${spacing}px`,
  };
}

/** Parse `#rgb` / `#rrggbb` into `[r, g, b]` (0-255). Returns `null` if unparseable. */
export function parseHexColor(hex: string): [number, number, number] | null {
  const value = hex.trim().replace(/^#/, '');
  if (value.length === 3) {
    const r = value[0];
    const g = value[1];
    const b = value[2];
    return hexTriplet(`${r}${r}`, `${g}${g}`, `${b}${b}`);
  }
  if (value.length === 6) {
    return hexTriplet(value.slice(0, 2), value.slice(2, 4), value.slice(4, 6));
  }
  return null;
}

function hexTriplet(r: string, g: string, b: string): [number, number, number] | null {
  const rn = Number.parseInt(r, 16);
  const gn = Number.parseInt(g, 16);
  const bn = Number.parseInt(b, 16);
  if (![rn, gn, bn].every((n) => Number.isFinite(n))) {
    return null;
  }
  return [rn, gn, bn];
}

/** Relative luminance per WCAG 2.x. */
export function relativeLuminance(hex: string): number {
  const rgb = parseHexColor(hex);
  if (!rgb) {
    return 0;
  }
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Pick black or white text so it stays legible on `background`. */
export function readableTextColor(background: string): string {
  return relativeLuminance(background) > 0.5 ? '#111111' : '#ffffff';
}

/** Describe the current spacing scale for the preview caption. */
export function describeSpacing(spacing: number): string {
  if (spacing <= 10) return 'Compact';
  if (spacing <= 14) return 'Comfortable';
  return 'Spacious';
}
