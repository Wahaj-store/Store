import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export async function GET() {
  const auth = await requirePermission('customersRead');
  if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { orders: true, reviews: true } },
      orders: { select: { total: true, status: true }, orderBy: { createdAt: 'desc' }, take: 5 },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json(customers, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
