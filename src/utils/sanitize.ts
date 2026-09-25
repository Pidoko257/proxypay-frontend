/**
 * Security utility for sanitizing user input to prevent XSS attacks.
 * Uses HTML entity escaping and dangerous tag removal.
 */

/**
 * HTML entity escape map for dangerous characters
 */
const ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};

/**
 * Regex pattern to match dangerous HTML tags that could execute scripts
 */
const DANGEROUS_TAGS_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>|<embed[^>]*>|<object[^>]*>|on\w+\s*=\s*["']?[^"'>\s]+["']?/gi;

/**
 * Escapes HTML special characters to prevent XSS attacks.
 * Converts &, <, >, ", ', / to their HTML entity equivalents.
 *
 * @param text - The text to escape
 * @returns Escaped text safe for display in HTML
 *
 * @example
 * escapeHtml('<script>alert("XSS")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text.replace(/[&<>"'\/]/g, (char) => ENTITY_MAP[char] || char);
}

/**
 * Removes dangerous HTML tags and event handlers.
 * This is a secondary defense layer that removes known XSS vectors.
 *
 * @param text - The text to clean
 * @returns Text with dangerous tags and handlers removed
 *
 * @example
 * stripDangerousTags('<script>alert("XSS")</script>Hello')
 * // Returns: 'Hello'
 */
export function stripDangerousTags(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text.replace(DANGEROUS_TAGS_PATTERN, '');
}

/**
 * Comprehensive sanitization combining escaping and tag removal.
 * This is the recommended approach for user-provided annotation text.
 *
 * First removes dangerous tags, then escapes remaining HTML entities.
 * This provides defense-in-depth protection against XSS attacks.
 *
 * @param text - The user-provided text to sanitize
 * @returns Fully sanitized text safe for storage and display
 *
 * @example
 * sanitizeAnnotationText('<img src="x" onerror="alert(\'XSS\')">')
 * // Returns: '&lt;img src=&quot;x&quot; onerror=&quot;alert(&#39;XSS&#39;)&quot;&gt;'
 *
 * @example
 * sanitizeAnnotationText('<script>alert("XSS")</script>Hello World')
 * // Returns: 'Hello World'
 */
export function sanitizeAnnotationText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  // First pass: remove dangerous tags
  let sanitized = stripDangerousTags(text);
  // Second pass: escape HTML entities
  sanitized = escapeHtml(sanitized);
  // Trim whitespace
  return sanitized.trim();
}

/**
 * Validates that text is safe (contains no XSS vectors).
 * Useful for security assertions in tests.
 *
 * @param text - The text to validate
 * @returns true if text appears safe, false otherwise
 */
export function isSafeText(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return true; // Empty is safe
  }
  // Check if it contains script tags or event handlers
  const hasScriptTag = /<script\b/gi.test(text);
  const hasEventHandler = /on\w+\s*=/gi.test(text);
  const hasIframe = /<iframe\b/gi.test(text);
  const hasEmbed = /<embed\b/gi.test(text);
  const hasObject = /<object\b/gi.test(text);

  return !(hasScriptTag || hasEventHandler || hasIframe || hasEmbed || hasObject);
}
