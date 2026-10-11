import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const rows = await prisma.featureFlag.findMany({ select: { key: true, enabled: true } });
    const features = Object.fromEntries(rows.map((row) => [row.key, row.enabled]));
    return NextResponse.json({ features }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch {
    // Fail closed for optional storefront enhancements if flags cannot be read.
    return NextResponse.json({ features: {} }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  }
}
