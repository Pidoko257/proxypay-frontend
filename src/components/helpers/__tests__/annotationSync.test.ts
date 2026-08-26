import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reconcileAnnotationsFromStorage,
  isAnnotationStorageEvent,
  describeRemoval,
} from '../annotationSync.ts';

const ANNOTATIONS_KEY = 'proxypay-annotations';

const a = { id: 'a', text: 'first' };
const b = { id: 'b', text: 'second' };
const c = { id: 'c', text: 'third' };

test('detects an annotation deleted in another tab', () => {
  const result = reconcileAnnotationsFromStorage([a, b, c], JSON.stringify([a, c]));
  assert.deepEqual(result.removedIds, ['b']);
  assert.deepEqual(result.addedIds, []);
  assert.equal(result.changed, true);
  assert.deepEqual(result.annotations, [a, c]);
});

test('detects an annotation added in another tab', () => {
  const result = reconcileAnnotationsFromStorage([a], JSON.stringify([a, b]));
  assert.deepEqual(result.addedIds, ['b']);
  assert.deepEqual(result.removedIds, []);
  assert.equal(result.changed, true);
});

test('treats localStorage.clear() (empty snapshot) as removing everything', () => {
  const result = reconcileAnnotationsFromStorage([a, b], null);
  assert.deepEqual(result.removedIds, ['a', 'b']);
  assert.deepEqual(result.annotations, []);
});

test('no change when snapshot matches current state', () => {
  const result = reconcileAnnotationsFromStorage([a, b], JSON.stringify([a, b]));
  assert.equal(result.changed, false);
  assert.deepEqual(result.removedIds, []);
  assert.deepEqual(result.addedIds, []);
});

test('keeps previous list when the snapshot is corrupt', () => {
  const result = reconcileAnnotationsFromStorage([a, b], '{not json');
  assert.equal(result.changed, false);
  assert.deepEqual(result.annotations, [a, b]);
});

test('keeps previous list when the snapshot is not an array', () => {
  const result = reconcileAnnotationsFromStorage([a], JSON.stringify({ id: 'x' }));
  assert.equal(result.changed, false);
  assert.deepEqual(result.annotations, [a]);
});

test('isAnnotationStorageEvent matches the annotations key and full clears', () => {
  assert.equal(isAnnotationStorageEvent(ANNOTATIONS_KEY, ANNOTATIONS_KEY), true);
  assert.equal(isAnnotationStorageEvent(null, ANNOTATIONS_KEY), true);
  assert.equal(isAnnotationStorageEvent('proxypay-username', ANNOTATIONS_KEY), false);
});

test('describeRemoval produces singular/plural copy', () => {
  assert.equal(describeRemoval(0), '');
  assert.equal(describeRemoval(1), 'An annotation was deleted in another tab');
  assert.equal(describeRemoval(3), '3 annotations were deleted in another tab');
});
