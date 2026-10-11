import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Public, read-only feature flags. Admin mutations remain in /api/admin/features. */
export async function GET() {
  try {
    const rows = await prisma.featureFlag.findMany({ select: { key: true, enabled: true } });
    return NextResponse.json(
      { features: Object.fromEntries(rows.map((row) => [row.key, row.enabled])) },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch {
    // Fail open for storefront availability if the flag store is temporarily unavailable.
    return NextResponse.json({ features: {} }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
