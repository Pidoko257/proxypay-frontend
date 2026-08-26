import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDownloadFilename,
  toCSV,
  serializeRows,
  triggerDownload,
} from '../components/logsDownload.utils.ts';

test('buildDownloadFilename embeds active filters and a date stamp', () => {
  const name = buildDownloadFilename(
    'server-logs',
    { tab: 'errors', endpoint: '/payments/{id}', status: '5xx', empty: '' },
    'csv',
    new Date('2026-08-26T12:00:00Z'),
  );
  assert.equal(name, 'server-logs_tab-errors_endpoint-payments-id_status-5xx_2026-08-26.csv');
});

test('buildDownloadFilename works with no filters', () => {
  const name = buildDownloadFilename('logs', {}, 'json', new Date('2026-01-02T00:00:00Z'));
  assert.equal(name, 'logs_2026-01-02.json');
});

test('toCSV escapes commas, quotes and newlines', () => {
  const csv = toCSV([
    { a: 'plain', b: 'has,comma' },
    { a: 'quote"d', b: 'line\nbreak' },
  ]);
  assert.equal(
    csv,
    'a,b\nplain,"has,comma"\n"quote""d","line\nbreak"',
  );
});

test('toCSV returns empty string for no rows', () => {
  assert.equal(toCSV([]), '');
});

test('serializeRows switches format and mime type', () => {
  const rows = [{ x: 1 }];
  assert.equal(serializeRows(rows, 'json').mimeType, 'application/json');
  assert.deepEqual(JSON.parse(serializeRows(rows, 'json').content), rows);
  assert.match(serializeRows(rows, 'csv').mimeType, /text\/csv/);
});

test('triggerDownload is a safe no-op outside the browser', () => {
  assert.equal(triggerDownload('f.csv', 'a,b', 'text/csv'), false);
});
