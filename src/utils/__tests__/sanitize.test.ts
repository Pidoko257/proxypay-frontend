/**
 * Tests for Issue #448 — Input Sanitization
 * Tests the sanitize utility functions.
 */

import {
  escapeHtml,
  stripDangerousTags,
  sanitizeAnnotationText,
  sanitizeInput,
  sanitizeColor,
  isValidHexColor,
  isSafeText,
} from '../sanitize';

describe('escapeHtml', () => {
  it('escapes all dangerous HTML chars', () => {
    expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
      '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
    );
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('returns empty string for non-string input', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null as unknown as string)).toBe('');
    expect(escapeHtml(undefined as unknown as string)).toBe('');
  });

  it('does not double-escape ampersands', () => {
    // Each char is escaped independently, not recursively
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });
});

describe('stripDangerousTags', () => {
  it('removes script tags', () => {
    expect(stripDangerousTags('<script>alert(1)</script>hello')).toBe('hello');
  });

  it('removes iframe tags', () => {
    expect(stripDangerousTags('<iframe src="evil.html"></iframe>text')).toBe('text');
  });

  it('removes inline event handlers', () => {
    const result = stripDangerousTags('<img src="x" onerror="alert(1)">');
    expect(result).not.toMatch(/onerror/);
  });

  it('preserves safe text', () => {
    expect(stripDangerousTags('Hello, world!')).toBe('Hello, world!');
  });
});

describe('sanitizeAnnotationText', () => {
  it('strips scripts and escapes remaining HTML', () => {
    const result = sanitizeAnnotationText('<script>alert("XSS")</script>Hello');
    expect(result).toBe('Hello');
    expect(result).not.toContain('<script>');
  });

  it('handles empty / null input', () => {
    expect(sanitizeAnnotationText('')).toBe('');
    expect(sanitizeAnnotationText(null as unknown as string)).toBe('');
  });

  it('trims whitespace', () => {
    expect(sanitizeAnnotationText('  hello  ')).toBe('hello');
  });
});

describe('sanitizeInput (#448)', () => {
  it('strips script tags from free-text input', () => {
    expect(sanitizeInput('<script>alert(1)</script>my theme')).toBe('my theme');
  });

  it('strips iframe tags', () => {
    expect(sanitizeInput('<iframe src="x"></iframe>normal text')).toBe('normal text');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeInput('')).toBe('');
    expect(sanitizeInput(null as unknown as string)).toBe('');
  });

  it('preserves safe plain text', () => {
    expect(sanitizeInput('My Custom Theme')).toBe('My Custom Theme');
  });

  it('preserves normal punctuation', () => {
    expect(sanitizeInput('2026-01-31')).toBe('2026-01-31');
  });
});

describe('isValidHexColor (#448)', () => {
  it('accepts #rrggbb', () => expect(isValidHexColor('#2e8555')).toBe(true));
  it('accepts #rgb', () => expect(isValidHexColor('#abc')).toBe(true));
  it('accepts #rrggbbaa', () => expect(isValidHexColor('#2e855580')).toBe(true));
  it('rejects rgb()', () => expect(isValidHexColor('rgb(1,2,3)')).toBe(false));
  it('rejects javascript:', () => expect(isValidHexColor('javascript:alert(1)')).toBe(false));
  it('rejects empty string', () => expect(isValidHexColor('')).toBe(false));
});

describe('sanitizeColor (#448)', () => {
  it('passes through valid hex colors', () => {
    expect(sanitizeColor('#2e8555')).toBe('#2e8555');
  });

  it('returns empty string for invalid colors', () => {
    expect(sanitizeColor('javascript:alert(1)')).toBe('');
    expect(sanitizeColor('expression(alert(1))')).toBe('');
  });

  it('trims whitespace before validating', () => {
    expect(sanitizeColor(' #fff ')).toBe('#fff');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeColor('')).toBe('');
    expect(sanitizeColor(null as unknown as string)).toBe('');
  });
});

describe('isSafeText', () => {
  it('returns true for safe text', () => {
    expect(isSafeText('hello world')).toBe(true);
    expect(isSafeText('')).toBe(true);
  });

  it('returns false for script tags', () => {
    expect(isSafeText('<script>alert(1)</script>')).toBe(false);
  });

  it('returns false for event handlers', () => {
    expect(isSafeText('foo onclick=bar')).toBe(false);
  });
});
