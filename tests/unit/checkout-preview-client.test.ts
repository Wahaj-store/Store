import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCheckoutPreviewPayload,
  checkoutTotalsMatch,
} from '../../lib/checkout-preview-client';

test('builds preview payload with the same gift-card field used at checkout', () => {
  const payload = buildCheckoutPreviewPayload({
    items: [{ productId: 'product-1', variantId: 'variant-1', quantity: 2 }],
    giftCardCode: '  WH-123  ',
    governorate: ' القاهرة ',
    city: ' مدينة نصر ',
    phone: '01012345678',
    giftWrap: true,
  });

  assert.deepEqual(payload, {
    items: [{ productId: 'product-1', variantId: 'variant-1', quantity: 2 }],
    giftCardCode: 'WH-123',
    governorate: 'القاهرة',
    city: 'مدينة نصر',
    phone: '01012345678',
    giftWrap: true,
  });
  assert.equal('couponCode' in payload, false);
});

test('compares totals to currency precision and rejects non-finite values', () => {
  assert.equal(checkoutTotalsMatch(125.5, 125.5000000001), true);
  assert.equal(checkoutTotalsMatch(125.5, 125.51), false);
  assert.equal(checkoutTotalsMatch(Number.NaN, 0), false);
});
