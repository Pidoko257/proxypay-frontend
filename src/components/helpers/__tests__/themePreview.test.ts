import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPreviewTokens,
  parseHexColor,
  readableTextColor,
  relativeLuminance,
  describeSpacing,
  type PreviewPalette,
} from '../themePreview.ts';

const palette: PreviewPalette = {
  primary: '#2563eb',
  secondary: '#7c3aed',
  surface: '#f8fafc',
  surfaceAlt: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#dbe2ea',
};

test('buildPreviewTokens maps every palette entry to a CSS custom property', () => {
  const tokens = buildPreviewTokens(palette, 12);
  assert.equal(tokens['--tp-primary'], '#2563eb');
  assert.equal(tokens['--tp-surface'], '#f8fafc');
  assert.equal(tokens['--tp-spacing'], '12px');
});

test('buildPreviewTokens reacts in real time to a colour change', () => {
  const before = buildPreviewTokens(palette, 12);
  const after = buildPreviewTokens({ ...palette, primary: '#ff0000' }, 12);
  assert.notEqual(before['--tp-primary'], after['--tp-primary']);
  assert.equal(after['--tp-primary'], '#ff0000');
  // unrelated tokens stay put
  assert.equal(before['--tp-surface'], after['--tp-surface']);
});

test('buildPreviewTokens is a pure function of its inputs', () => {
  assert.deepEqual(buildPreviewTokens(palette, 16), buildPreviewTokens(palette, 16));
});

test('parseHexColor handles #rgb and #rrggbb', () => {
  assert.deepEqual(parseHexColor('#fff'), [255, 255, 255]);
  assert.deepEqual(parseHexColor('#000000'), [0, 0, 0]);
  assert.deepEqual(parseHexColor('2563eb'), [0x25, 0x63, 0xeb]);
  assert.equal(parseHexColor('nope'), null);
});

test('readableTextColor picks a legible foreground', () => {
  assert.equal(readableTextColor('#ffffff'), '#111111');
  assert.equal(readableTextColor('#000000'), '#ffffff');
  assert.equal(readableTextColor('#2563eb'), '#ffffff');
});

test('relativeLuminance is ordered light > dark', () => {
  assert.ok(relativeLuminance('#ffffff') > relativeLuminance('#808080'));
  assert.ok(relativeLuminance('#808080') > relativeLuminance('#000000'));
});

test('describeSpacing buckets the spacing scale', () => {
  assert.equal(describeSpacing(8), 'Compact');
  assert.equal(describeSpacing(12), 'Comfortable');
  assert.equal(describeSpacing(20), 'Spacious');
});
