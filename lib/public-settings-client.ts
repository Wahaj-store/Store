export type PublicSettingsPayload = {
  settings?: Record<string, unknown>;
  payments?: unknown[];
  theme?: Record<string, unknown> | null;
};

type LoadOptions = { refresh?: boolean };

const REUSE_WINDOW_MS = 2_000;

let cachedPayload: PublicSettingsPayload | null = null;
let cachedAt = 0;
let pendingRequest: Promise<PublicSettingsPayload | null> | null = null;

/** Share the in-flight settings request between public layout components. */
export function getPublicSettings(
  { refresh = false }: LoadOptions = {},
): Promise<PublicSettingsPayload | null> {
  if (pendingRequest) return pendingRequest;

  if (!refresh && cachedPayload && Date.now() - cachedAt < REUSE_WINDOW_MS) {
    return Promise.resolve(cachedPayload);
  }

  pendingRequest = fetch('/api/settings', { cache: 'no-store' })
    .then(async response => {
      if (!response.ok) return null;
      return await response.json() as PublicSettingsPayload;
    })
    .then(payload => {
      if (payload && typeof payload === 'object') {
        cachedPayload = payload;
        cachedAt = Date.now();
        return payload;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}
