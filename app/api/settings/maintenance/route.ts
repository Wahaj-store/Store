import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const setting = await prisma.siteSetting.findFirst({
      where: { key: 'maintenance_mode' },
      select: { value: true },
    });
    const value = setting?.value;
    const maintenanceMode = value === 'true' || String(value ?? '').trim().toLowerCase() === 'true';

    return NextResponse.json(
      { maintenanceMode },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'Settings unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}
