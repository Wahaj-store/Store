import assert from 'node:assert/strict';
import test from 'node:test';

import { createMaintenanceStatusCache } from '../../lib/maintenance-status-cache';

test('maintenance status cache coalesces concurrent loads and expires on schedule', async () => {
  let now = 0;
  let calls = 0;
  const cache = createMaintenanceStatusCache({
    successTtlMs: 5_000,
    failureTtlMs: 1_000,
    now: () => now,
  });
  const load = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return true;
  };

  const [first, concurrent] = await Promise.all([cache(load), cache(load)]);
  assert.equal(first, true);
  assert.equal(concurrent, true);
  assert.equal(calls, 1);

  assert.equal(await cache(load), true);
  assert.equal(calls, 1);

  now = 5_000;
  assert.equal(await cache(load), true);
  assert.equal(calls, 2);
});

test('failed maintenance settings reads fail open and use a short failure cache', async () => {
  let now = 0;
  let calls = 0;
  const cache = createMaintenanceStatusCache({
    successTtlMs: 5_000,
    failureTtlMs: 1_000,
    now: () => now,
  });

  const failedRead = async () => {
    calls += 1;
    throw new Error('database unavailable');
  };
  assert.equal(await cache(failedRead), false);
  assert.equal(await cache(failedRead), false);
  assert.equal(calls, 1);

  now = 1_000;
  assert.equal(await cache(async () => {
    calls += 1;
    return true;
  }), true);
  assert.equal(calls, 2);
});
