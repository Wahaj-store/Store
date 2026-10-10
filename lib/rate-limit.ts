import { createHmac, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  reset: number;
};

type MemoryBucket = {
  hits: number[];
  lastTouched: number;
  windowMs: number;
};

type UpstashResponse = {
  result?: unknown;
  error?: string;
};

const localBuckets = new Map<string, MemoryBucket>();
const MAX_LOCAL_BUCKETS = 50_000;
const LOCAL_CLEANUP_INTERVAL_MS = 60_000;
const FALLBACK_WARNING_INTERVAL_MS = 60_000;
const MIN_SECRET_LENGTH = 32;

let lastLocalCleanupAt = 0;
let lastFallbackWarningAt = 0;

const RATE_LIMIT_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
local count = tonumber(redis.call('ZCARD', key))

if count >= limit then
  local index = count - limit
  local oldest = redis.call('ZRANGE', key, 0, index, 'WITHSCORES')
  local reset = now + window
  if #oldest >= 2 then
    reset = tonumber(oldest[#oldest]) + window
  end
  return {0, count, reset}
end

redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)

local newCount = count + 1
local reset = now + window
if newCount >= limit then
  local index = newCount - limit
  local oldest = redis.call('ZRANGE', key, 0, index, 'WITHSCORES')
  if #oldest >= 2 then
    reset = tonumber(oldest[#oldest]) + window
  end
end

return {1, newCount, reset}
`;

const CHECK_RATE_LIMIT_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
local count = tonumber(redis.call('ZCARD', key))
local reset = now + window

if count >= limit then
  local index = count - limit
  local oldest = redis.call('ZRANGE', key, 0, index, 'WITHSCORES')
  if #oldest >= 2 then
    reset = tonumber(oldest[#oldest]) + window
  end
  return {0, count, reset}
end

return {1, count, reset}
`;

function getSecret(): string {
  const secret = process.env.RATE_LIMIT_SECRET || process.env.AUTH_SECRET;

  if (secret && secret.length >= MIN_SECRET_LENGTH) return secret;
  if (process.env.NODE_ENV !== 'production') {
    return 'local-development-rate-limit-secret-change-before-production';
  }

  throw new Error('RATE_LIMIT_SECRET must be configured with at least 32 characters');
}

function hmac(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function getBucketKey(key: string, windowMs: number, secret: string): string {
  return `wahaj:rate-limit:v1:${hmac(`${windowMs}\u0000${key}`, secret)}`;
}

function validateArguments(key: string, limit: number, windowMs: number): boolean {
  return (
    typeof key === 'string' &&
    key.length > 0 &&
    key.length <= 512 &&
    Number.isSafeInteger(limit) &&
    limit >= 1 &&
    Number.isSafeInteger(windowMs) &&
    windowMs >= 1_000
  );
}

function safeWindow(windowMs: number): number {
  return Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000;
}

function rejectedResult(windowMs: number): RateLimitResult {
  return {
    ok: false,
    remaining: 0,
    reset: Date.now() + safeWindow(windowMs),
  };
}

function getUpstashConfig(): { url: string; token: string; timeoutMs: number } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) return null;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('UPSTASH_REDIS_REST_URL is not a valid URL');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('UPSTASH_REDIS_REST_URL must use HTTPS');
  }

  const configuredTimeout = Number(process.env.UPSTASH_REDIS_TIMEOUT_MS || 1500);
  const timeoutMs = Number.isFinite(configuredTimeout)
    ? Math.min(10_000, Math.max(250, Math.floor(configuredTimeout)))
    : 1500;

  return { url: parsedUrl.toString(), token, timeoutMs };
}

function warnLocalFallback(reason: string): void {
  const now = Date.now();
  if (now - lastFallbackWarningAt < FALLBACK_WARNING_INTERVAL_MS) return;
  lastFallbackWarningAt = now;
  console.warn(`RATE_LIMIT_LOCAL_FALLBACK: ${reason}`);
}

function cleanupLocalBuckets(now: number): void {
  if (now - lastLocalCleanupAt < LOCAL_CLEANUP_INTERVAL_MS) return;
  lastLocalCleanupAt = now;

  for (const [key, bucket] of localBuckets) {
    const cutoff = now - bucket.windowMs;
    bucket.hits = bucket.hits.filter((timestamp) => timestamp > cutoff);
    if (bucket.hits.length === 0) localBuckets.delete(key);
  }
}

function localResult(
  bucketKey: string,
  limit: number,
  windowMs: number,
  increment: boolean,
): RateLimitResult {
  const now = Date.now();
  cleanupLocalBuckets(now);

  let bucket = localBuckets.get(bucketKey);
  if (bucket && bucket.windowMs !== windowMs) {
    localBuckets.delete(bucketKey);
    bucket = undefined;
  }

  if (!bucket) {
    if (localBuckets.size >= MAX_LOCAL_BUCKETS) {
      warnLocalFallback('local bucket capacity reached; rejecting new bucket');
      return rejectedResult(windowMs);
    }
    bucket = { hits: [], lastTouched: now, windowMs };
    localBuckets.set(bucketKey, bucket);
  }

  const cutoff = now - windowMs;
  bucket.hits = bucket.hits.filter((timestamp) => timestamp > cutoff);
  bucket.lastTouched = now;

  const currentCount = bucket.hits.length;
  const allowed = currentCount < limit;
  if (increment && allowed) bucket.hits.push(now);

  const resultingCount = currentCount + (increment && allowed ? 1 : 0);
  const resetIndex = Math.max(0, resultingCount - limit);
  const reset = resultingCount >= limit && bucket.hits.length > 0
    ? bucket.hits[Math.min(resetIndex, bucket.hits.length - 1)] + windowMs
    : now + windowMs;

  return {
    ok: allowed,
    remaining: Math.max(0, limit - resultingCount),
    reset,
  };
}

async function requestUpstash(
  key: string,
  limit: number,
  windowMs: number,
  increment: boolean,
): Promise<RateLimitResult> {
  const config = getUpstashConfig();
  if (!config) throw new Error('Upstash REST URL or token is not configured');

  const now = Date.now();
  const bucketKey = getBucketKey(key, windowMs, getSecret());
  const script = increment ? RATE_LIMIT_LUA : CHECK_RATE_LIMIT_LUA;
  const command = increment
    ? ['EVAL', script, '1', bucketKey, String(now), String(windowMs), String(limit), randomUUID()]
    : ['EVAL', script, '1', bucketKey, String(now), String(windowMs), String(limit)];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Upstash REST returned HTTP ${response.status}`);
    }

    const payload = (await response.json()) as UpstashResponse;
    if (payload.error) throw new Error('Upstash Redis command failed');

    if (!Array.isArray(payload.result) || payload.result.length < 3) {
      throw new Error('Upstash Redis returned an invalid rate-limit result');
    }

    const allowed = Number(payload.result[0]) === 1;
    const count = Number(payload.result[1]);
    const reset = Number(payload.result[2]);

    if (!Number.isFinite(count) || !Number.isFinite(reset)) {
      throw new Error('Upstash Redis returned non-numeric rate-limit values');
    }

    return {
      ok: allowed,
      remaining: Math.max(0, limit - count),
      reset,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  increment: boolean,
): Promise<RateLimitResult> {
  if (!validateArguments(key, limit, windowMs)) return rejectedResult(windowMs);

  let secret: string;
  try {
    secret = getSecret();
  } catch (error) {
    console.error('RATE_LIMIT_CONFIGURATION_ERROR:', error instanceof Error ? error.message : 'unknown');
    return rejectedResult(windowMs);
  }

  const bucketKey = getBucketKey(key, windowMs, secret);
  const hasUpstashConfig = Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );

  if (hasUpstashConfig) {
    try {
      return await requestUpstash(key, limit, windowMs, increment);
    } catch (error) {
      warnLocalFallback(error instanceof Error ? error.message : 'Upstash request failed');
      return localResult(bucketKey, limit, windowMs, increment);
    }
  }

  warnLocalFallback('Upstash credentials are missing; limits are per-instance only');
  return localResult(bucketKey, limit, windowMs, increment);
}

/** Increments the sliding-window counter when the request is within its limit. */
export async function rateLimit(
  key: string,
  limit = 8,
  windowMs = 10 * 60 * 1000,
): Promise<RateLimitResult> {
  return runRateLimit(key, limit, windowMs, true);
}

/** Reads the current sliding-window count without incrementing it. */
export async function checkRateLimit(
  key: string,
  limit = 8,
  windowMs = 10 * 60 * 1000,
): Promise<RateLimitResult> {
  return runRateLimit(key, limit, windowMs, false);
}

/** Clears a bucket, for example after a successful authentication. */
export async function resetRateLimit(
  key: string,
  windowMs = 10 * 60 * 1000,
): Promise<void> {
  if (!validateArguments(key, 1, windowMs)) return;

  try {
    const secret = getSecret();
    const bucketKey = getBucketKey(key, windowMs, secret);
    const config = getUpstashConfig();

    if (!config) {
      localBuckets.delete(bucketKey);
      warnLocalFallback('Upstash credentials are missing; reset applied to local memory only');
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['DEL', bucketKey]),
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`Upstash REST returned HTTP ${response.status}`);
      const payload = (await response.json()) as UpstashResponse;
      if (payload.error) throw new Error('Upstash Redis delete command failed');
      localBuckets.delete(bucketKey);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const secret = process.env.RATE_LIMIT_SECRET || process.env.AUTH_SECRET;
    if (secret && secret.length >= MIN_SECRET_LENGTH) {
      localBuckets.delete(getBucketKey(key, windowMs, secret));
    }
    warnLocalFallback(error instanceof Error ? error.message : 'Could not reset the rate-limit bucket');
  }
}

/** Accepts only an address supplied by a trusted deployment proxy. */
export function getClientKey(req: Request): string {
  const trustedIp = req.headers.get('x-real-ip')?.trim();
  if (!trustedIp || isIP(trustedIp) === 0) return 'unknown';
  return trustedIp;
}
