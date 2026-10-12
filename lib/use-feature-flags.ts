'use client';

import { useCallback, useEffect, useState } from 'react';

const defaults: Record<string, boolean> = {
  dark_mode: true,
  quick_view: true,
  recently_viewed: true,
  cart_drawer: true,
  gift_wrap: false,
  smart_recommendations: true,
  newsletter: true,
  abandoned_cart: false,
};

const CACHE_TTL_MS = 60_000;
let cachedFlags: Record<string, boolean> | null = null;
let cachedAt = 0;
let flagsRequest: Promise<Record<string, boolean>> | null = null;

function loadFeatureFlags(): Promise<Record<string, boolean>> {
  if (cachedFlags && Date.now() - cachedAt < CACHE_TTL_MS) {
    return Promise.resolve(cachedFlags);
  }
  if (!flagsRequest) {
    flagsRequest = fetch('/api/features', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const received = payload?.features && typeof payload.features === 'object'
          ? payload.features as Record<string, unknown>
          : {};
        const valid = Object.fromEntries(
          Object.entries(received).filter(([, value]) => typeof value === 'boolean'),
        ) as Record<string, boolean>;
        cachedFlags = { ...defaults, ...valid };
        cachedAt = Date.now();
        return cachedFlags;
      })
      .catch(() => ({ ...defaults }))
      .finally(() => { flagsRequest = null; });
  }
  return flagsRequest;
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<Record<string, boolean>>(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    loadFeatureFlags().then((value) => {
      if (!active) return;
      setFlags(value);
      setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  const enabled = useCallback((key: string, fallback = false) => {
    return Object.prototype.hasOwnProperty.call(flags, key) ? Boolean(flags[key]) : fallback;
  }, [flags]);

  return { flags, loaded, enabled };
}
