import assert from 'node:assert/strict';
import test from 'node:test';
import { can } from '../../lib/rbac';

test('customer details require the customer-read permission', () => {
  assert.equal(can('EDITOR', 'customersRead'), false);
  assert.equal(can('VIEWER', 'customersRead'), true);
  assert.equal(can('ORDER_MANAGER', 'customersRead'), true);
});

test('product relations read requires product-read permission', () => {
  assert.equal(can('ORDER_MANAGER', 'productsRead'), false);
  assert.equal(can('EDITOR', 'productsRead'), true);
  assert.equal(can('VIEWER', 'productsRead'), true);
});

test('product relation mutations remain restricted to product writers', () => {
  assert.equal(can('VIEWER', 'productsWrite'), false);
  assert.equal(can('EDITOR', 'productsWrite'), true);
  assert.equal(can('MANAGER', 'productsWrite'), true);
});
