import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveFilename,
  sanitizeFilename,
  suggestedFilename,
} from '../exportFilename.ts';

describe('exportFilename (#362)', () => {
  it('suggests a dated base name', () => {
    assert.equal(
      suggestedFilename(new Date('2026-08-25T12:00:00Z')),
      'logs-analytics-2026-08-25',
    );
  });

  it('strips path separators and illegal characters', () => {
    assert.equal(sanitizeFilename('../../etc/pas:swd'), '..-..-etc-pas-swd');
    assert.equal(sanitizeFilename('my report*?'), 'my-report');
    assert.equal(sanitizeFilename('  spaced  name  '), 'spaced-name');
  });

  it('drops a trailing known extension so it is not doubled', () => {
    assert.equal(sanitizeFilename('quarterly.csv'), 'quarterly');
    assert.equal(sanitizeFilename('data.JSON'), 'data');
  });

  it('resolves a custom base name with the format extension', () => {
    assert.equal(resolveFilename('quarterly-report', 'csv'), 'quarterly-report.csv');
    assert.equal(resolveFilename('notes', 'markdown'), 'notes.md');
    assert.equal(resolveFilename('report.csv', 'json'), 'report.json');
  });

  it('falls back to the suggested name when the custom value is empty', () => {
    assert.match(resolveFilename('   ', 'csv'), /^logs-analytics-\d{4}-\d{2}-\d{2}\.csv$/);
    assert.match(resolveFilename('***', 'html'), /^logs-analytics-\d{4}-\d{2}-\d{2}\.html$/);
  });
});
