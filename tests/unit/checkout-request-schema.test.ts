import assert from 'node:assert/strict';
import test from 'node:test';
import { PaymentMethod } from '@prisma/client';
import { CheckoutRequestSchema } from '../../lib/checkout-request-schema';

const validRequest = {
  name: 'مريم محمد',
  phone: '01012345678',
  governorate: 'القاهرة',
  city: 'مدينة نصر',
  address: 'شارع مثال، مبنى 10',
  paymentMethod: PaymentMethod.COD,
  idempotencyKey: 'd9428888-122b-4a12-a5d4-9e5e7ad4d51a',
  expectedTotal: 1250,
  items: [{ productId: 'product-1', quantity: 1 }],
};

test('accepts a checkout request with an explicit non-negative expected total', () => {
  assert.equal(CheckoutRequestSchema.safeParse(validRequest).success, true);
});

test('rejects checkout requests that omit expectedTotal', () => {
  const { expectedTotal: _expectedTotal, ...requestWithoutExpectedTotal } = validRequest;
  assert.equal(CheckoutRequestSchema.safeParse(requestWithoutExpectedTotal).success, false);
});

test('rejects negative or non-finite expected totals', () => {
  assert.equal(CheckoutRequestSchema.safeParse({ ...validRequest, expectedTotal: -1 }).success, false);
  assert.equal(CheckoutRequestSchema.safeParse({ ...validRequest, expectedTotal: Number.POSITIVE_INFINITY }).success, false);
});
