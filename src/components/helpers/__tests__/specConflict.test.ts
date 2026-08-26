import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectVersionConflict,
  hashSpec,
  diffSpecLines,
} from '../specConflict.ts';

const base = 'openapi: 3.0.3\ninfo:\n  title: API\npaths:\n  /a:\n    get: {}\n';
const localEdited = base.replace('/a', '/a-local');
const incomingEdited = base.replace('/a', '/a-remote');

test('hashSpec is stable and differs for different specs', () => {
  assert.equal(hashSpec(base), hashSpec(base));
  assert.notEqual(hashSpec(base), hashSpec(localEdited));
});

test('identical local and incoming -> no conflict', () => {
  const r = detectVersionConflict(base, base, base);
  assert.equal(r.hasConflict, false);
  assert.equal(r.status, 'identical');
});

test('incoming changed, local untouched -> fast-forward, no conflict', () => {
  const r = detectVersionConflict(base, incomingEdited, base);
  assert.equal(r.hasConflict, false);
  assert.equal(r.status, 'fast-forward');
});

test('local changed, incoming still at base -> no conflict, keep local', () => {
  const r = detectVersionConflict(localEdited, base, base);
  assert.equal(r.hasConflict, false);
  assert.equal(r.status, 'local-only');
});

test('both sides diverged from base -> conflict', () => {
  const r = detectVersionConflict(localEdited, incomingEdited, base);
  assert.equal(r.hasConflict, true);
  assert.equal(r.status, 'diverged');
});

test('no known base and specs differ -> conflict', () => {
  const r = detectVersionConflict(localEdited, incomingEdited, null);
  assert.equal(r.hasConflict, true);
  assert.equal(r.status, 'no-base');
});

test('diffSpecLines flags changed lines as removed + added', () => {
  const rows = diffSpecLines('line1\nline2\nline3', 'line1\nCHANGED\nline3');
  assert.deepEqual(
    rows.map((r) => r.type),
    ['context', 'removed', 'added', 'context'],
  );
  const added = rows.find((r) => r.type === 'added');
  assert.equal(added?.incoming, 'CHANGED');
});

test('diffSpecLines reports extra incoming lines as added', () => {
  const rows = diffSpecLines('a', 'a\nb');
  assert.deepEqual(rows.map((r) => r.type), ['context', 'added']);
});
