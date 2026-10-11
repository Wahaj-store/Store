'use client';
import { useEffect, useState } from 'react';

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

export function useFeatureFlags() {
  const [flags, setFlags] = useState<Record<string, boolean>>(defaults);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    fetch('/api/features', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!active || !payload?.features) return;
        setFlags((current) => ({ ...current, ...payload.features }));
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  return { flags, loaded };
}
