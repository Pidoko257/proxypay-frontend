/**
 * Unit tests for SpecVersionManager
 */

import {
  computeSpecHash,
  computeSpecHashAsync,
  loadStoredVersion,
  saveSpecVersion,
  loadVersionHistory,
  addToVersionHistory,
  clearVersionHistory,
  checkSpecVersion,
  updateVersionTracking,
  getCacheBustingVersion,
  getSpecUrlWithCacheBusting,
  getVersionChangeNotification,
} from '../utils/specVersionManager';

// Mock localStorage
class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

Object.defineProperty(window, 'localStorage', {
  value: new MockLocalStorage(),
});

describe('SpecVersionManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('computeSpecHash', () => {
    it('should compute consistent hash for same content', () => {
      const spec = 'openapi: 3.0.0\ninfo:\n  title: Test API\n';
      const hash1 = computeSpecHash(spec);
      const hash2 = computeSpecHash(spec);
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different content', () => {
      const spec1 = 'openapi: 3.0.0\n';
      const spec2 = 'openapi: 3.1.0\n';
      const hash1 = computeSpecHash(spec1);
      const hash2 = computeSpecHash(spec2);
      expect(hash1).not.toBe(hash2);
    });

    it('should return 8-character hex string', () => {
      const spec = 'openapi: 3.0.0\n';
      const hash = computeSpecHash(spec);
      expect(hash).toMatch(/^[0-9a-f]{1,8}$/);
    });

    it('should handle empty spec gracefully', () => {
      const hash = computeSpecHash('');
      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('computeSpecHashAsync', () => {
    it('should return a valid hash string', async () => {
      const spec = 'openapi: 3.0.0\ninfo:\n  title: Test API\n';
      const hash = await computeSpecHashAsync(spec);
      expect(hash).toBeTruthy();
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should be consistent for same content', async () => {
      const spec = 'openapi: 3.0.0\n';
      const hash1 = await computeSpecHashAsync(spec);
      const hash2 = await computeSpecHashAsync(spec);
      expect(hash1).toBe(hash2);
    });
  });

  describe('saveSpecVersion', () => {
    it('should save version to localStorage', () => {
      const version = saveSpecVersion('abc12345', 1024);
      expect(version.hash).toBe('abc12345');
      expect(version.size).toBe(1024);
      expect(version.timestamp).toBeTruthy();
    });

    it('should store version in localStorage', () => {
      saveSpecVersion('abc12345', 1024);
      const stored = loadStoredVersion();
      expect(stored?.hash).toBe('abc12345');
      expect(stored?.size).toBe(1024);
    });

    it('should add version to history', () => {
      saveSpecVersion('hash1', 1024);
      const history = loadVersionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].hash).toBe('hash1');
    });
  });

  describe('loadVersionHistory', () => {
    it('should return empty array initially', () => {
      const history = loadVersionHistory();
      expect(history).toEqual([]);
    });

    it('should return saved versions in order', () => {
      saveSpecVersion('hash1', 1024);
      saveSpecVersion('hash2', 2048);
      const history = loadVersionHistory();
      expect(history).toHaveLength(2);
      expect(history[0].hash).toBe('hash2'); // Most recent first
      expect(history[1].hash).toBe('hash1');
    });

    it('should not duplicate identical hashes', () => {
      saveSpecVersion('hash1', 1024);
      saveSpecVersion('hash1', 1024);
      const history = loadVersionHistory();
      expect(history).toHaveLength(1);
    });
  });

  describe('clearVersionHistory', () => {
    it('should clear both version storage and history', () => {
      saveSpecVersion('hash1', 1024);
      clearVersionHistory();
      expect(loadStoredVersion()).toBeNull();
      expect(loadVersionHistory()).toEqual([]);
    });
  });

  describe('checkSpecVersion', () => {
    it('should detect spec changes', async () => {
      saveSpecVersion('oldHash', 1024);
      const result = await checkSpecVersion('different content');
      expect(result.hasChanged).toBe(true);
      expect(result.previousHash).toBe('oldHash');
    });

    it('should mark first load appropriately', async () => {
      const result = await checkSpecVersion('some content');
      expect(result.isFirstLoad).toBe(true);
      expect(result.previousHash).toBeNull();
    });

    it('should not detect change if hash is same', async () => {
      const spec = 'openapi: 3.0.0\n';
      const hash = computeSpecHash(spec);
      saveSpecVersion(hash, 100);
      const result = await checkSpecVersion(spec);
      expect(result.hasChanged).toBe(false);
    });
  });

  describe('updateVersionTracking', () => {
    it('should update version tracking and save to localStorage', () => {
      const spec = 'openapi: 3.0.0\n';
      const version = updateVersionTracking(spec);
      expect(version.hash).toBeTruthy();
      expect(version.size).toBeGreaterThan(0);
      
      const stored = loadStoredVersion();
      expect(stored?.hash).toBe(version.hash);
    });
  });

  describe('getCacheBustingVersion', () => {
    it('should return stored hash if available', () => {
      saveSpecVersion('testHash123', 1024);
      const version = getCacheBustingVersion();
      expect(version).toBe('testHash123');
    });

    it('should fallback to __OPENAPI_VERSION__ if no stored version', () => {
      (window as any).__OPENAPI_VERSION__ = 'buildVersionHash';
      const version = getCacheBustingVersion();
      expect(version).toBe('buildVersionHash');
    });

    it('should use timestamp as final fallback', () => {
      delete (window as any).__OPENAPI_VERSION__;
      const version = getCacheBustingVersion();
      expect(version).toBeTruthy();
      expect(version).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('getSpecUrlWithCacheBusting', () => {
    it('should append version query parameter to URL', () => {
      saveSpecVersion('abc12345', 1024);
      const url = getSpecUrlWithCacheBusting('/openapi.yaml');
      expect(url).toContain('?v=abc12345');
    });

    it('should use & separator if URL already has query params', () => {
      saveSpecVersion('abc12345', 1024);
      const url = getSpecUrlWithCacheBusting('/api/spec?format=yaml');
      expect(url).toContain('&v=abc12345');
    });

    it('should use default URL if not provided', () => {
      saveSpecVersion('abc12345', 1024);
      const url = getSpecUrlWithCacheBusting();
      expect(url).toContain('/openapi.yaml');
      expect(url).toContain('?v=abc12345');
    });
  });

  describe('getVersionChangeNotification', () => {
    it('should return null if no version history', () => {
      const notification = getVersionChangeNotification();
      expect(notification).toBeNull();
    });

    it('should return null if only one version in history', () => {
      saveSpecVersion('hash1', 1024);
      const notification = getVersionChangeNotification();
      expect(notification).toBeNull();
    });

    it('should return notification when multiple versions exist', () => {
      saveSpecVersion('hash1', 1024);
      saveSpecVersion('hash2', 2048);
      const notification = getVersionChangeNotification();
      expect(notification).not.toBeNull();
      expect(notification?.hasUpdate).toBe(true);
      expect(notification?.currentVersion).toBe('hash2');
      expect(notification?.previousVersion).toBe('hash1');
    });
  });
});
