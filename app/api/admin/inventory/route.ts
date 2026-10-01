import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { InventoryLedgerType, Prisma } from '@prisma/client';
import { applyInventoryDelta } from '@/lib/inventory';

export async function GET(req: Request) {
  const auth = await requirePermission('inventoryRead');
  if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status });
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 200);
  const productId = url.searchParams.get('productId') || undefined;
  const variantId = url.searchParams.get('variantId') || undefined;
  const orderId = url.searchParams.get('orderId') || undefined;
  const typeValue = url.searchParams.get('type') || undefined;
  const where: Prisma.InventoryLedgerWhereInput = { productId, variantId, orderId };
  if (typeValue && Object.values(InventoryLedgerType).includes(typeValue as InventoryLedgerType)) {
    where.type = typeValue as InventoryLedgerType;
  }
  const entries = await prisma.inventoryLedger.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, sku: true } },
      variant: { select: { id: true, name: true, value: true, sku: true } },
      order: { select: { id: true, number: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const auth = await requirePermission('inventoryWrite');
  if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status });
  try {
    const body = await req.json();
    const productId = String(body.productId || '');
    const variantId = body.variantId ? String(body.variantId) : null;
    const delta = Number(body.delta);
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : null;
    if (!productId || !Number.isInteger(delta) || delta === 0) return NextResponse.json({ error: 'المنتج وقيمة حركة المخزون مطلوبان' }, { status: 400 });
    if (reason === '') return NextResponse.json({ error: 'سبب الحركة مطلوب' }, { status: 400 });
    const entry = await prisma.$transaction(
      tx => applyInventoryDelta(tx, { productId, variantId, userId: auth.user!.id, type: delta > 0 ? 'RESTOCK' : 'ADJUSTMENT', delta, reason, reference: 'ADMIN_MANUAL_ADJUSTMENT' }),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 },
    );
    await prisma.activityLog.create({ data: { userId: auth.user.id, action: 'INVENTORY_ADJUSTMENT', entity: 'InventoryLedger', entityId: entry.id, metadata: JSON.stringify({ productId, variantId, delta, reason }) } });
    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'تعذر تسجيل حركة المخزون' }, { status: error?.code === 'P2034' ? 409 : 400 });
  }
}
