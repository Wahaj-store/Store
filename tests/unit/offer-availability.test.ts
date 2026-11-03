import assert from 'node:assert/strict';
import test from 'node:test';

import { isOfferAvailableForDisplay, type OfferAvailability } from '../../lib/offer-availability';

const now = new Date('2026-11-03T12:00:00.000Z');
const availableOffer: OfferAvailability = {
  active: true,
  startsAt: null,
  endsAt: null,
  maxUses: null,
  usedCount: 0,
};

test('public offer availability respects active status and inclusive schedule boundaries', () => {
  assert.equal(isOfferAvailableForDisplay(availableOffer, now), true);
  assert.equal(isOfferAvailableForDisplay({ ...availableOffer, active: false }, now), false);
  assert.equal(isOfferAvailableForDisplay({ ...availableOffer, startsAt: new Date(now.getTime() + 1) }, now), false);
  assert.equal(isOfferAvailableForDisplay({ ...availableOffer, startsAt: now }, now), true);
  assert.equal(isOfferAvailableForDisplay({ ...availableOffer, endsAt: new Date(now.getTime() - 1) }, now), false);
  assert.equal(isOfferAvailableForDisplay({ ...availableOffer, endsAt: now }, now), true);
});

test('public offer availability excludes exhausted limits but keeps unlimited offers', () => {
  assert.equal(isOfferAvailableForDisplay({ ...availableOffer, maxUses: 2, usedCount: 1 }, now), true);
  assert.equal(isOfferAvailableForDisplay({ ...availableOffer, maxUses: 2, usedCount: 2 }, now), false);
  assert.equal(isOfferAvailableForDisplay({ ...availableOffer, maxUses: null, usedCount: 999 }, now), true);
});
