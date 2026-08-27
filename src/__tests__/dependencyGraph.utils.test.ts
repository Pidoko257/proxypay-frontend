import test from 'node:test';
import assert from 'node:assert/strict';
import {
  operationSlug,
  tagSlug,
  apiReferenceUrlFor,
  nodeTooltip,
  API_REFERENCE_BASE,
} from '../components/dependencyGraph.utils.ts';

const node = {
  id: 'get-payment',
  label: 'GET /payments/{id}',
  method: 'GET',
  group: 'Payments',
};

test('operationSlug derives a redoc-style operation anchor', () => {
  assert.equal(operationSlug(node), 'get-payments-id');
  assert.equal(
    operationSlug({ ...node, label: 'POST /wallets/{id}/convert', method: 'POST' }),
    'post-wallets-id-convert',
  );
});

test('tagSlug slugifies a group name', () => {
  assert.equal(tagSlug('Mobile Money'), 'mobile-money');
});

test('apiReferenceUrlFor points at the API reference operation anchor', () => {
  assert.equal(
    apiReferenceUrlFor(node),
    `${API_REFERENCE_BASE}#operation/get-payments-id`,
  );
});

test('apiReferenceUrlFor honours a custom base path', () => {
  assert.equal(
    apiReferenceUrlFor(node, '/docs/api'),
    '/docs/api#operation/get-payments-id',
  );
});

test('nodeTooltip mentions the group, relationship count and click hint', () => {
  const tip = nodeTooltip({ ...node, critical: true }, 3);
  assert.match(tip, /GET \/payments\/\{id\}/);
  assert.match(tip, /Payments/);
  assert.match(tip, /3 dependencies/);
  assert.match(tip, /critical path/);
  assert.match(tip, /API reference/i);
});

test('nodeTooltip uses singular for a single dependency', () => {
  assert.match(nodeTooltip(node, 1), /1 dependency/);
});
