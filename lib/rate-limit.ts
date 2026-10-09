type Entry = { count: number; reset: number };

const store = new Map<string, Entry>();

export function rateLimit(key: string, limit = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.reset <= now) {
    store.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1, reset: now + windowMs };
  }

  entry.count += 1;
  return {
    ok: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    reset: entry.reset,
  };
}

export function getClientKey(req: Request) {
  // On Vercel/proxies these headers are assigned by the edge. Prefer the
  // single-address header to avoid treating a whole forwarded chain as a key.
  return (
    req.headers.get('x-real-ip')?.trim() ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  ).slice(0, 128);
}
