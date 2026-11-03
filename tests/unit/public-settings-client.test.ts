import assert from 'node:assert/strict';
import test from 'node:test';

import { getPublicSettings } from '../../lib/public-settings-client';

test('public settings client deduplicates concurrent requests and reuses the short-lived result', async () => {
  const originalFetch = globalThis.fetch;
  const payload = {
    settings: { store_name: 'وهج' },
    payments: [],
    theme: { primaryColor: '#171513' },
  };
  let calls = 0;
  let requestCache: RequestCache | undefined;

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    calls += 1;
    requestCache = init?.cache;
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const [first, second] = await Promise.all([
      getPublicSettings(),
      getPublicSettings(),
    ]);

    assert.equal(calls, 1);
    assert.equal(requestCache, 'no-store');
    assert.deepEqual(first, payload);
    assert.deepEqual(second, payload);

    const reused = await getPublicSettings();
    assert.equal(calls, 1);
    assert.deepEqual(reused, payload);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
