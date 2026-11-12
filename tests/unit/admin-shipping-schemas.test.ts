import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createShipmentSchema,
  createShippingZoneSchema,
  updateShipmentSchema,
  updateShippingZoneByIdSchema,
  updateShippingZoneSchema,
} from '../../lib/admin-shipping-schemas';

test('shipping zone schemas accept finite non-negative prices and optional threshold', () => {
  assert.equal(createShippingZoneSchema.safeParse({ governorate: 'القاهرة', price: '60', freeAbove: '1000' }).success, true);
  assert.equal(createShippingZoneSchema.safeParse({ governorate: 'القاهرة', price: 0, freeAbove: '' }).success, true);
  assert.equal(updateShippingZoneSchema.safeParse({ id: 'zone-1', active: false }).success, true);
  assert.equal(updateShippingZoneByIdSchema.safeParse({ freeAbove: null }).success, true);
});

test('shipping zone schemas reject negative, non-finite, excessive and malformed prices', () => {
  for (const price of [-1, '-0.01', 'NaN', 'Infinity', 'abc', 1_000_001]) {
    assert.equal(createShippingZoneSchema.safeParse({ governorate: 'القاهرة', price }).success, false, `price ${price} must be rejected`);
    assert.equal(updateShippingZoneSchema.safeParse({ id: 'zone-1', price }).success, false, `price ${price} must be rejected`);
  }
  assert.equal(createShippingZoneSchema.safeParse({ governorate: 'القاهرة', price: null }).success, false);
  assert.equal(createShippingZoneSchema.safeParse({ governorate: 'القاهرة', price: true }).success, false);
  assert.equal(createShippingZoneSchema.safeParse({ governorate: 'القاهرة', price: 60, freeAbove: -1 }).success, false);
  assert.equal(createShippingZoneSchema.safeParse({ governorate: 'القاهرة', price: 60, freeAbove: 'not-a-number' }).success, false);
  assert.equal(createShippingZoneSchema.safeParse({ governorate: 'القاهرة', price: 60, freeAbove: 100_000_000 }).success, false);
  assert.equal(updateShippingZoneByIdSchema.safeParse({}).success, false);
});

test('shipment schemas bound identifiers and strings and enforce consistent delivery estimates', () => {
  const valid = { orderId: 'order-1', provider: 'Courier', trackingNumber: 'TRK-1', status: 'PENDING', estimatedMinDays: 2, estimatedMaxDays: 5, note: 'Ready' };
  assert.equal(createShipmentSchema.safeParse(valid).success, true);
  assert.equal(updateShipmentSchema.safeParse({ id: 'shipment-1', status: 'IN_TRANSIT', note: 'Moving' }).success, true);
  assert.equal(createShipmentSchema.safeParse({ ...valid, estimatedMinDays: -1 }).success, false);
  assert.equal(createShipmentSchema.safeParse({ ...valid, estimatedMinDays: 6, estimatedMaxDays: 5 }).success, false);
  assert.equal(createShipmentSchema.safeParse({ ...valid, trackingNumber: 'x'.repeat(161) }).success, false);
  assert.equal(updateShipmentSchema.safeParse({ id: 'shipment-1', status: 'IN_TRANSIT', provider: 'x'.repeat(121) }).success, false);
  assert.equal(updateShipmentSchema.safeParse({ id: 'shipment-1', status: 'UNKNOWN' }).success, false);
  assert.equal(updateShipmentSchema.safeParse({ id: 'shipment-1', status: 'IN_TRANSIT', unexpected: true }).success, false);
});
