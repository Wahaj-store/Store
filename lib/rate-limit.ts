import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { prisma } from '@/lib/prisma';

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  reset: number;
};

let lastCleanupAt = 0;

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const CLEANUP_BATCH_SIZE = 500;
const MIN_SECRET_LENGTH = 32;

function getRateLimitSecret(): string {
  const secret = process.env.RATE_LIMIT_SECRET;

  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error('RATE_LIMIT_SECRET must be configured with at least 32 characters');
  }

  return secret;
}

function hmac(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function rejectedResult(windowMs: number): RateLimitResult {
  return {
    ok: false,
    remaining: 0,
    reset: Date.now() + Math.max(1, windowMs),
  };
}

/**
 * Sliding-window approximation using two adjacent fixed-window buckets.
 *
 * The current bucket is counted fully, and the previous bucket is weighted
 * according to how much of the current window has elapsed. Both buckets are
 * stored in PostgreSQL so limits are shared and atomically incremented across
 * application instances.
 *
 * The backing store fails closed: if PostgreSQL or RATE_LIMIT_SECRET is
 * unavailable, the request is rejected rather than bypassing the limit.
 */
export async function rateLimit(
  key: string,
  limit = 8,
  windowMs = 10 * 60 * 1000,
): Promise<RateLimitResult> {
  if (
    typeof key !== 'string' ||
    key.length === 0 ||
    key.length > 512 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    !Number.isInteger(windowMs) ||
    windowMs < 1_000
  ) {
    return rejectedResult(
      Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000,
    );
  }

  try {
    const secret = getRateLimitSecret();
    const now = Date.now();
    const currentWindowStart = Math.floor(now / windowMs) * windowMs;
    const previousWindowStart = currentWindowStart - windowMs;
    const elapsedInCurrentWindow = now - currentWindowStart;

    // Derive a different opaque database key for each identity and time bucket.
    const currentBucketKey = hmac(
      `${key}\u0000${currentWindowStart}`,
      secret,
    );
    const previousBucketKey = hmac(
      `${key}\u0000${previousWindowStart}`,
      secret,
    );

    // Keep each bucket until it is no longer needed as the previous window.
    const bucketExpiry = new Date(currentWindowStart + 2 * windowMs);

    const currentRows = await prisma.$queryRaw<
      Array<{ count: number; expiresAt: Date }>
    >`
      INSERT INTO "RateLimitBucket" AS current_bucket
        ("keyHash", "count", "expiresAt", "updatedAt")
      VALUES
        (${currentBucketKey}, 1, ${bucketExpiry}, NOW())
      ON CONFLICT ("keyHash") DO UPDATE SET
        "count" = current_bucket."count" + 1,
        "expiresAt" = EXCLUDED."expiresAt",
        "updatedAt" = NOW()
      RETURNING "count", "expiresAt"
    `;

    const currentBucket = currentRows[0];
    if (!currentBucket) {
      throw new Error('Rate-limit storage returned no current bucket');
    }

    const previousRows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT "count"
      FROM "RateLimitBucket"
      WHERE "keyHash" = ${previousBucketKey}
        AND "expiresAt" > NOW()
      LIMIT 1
    `;

    const currentCount = Number(currentBucket.count);
    const previousCount = Number(previousRows[0]?.count ?? 0);

    // The previous window's contribution fades as the current window advances.
    const previousWeight =
      (windowMs - elapsedInCurrentWindow) / windowMs;
    const estimatedSlidingCount =
      currentCount + previousCount * previousWeight;

    // Cleanup is best-effort and does not block the request.
    if (now - lastCleanupAt >= CLEANUP_INTERVAL_MS) {
      lastCleanupAt = now;

      void prisma
        .$executeRaw`
          DELETE FROM "RateLimitBucket"
          WHERE "keyHash" IN (
            SELECT "keyHash"
            FROM "RateLimitBucket"
            WHERE "expiresAt" <= NOW()
            ORDER BY "expiresAt"
            LIMIT ${CLEANUP_BATCH_SIZE}
          )
        `
        .catch(() => undefined);
    }

    return {
      ok: estimatedSlidingCount <= limit,
      remaining: Math.max(
        0,
        Math.floor(limit - estimatedSlidingCount),
      ),
      // Conservative reset estimate; callers can use it for Retry-After.
      reset: new Date(currentBucket.expiresAt).getTime(),
    };
  } catch (error) {
    // Do not log the supplied key, which may contain an account identifier.
    console.error(
      'RATE_LIMIT_STORAGE_ERROR:',
      error instanceof Error ? error.message : 'unknown',
    );

    return rejectedResult(windowMs);
  }
}

/**
 * Use only an address supplied by a trusted deployment proxy.
 * Configure the proxy to overwrite x-real-ip; do not trust client-provided
 * forwarding headers without verifying the proxy's behavior.
 */
export function getClientKey(req: Request): string {
  const trustedIp = req.headers.get('x-real-ip')?.trim();

  if (!trustedIp || isIP(trustedIp) === 0) {
    return 'unknown';
  }

  return trustedIp;
}
