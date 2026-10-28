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

test('role matrix keeps sensitive administration restricted and operational access scoped', () => {
  const roles = ['OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'ORDER_MANAGER', 'VIEWER'];

  for (const role of roles) {
    assert.equal(can(role, 'dashboard'), true, `${role} should access the dashboard`);
  }

  for (const role of ['MANAGER', 'EDITOR', 'ORDER_MANAGER', 'VIEWER']) {
    assert.equal(can(role, 'usersRead'), false, `${role} must not read admin users`);
    assert.equal(can(role, 'usersWrite'), false, `${role} must not manage admin users`);
    assert.equal(can(role, 'settingsRead'), false, `${role} must not read protected settings`);
    assert.equal(can(role, 'settingsWrite'), false, `${role} must not modify protected settings`);
    assert.equal(can(role, 'securityRead'), false, `${role} must not read security logs`);
  }

  assert.equal(can('ORDER_MANAGER', 'ordersWrite'), true);
  assert.equal(can('ORDER_MANAGER', 'inventoryWrite'), false);
  assert.equal(can('EDITOR', 'productsWrite'), true);
  assert.equal(can('EDITOR', 'ordersWrite'), false);
  assert.equal(can('VIEWER', 'ordersRead'), true);
  assert.equal(can('VIEWER', 'ordersWrite'), false);
  assert.equal(can('UNKNOWN_ROLE', 'dashboard'), false);
  assert.equal(can(null, 'dashboard'), false);
});
