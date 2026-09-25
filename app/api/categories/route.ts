import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    await prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    })
  );
}
