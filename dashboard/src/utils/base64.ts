/**
 * Decodes a base64 string, adding padding when the input length is not a
 * multiple of 4. Some browsers throw a `DOMException` from `atob` on
 * non-padded input, so callers should use this helper instead of `atob`
 * directly when decoding JWT payloads or other base64 segments.
 */
export function decodeBase64(input: string): string {
  const padded = input.padEnd(Math.ceil(input.length / 4) * 4, '=');
  return atob(padded);
}
