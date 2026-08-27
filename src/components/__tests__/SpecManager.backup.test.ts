import { serializeBackup, parseBackup } from '../SpecManager';

/**
 * Covers issue #370 — SpecManager must be able to export saved spec versions to
 * a file and re-import them so nothing is lost if localStorage is cleared or
 * corrupted.
 */
function version(id: string, timestamp: number) {
  return {
    id,
    timestamp,
    label: `spec-${id}`,
    source: 'File: test.yaml',
    spec: `openapi: 3.0.0 # ${id}`,
    size: 20,
  };
}

describe('spec backup export / import', () => {
  it('round-trips every saved version through export then import', () => {
    const versions = [version('a', 3000), version('b', 1000)];
    const restored = parseBackup(serializeBackup(versions), []);
    expect(restored).toHaveLength(2);
    expect(restored.map((v) => v.id).sort()).toEqual(['a', 'b']);
  });

  it('returns versions newest-first after import', () => {
    const json = serializeBackup([version('old', 1000), version('new', 9000)]);
    expect(parseBackup(json, []).map((v) => v.id)).toEqual(['new', 'old']);
  });

  it('merges a backup with existing versions and de-dupes by id (backup wins)', () => {
    const existing = [version('a', 1000), version('keep', 2000)];
    const backup = serializeBackup([{ ...version('a', 5000), label: 'restored-a' }]);
    const merged = parseBackup(backup, existing);
    expect(merged.map((v) => v.id).sort()).toEqual(['a', 'keep']);
    expect(merged.find((v) => v.id === 'a')?.label).toBe('restored-a');
  });

  it('rejects a file that is not a ProxyPay spec backup', () => {
    expect(() => parseBackup('{"type":"something-else","versions":[]}', [])).toThrow();
    expect(() => parseBackup('not json', [])).toThrow();
  });
});
