import assert from 'node:assert/strict';
import test from 'node:test';
import { hasRequiredPaymentReference } from '../../lib/payment-reference';

test('proof-required payment methods require a non-empty server-side transfer reference', () => {
  assert.equal(hasRequiredPaymentReference(true, 'TX-123'), true);
  assert.equal(hasRequiredPaymentReference(true, '  TX-123  '), true);
  assert.equal(hasRequiredPaymentReference(true, ''), false);
  assert.equal(hasRequiredPaymentReference(true, '   '), false);
  assert.equal(hasRequiredPaymentReference(true, undefined), false);
});

test('payments without a proof requirement may omit the transfer reference', () => {
  assert.equal(hasRequiredPaymentReference(false, undefined), true);
  assert.equal(hasRequiredPaymentReference(false, ''), true);
});
