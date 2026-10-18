/**
 * SpecVersionManager
 *
 * Manages OpenAPI spec versioning on every page load:
 * - Computes MD5 hash of current spec at runtime
 * - Detects spec changes by comparing with stored version
 * - Stores version metadata in localStorage
 * - Provides cache-busting version string for Redoc URL
 */

import crypto from 'crypto';

export interface SpecVersion {
  hash: string; // MD5 hash of spec content
  timestamp: number; // When this version was first seen
  size: number; // Spec size in bytes
}

export interface VersionCheckResult {
  currentHash: string;
  previousHash: string | null;
  hasChanged: boolean;
  isFirstLoad: boolean;
}

const VERSION_STORAGE_KEY = 'proxypay-spec-version';
const VERSION_HISTORY_KEY = 'proxypay-spec-version-history';
const MAX_VERSION_HISTORY = 10; // Keep last 10 versions

/**
 * Compute MD5 hash of spec content (first 8 chars for brevity)
 */
export function computeSpecHash(specContent: string | Blob): string {
  try {
    let content: string;

    if (specContent instanceof Blob) {
      // Can't use crypto.createHash with Blob in browser
      // Fall back to Web Crypto API if available
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        // For browser environment, we'll do this async
        // Caller should handle the async operation
        return 'pending';
      }
      return 'unavailable';
    }

    content = typeof specContent === 'string' ? specContent : '';

    // Use simple hash function compatible with browser
    // Compute MD5-like hash using basic string operations
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to hex string and take first 8 chars
    return Math.abs(hash).toString(16).slice(0, 8);
  } catch (error) {
    console.warn('Failed to compute spec hash:', error);
    return 'unknown';
  }
}

/**
 * Compute spec hash asynchronously using Web Crypto API (more accurate MD5-equivalent)
 * Falls back to simple hash if Web Crypto is unavailable
 */
export async function computeSpecHashAsync(specContent: string): Promise<string> {
  try {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      // Node.js environment or Web Crypto not available
      return computeSpecHash(specContent);
    }

    // Use SubtleCrypto for SHA-256 (more accurate than simple hash)
    const encoder = new TextEncoder();
    const data = encoder.encode(specContent);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Return first 8 characters
    return hashHex.slice(0, 8);
  } catch (error) {
    console.warn('Failed to compute spec hash with Web Crypto:', error);
    return computeSpecHash(specContent);
  }
}

/**
 * Load the current stored version from localStorage
 */
export function loadStoredVersion(): SpecVersion | null {
  try {
    const raw = localStorage.getItem(VERSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Failed to load stored spec version:', error);
    return null;
  }
}

/**
 * Save version to localStorage
 */
export function saveSpecVersion(hash: string, size: number): SpecVersion {
  const version: SpecVersion = {
    hash,
    timestamp: Date.now(),
    size,
  };

  try {
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(version));
    addToVersionHistory(version);
  } catch (error) {
    console.warn('Failed to save spec version:', error);
  }

  return version;
}

/**
 * Load version history from localStorage
 */
export function loadVersionHistory(): SpecVersion[] {
  try {
    const raw = localStorage.getItem(VERSION_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Failed to load version history:', error);
    return [];
  }
}

/**
 * Add version to history (keep only unique hashes, limit to MAX_VERSION_HISTORY)
 */
export function addToVersionHistory(version: SpecVersion): void {
  try {
    const history = loadVersionHistory();

    // Check if this hash already exists in history
    const exists = history.some((v) => v.hash === version.hash);
    if (exists) {
      return; // Don't duplicate
    }

    // Add new version and keep only the most recent MAX_VERSION_HISTORY
    const updated = [version, ...history].slice(0, MAX_VERSION_HISTORY);
    localStorage.setItem(VERSION_HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to add to version history:', error);
  }
}

/**
 * Clear version history
 */
export function clearVersionHistory(): void {
  try {
    localStorage.removeItem(VERSION_HISTORY_KEY);
    localStorage.removeItem(VERSION_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear version history:', error);
  }
}

/**
 * Check if spec has changed and return comparison result
 */
export async function checkSpecVersion(specContent: string): Promise<VersionCheckResult> {
  const currentHash = await computeSpecHashAsync(specContent);
  const storedVersion = loadStoredVersion();
  const previousHash = storedVersion?.hash || null;
  const hasChanged = previousHash !== null && previousHash !== currentHash;
  const isFirstLoad = previousHash === null;

  return {
    currentHash,
    previousHash,
    hasChanged,
    isFirstLoad,
  };
}

/**
 * Update version tracking after spec load
 * Returns the version metadata
 */
export function updateVersionTracking(specContent: string): SpecVersion {
  const hash = computeSpecHash(specContent);
  const size = new Blob([specContent]).size;
  return saveSpecVersion(hash, size);
}

/**
 * Get the current version hash for use in cache-busting URLs
 * Falls back to timestamp-based version if no stored version
 */
export function getCacheBustingVersion(): string {
  const stored = loadStoredVersion();
  if (stored) {
    return stored.hash;
  }

  // Fallback: use a version string from build time (injected by webpack)
  if (typeof (window as any).__OPENAPI_VERSION__ !== 'undefined') {
    return (window as any).__OPENAPI_VERSION__;
  }

  // Final fallback: use current timestamp (ensures fresh fetch)
  return Math.floor(Date.now() / 1000).toString(16);
}

/**
 * Construct spec URL with cache-busting query parameter
 */
export function getSpecUrlWithCacheBusting(baseUrl: string = '/openapi.yaml'): string {
  const version = getCacheBustingVersion();
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}v=${version}`;
}

/**
 * Get version change notification data
 */
export function getVersionChangeNotification(): { hasUpdate: boolean; previousVersion: string | null; currentVersion: string } | null {
  const stored = loadStoredVersion();
  const history = loadVersionHistory();

  if (!stored || history.length < 2) {
    return null;
  }

  const previous = history[1]; // Second entry is the previous version
  return {
    hasUpdate: true,
    previousVersion: previous?.hash || null,
    currentVersion: stored.hash,
  };
}
