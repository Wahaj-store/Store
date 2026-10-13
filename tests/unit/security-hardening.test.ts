import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import { isSameOriginMutation } from '../../lib/csrf';
import { CheckoutPreviewSchema } from '../../lib/checkout-preview-schema';
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyLimited,
} from '../../lib/limited-json-body';
import { hashPassword, verifyPassword } from '../../lib/password';

test('new password hashes use a random salt and verify correctly', async () => {
  const first = await hashPassword('A-strong-password-2026');
  const second = await hashPassword('A-strong-password-2026');

  assert.match(first, /^s2\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('A-strong-password-2026', first), true);
  assert.equal(await verifyPassword('incorrect-password', first), false);
});

test('legacy fixed-salt password hashes remain verifiable during migration', async () => {
  const legacyHash = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt('A-strong-password-2026', 'wahaj-salt', 64, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });

  assert.equal(await verifyPassword('A-strong-password-2026', legacyHash.toString('hex')), true);
  assert.equal(await verifyPassword('incorrect-password', legacyHash.toString('hex')), false);
});

test('CSRF guard compares the complete origin, including scheme', () => {
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;

  try {
    const sameOrigin = new Request('https://shop.example/api/mutate', {
      method: 'POST',
      headers: { origin: 'https://shop.example' },
    });
    const differentScheme = new Request('https://shop.example/api/mutate', {
      method: 'POST',
      headers: { origin: 'http://shop.example' },
    });
    const differentHost = new Request('https://shop.example/api/mutate', {
      method: 'POST',
      headers: { origin: 'https://attacker.example' },
    });
    const sameOriginReferer = new Request('https://shop.example/api/mutate', {
      method: 'POST',
      headers: { referer: 'https://shop.example/account/profile' },
    });
    const noBrowserOrigin = new Request('https://shop.example/api/mutate', { method: 'POST' });
    const crossOriginRead = new Request('https://shop.example/api/read', {
      method: 'GET',
      headers: { origin: 'https://attacker.example' },
    });

    assert.equal(isSameOriginMutation(sameOrigin), true);
    assert.equal(isSameOriginMutation(differentScheme), false);
    assert.equal(isSameOriginMutation(differentHost), false);
    assert.equal(isSameOriginMutation(sameOriginReferer), true);
    assert.equal(isSameOriginMutation(noBrowserOrigin), true);
    assert.equal(isSameOriginMutation(crossOriginRead), true);
  } finally {
    if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
  }
});

test('checkout preview schema preserves valid UI payload and enforces checkout limits', () => {
  const valid = CheckoutPreviewSchema.safeParse({
    items: [{ productId: 'product-id-1', variantId: null, quantity: 2 }],
    couponCode: 'SPRING',
    governorate: 'القاهرة',
    city: 'مدينة نصر',
    phone: '01012345678',
    giftWrap: false,
    ignoredClientField: 'discarded',
  });

  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.items[0].quantity, 2);
    assert.equal(valid.data.couponCode, 'SPRING');
    assert.equal('ignoredClientField' in valid.data, false);
  }

  assert.equal(CheckoutPreviewSchema.safeParse({}).success, true);
  assert.equal(
    CheckoutPreviewSchema.safeParse({ items: [{ productId: 'p1', quantity: 51 }] }).success,
    false,
  );
  assert.equal(
    CheckoutPreviewSchema.safeParse({ items: Array.from({ length: 101 }, (_, index) => ({ productId: `p${index}`, quantity: 1 })) }).success,
    false,
  );
});

test('limited JSON reader parses small bodies and rejects oversized or invalid bodies', async () => {
  const validRequest = new Request('https://shop.example/api/preview', {
    method: 'POST',
    body: JSON.stringify({ items: [] }),
  });
  assert.deepEqual(await readJsonBodyLimited(validRequest, 1024), { items: [] });

  const oversizedRequest = new Request('https://shop.example/api/preview', {
    method: 'POST',
    body: 'x'.repeat(2048),
  });
  await assert.rejects(
    readJsonBodyLimited(oversizedRequest, 1024),
    RequestBodyTooLargeError,
  );

  const invalidRequest = new Request('https://shop.example/api/preview', {
    method: 'POST',
    body: '{broken-json',
  });
  await assert.rejects(readJsonBodyLimited(invalidRequest, 1024), InvalidJsonBodyError);
});
    
