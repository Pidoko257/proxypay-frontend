/**
 * WCAG Contrast Validation Utilities
 *
 * Implements WCAG AA accessibility standards for color contrast ratios.
 * WCAG AA requires a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text.
 */

/**
 * Result of a contrast validation check
 */
export interface ContrastCheckResult {
  ratio: number;
  isCompliant: boolean;
  level: 'AA' | 'AAA' | 'FAIL';
  message: string;
}

/**
 * Suggested color for improving contrast
 */
export interface SuggestedColor {
  color: string;
  ratio: number;
  isValid: boolean;
}

/**
 * Convert hex color to RGB object
 * @param hex - Hex color string (e.g., "#ff0000" or "ff0000")
 * @returns RGB object with r, g, b properties (0-255)
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '');
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex color string
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Hex color string (e.g., "#ff0000")
 */
export function rgbToHex(r: number, g: number, b: number): string {
  // Clamp values to 0-255
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  const clamped = [clamp(r), clamp(g), clamp(b)];
  
  return `#${clamped.map((x) => {
    const hex = x.toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  }).join('')}`;
}

/**
 * Calculate relative luminance of a color according to WCAG 2.0
 * @param hex - Hex color string
 * @returns Relative luminance value (0-1)
 */
export function calculateLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  // Normalize RGB values to 0-1
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  // Apply gamma correction
  const getLuminanceComponent = (c: number) => {
    if (c <= 0.03928) {
      return c / 12.92;
    }
    return Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const rLum = getLuminanceComponent(r);
  const gLum = getLuminanceComponent(g);
  const bLum = getLuminanceComponent(b);

  // Calculate relative luminance
  return 0.2126 * rLum + 0.7152 * gLum + 0.0722 * bLum;
}

/**
 * Calculate contrast ratio between two colors according to WCAG 2.0
 * Formula: (L1 + 0.05) / (L2 + 0.05), where L1 is the lighter color
 * @param color1 - First hex color string
 * @param color2 - Second hex color string
 * @returns Contrast ratio (1-21)
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const lum1 = calculateLuminance(color1);
  const lum2 = calculateLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 * @param ratio - Contrast ratio value
 * @returns true if ratio >= 4.5 (WCAG AA for normal text)
 */
export function isWcagAACompliant(ratio: number): boolean {
  return ratio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 * @param ratio - Contrast ratio value
 * @returns true if ratio >= 7 (WCAG AAA for normal text)
 */
export function isWcagAAACompliant(ratio: number): boolean {
  return ratio >= 7;
}

/**
 * Validate contrast between foreground and background colors
 * @param fgColor - Foreground (text) color in hex
 * @param bgColor - Background color in hex
 * @returns Contrast check result with ratio, compliance status, and message
 */
export function validateContrast(fgColor: string, bgColor: string): ContrastCheckResult {
  const ratio = calculateContrastRatio(fgColor, bgColor);

  if (isWcagAAACompliant(ratio)) {
    return {
      ratio: Math.round(ratio * 100) / 100,
      isCompliant: true,
      level: 'AAA',
      message: `Excellent contrast ratio (${(Math.round(ratio * 100) / 100).toFixed(2)}:1) — exceeds WCAG AAA standards.`,
    };
  }

  if (isWcagAACompliant(ratio)) {
    return {
      ratio: Math.round(ratio * 100) / 100,
      isCompliant: true,
      level: 'AA',
      message: `Good contrast ratio (${(Math.round(ratio * 100) / 100).toFixed(2)}:1) — meets WCAG AA standards.`,
    };
  }

  return {
    ratio: Math.round(ratio * 100) / 100,
    isCompliant: false,
    level: 'FAIL',
    message: `Poor contrast ratio (${(Math.round(ratio * 100) / 100).toFixed(2)}:1) — does not meet WCAG AA standards (minimum 4.5:1). Text may be hard to read.`,
  };
}

/**
 * Adjust color brightness by a given amount
 * @param hex - Hex color string
 * @param amount - Amount to adjust (-255 to 255)
 * @returns Adjusted hex color string
 */
function adjustBrightness(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = Math.max(0, Math.min(255, rgb.r + amount));
  const g = Math.max(0, Math.min(255, rgb.g + amount));
  const b = Math.max(0, Math.min(255, rgb.b + amount));

  return rgbToHex(r, g, b);
}

/**
 * Generate suggested colors to improve contrast
 * Tries to adjust the foreground or background color to reach WCAG AA compliance
 * @param fgColor - Foreground (text) color in hex
 * @param bgColor - Background color in hex
 * @returns Array of suggested color pairs with their contrast ratios
 */
export function suggestColors(fgColor: string, bgColor: string): SuggestedColor[] {
  const suggestions: SuggestedColor[] = [];
  const currentRatio = calculateContrastRatio(fgColor, bgColor);
  const targetRatio = 4.5;

  // If already compliant, return empty suggestions
  if (currentRatio >= targetRatio) {
    return suggestions;
  }

  const fgLum = calculateLuminance(fgColor);
  const bgLum = calculateLuminance(bgColor);

  // Determine which color to adjust
  const shouldLightenFg = fgLum < bgLum; // If fg is darker than bg, lighten it
  const shouldDarkenBg = bgLum > fgLum; // If bg is lighter than fg, darken it

  // Try adjusting foreground color (lighten if darker, darken if lighter)
  if (shouldLightenFg) {
    for (let adjustment = 10; adjustment <= 100; adjustment += 10) {
      const suggested = adjustBrightness(fgColor, adjustment);
      const ratio = calculateContrastRatio(suggested, bgColor);
      suggestions.push({
        color: suggested,
        ratio: Math.round(ratio * 100) / 100,
        isValid: ratio >= targetRatio,
      });
      if (ratio >= targetRatio) break;
    }
  } else {
    for (let adjustment = -10; adjustment >= -100; adjustment -= 10) {
      const suggested = adjustBrightness(fgColor, adjustment);
      const ratio = calculateContrastRatio(suggested, bgColor);
      suggestions.push({
        color: suggested,
        ratio: Math.round(ratio * 100) / 100,
        isValid: ratio >= targetRatio,
      });
      if (ratio >= targetRatio) break;
    }
  }

  // Try adjusting background color if foreground adjustment didn't work
  if (suggestions.length === 0 || !suggestions[suggestions.length - 1].isValid) {
    if (shouldDarkenBg) {
      for (let adjustment = -10; adjustment >= -100; adjustment -= 10) {
        const suggested = adjustBrightness(bgColor, adjustment);
        const ratio = calculateContrastRatio(fgColor, suggested);
        suggestions.push({
          color: suggested,
          ratio: Math.round(ratio * 100) / 100,
          isValid: ratio >= targetRatio,
        });
        if (ratio >= targetRatio) break;
      }
    } else {
      for (let adjustment = 10; adjustment <= 100; adjustment += 10) {
        const suggested = adjustBrightness(bgColor, adjustment);
        const ratio = calculateContrastRatio(fgColor, suggested);
        suggestions.push({
          color: suggested,
          ratio: Math.round(ratio * 100) / 100,
          isValid: ratio >= targetRatio,
        });
        if (ratio >= targetRatio) break;
      }
    }
  }

  // Return first 3 suggestions or first valid one
  return suggestions.slice(0, 3);
}
