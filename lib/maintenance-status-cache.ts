type CacheOptions = {
  successTtlMs?: number;
  failureTtlMs?: number;
  now?: () => number;
};

/**
 * Cache the global maintenance switch in a warm middleware isolate and coalesce
 * concurrent misses so a burst does not fan out into repeated settings requests.
 */
export function createMaintenanceStatusCache(options: CacheOptions = {}) {
  const successTtlMs = options.successTtlMs ?? 5_000;
  const failureTtlMs = options.failureTtlMs ?? 1_000;
  const now = options.now ?? Date.now;

  let cached: { enabled: boolean; expiresAt: number } | null = null;
  let pending: Promise<boolean> | null = null;

  return async (load: () => Promise<boolean>): Promise<boolean> => {
    const currentTime = now();
    if (cached && cached.expiresAt > currentTime) return cached.enabled;
    if (pending) return pending;

    let request: Promise<boolean>;
    request = Promise.resolve()
      .then(load)
      .then(
        (enabled) => {
          cached = { enabled, expiresAt: now() + successTtlMs };
          return enabled;
        },
        () => {
          cached = { enabled: false, expiresAt: now() + failureTtlMs };
          return false;
        },
      )
      .finally(() => {
        if (pending === request) pending = null;
      });
    pending = request;
    return request;
  };
            }
