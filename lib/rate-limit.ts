import { prisma } from '@/lib/prisma';
import { hashIdentifier } from '@/lib/security';

type RateLimitResult = { ok: boolean; remaining: number; reset: number };

let lastCleanupAt = 0;
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const CLEANUP_BATCH_SIZE = 500;

/**
 * Shared, atomic fixed-window rate limiting backed by PostgreSQL so limits are
 * consistent across server instances. If the backing store is unavailable,
 * requests fail closed rather than silently bypassing protection.
 */
export async function rateLimit(
  key: string,
  limit = 8,
  windowMs = 10 * 60 * 1000,
): Promise<RateLimitResult> {
  const keyHash = hashIdentifier(key);
  const proposedExpiry = new Date(Date.now() + windowMs);

  try {
    const rows = await prisma.$queryRaw<Array<{ count: number; expiresAt: Date }>>`
      INSERT INTO "RateLimitBucket" AS current_bucket ("keyHash", "count", "expiresAt", "updatedAt")
      VALUES (
        ${keyHash},
        1,
        ${proposedExpiry},
        NOW()
      )
      ON CONFLICT ("keyHash") DO UPDATE SET
        "count" = CASE
          WHEN current_bucket."expiresAt" <= NOW() THEN 1
          ELSE current_bucket."count" + 1
        END,
        "expiresAt" = CASE
          WHEN current_bucket."expiresAt" <= NOW() THEN EXCLUDED."expiresAt"
          ELSE current_bucket."expiresAt"
        END,
        "updatedAt" = NOW()
      RETURNING "count", "expiresAt"
    `;

    const row = rows[0];
    if (!row) throw new Error('Rate-limit storage returned no row');

    const now = Date.now();
    if (now - lastCleanupAt >= CLEANUP_INTERVAL_MS) {
      lastCleanupAt = now;
      void prisma.$executeRaw`
        DELETE FROM "RateLimitBucket"
        WHERE "keyHash" IN (
          SELECT "keyHash"
          FROM "RateLimitBucket"
          WHERE "expiresAt" <= NOW()
          ORDER BY "expiresAt"
          LIMIT ${CLEANUP_BATCH_SIZE}
        )
      `.catch(() => undefined);
    }

    const count = Number(row.count);
    const reset = new Date(row.expiresAt).getTime();
    return { ok: count <= limit, remaining: Math.max(0, limit - count), reset };
  } catch (error) {
    console.error('RATE_LIMIT_STORAGE_ERROR:', error instanceof Error ? error.message : 'unknown');
    return { ok: false, remaining: 0, reset: Date.now() + windowMs };
  }
}

/**
 * Trust only the single-address header that the deployment proxy must set.
 * Do not accept an arbitrary client-supplied X-Forwarded-For chain.
 */
export function getClientKey(req: Request) {
  const trustedIp = req.headers.get('x-real-ip')?.trim();
  return trustedIp ? trustedIp.slice(0, 128) : 'unknown';
}
