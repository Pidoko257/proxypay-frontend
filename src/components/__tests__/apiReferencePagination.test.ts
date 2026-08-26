import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildPaginationSearch,
  parsePaginationParams,
} from '../apiReferencePagination.ts';

describe('apiReferencePagination (#361)', () => {
  it('defaults to page 1 / pageSize 10 when params are absent', () => {
    assert.deepEqual(parsePaginationParams(''), { page: 1, pageSize: 10 });
    assert.deepEqual(parsePaginationParams('?q=user'), { page: 1, pageSize: 10 });
  });

  it('parses page and pageSize from the query string', () => {
    assert.deepEqual(parsePaginationParams('?page=3&pageSize=50'), {
      page: 3,
      pageSize: 50,
    });
  });

  it('clamps out-of-range / invalid values', () => {
    assert.deepEqual(parsePaginationParams('?page=0&pageSize=0'), {
      page: 1,
      pageSize: 10,
    });
    assert.deepEqual(parsePaginationParams('?page=-4&pageSize=99999'), {
      page: 1,
      pageSize: 200,
    });
    assert.deepEqual(parsePaginationParams('?page=abc&pageSize=xyz'), {
      page: 1,
      pageSize: 10,
    });
  });

  it('serialises non-default pagination into a query string', () => {
    assert.equal(buildPaginationSearch('', { page: 2, pageSize: 50 }), '?page=2&pageSize=50');
  });

  it('omits default values to keep URLs clean', () => {
    assert.equal(buildPaginationSearch('', { page: 1, pageSize: 10 }), '');
    assert.equal(buildPaginationSearch('?page=5&pageSize=25', { page: 1, pageSize: 10 }), '');
  });

  it('preserves unrelated query params', () => {
    assert.equal(
      buildPaginationSearch('?q=user', { page: 2, pageSize: 10 }),
      '?q=user&page=2',
    );
  });

  it('round-trips: parse(build(x)) === x', () => {
    const params = { page: 7, pageSize: 25 };
    assert.deepEqual(parsePaginationParams(buildPaginationSearch('', params)), params);
  });

  it('deep-links to a specific page', () => {
    // Simulates arriving at ?page=4&pageSize=20 — the component seeds state from this.
    assert.deepEqual(parsePaginationParams('?page=4&pageSize=20'), {
      page: 4,
      pageSize: 20,
    });
  });
});
