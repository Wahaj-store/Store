import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { InventoryLedgerType, Prisma } from '@prisma/client';
import { applyInventoryDelta } from '@/lib/inventory';
import { revalidateShopProducts } from '@/lib/shop-cache';
import { getClientKey, rateLimit } from '@/lib/rate-limit';

const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' };
const MAX_DELTA = 1_000_000;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: PRIVATE_HEADERS });
}

export async function GET(req: Request) {
  const auth = await requirePermission('inventoryRead');
  if (!auth.user) return jsonError('غير مصرح', auth.status);

  const limitResult = await rateLimit(`admin-inventory-read:${auth.user.id}:${getClientKey(req)}`, 120, 10 * 60 * 1000);
  if (!limitResult.ok) {
    return NextResponse.json(
      { error: 'تم تجاوز عدد المحاولات. حاول مرة أخرى لاحقًا.' },
      { status: 429, headers: { ...PRIVATE_HEADERS, 'Retry-After': String(Math.max(1, Math.ceil((limitResult.reset - Date.now()) / 1000))) } },
    );
  }

  try {
    const url = new URL(req.url);
    const rawLimit = url.searchParams.get('limit');
    const parsedLimit = rawLimit === null ? 100 : Number(rawLimit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
      return jsonError('قيمة limit يجب أن تكون عددًا صحيحًا بين 1 و200.', 400);
    }

    const productId = url.searchParams.get('productId') || undefined;
    const variantId = url.searchParams.get('variantId') || undefined;
    const orderId = url.searchParams.get('orderId') || undefined;
    const typeValue = url.searchParams.get('type') || undefined;
    if ([productId, variantId, orderId].some((value) => value && value.length > 191)) {
      return jsonError('معرّف غير صالح.', 400);
    }

    const where: Prisma.InventoryLedgerWhereInput = { productId, variantId, orderId };
    if (typeValue) {
      if (!Object.values(InventoryLedgerType).includes(typeValue as InventoryLedgerType)) {
        return jsonError('نوع حركة المخزون غير صالح.', 400);
      }
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
      take: parsedLimit,
    });

    return NextResponse.json(entries, { headers: PRIVATE_HEADERS });
  } catch (error) {
    console.error('ADMIN_INVENTORY_READ_ERROR:', error instanceof Error ? error.message : 'unknown');
    return jsonError('تعذر جلب حركات المخزون حاليًا.', 500);
  }
}

export async function POST(req: Request) {
  const auth = await requirePermission('inventoryWrite');
  if (!auth.user) return jsonError('غير مصرح', auth.status);

  const limitResult = await rateLimit(`admin-inventory-write:${auth.user.id}:${getClientKey(req)}`, 30, 10 * 60 * 1000);
  if (!limitResult.ok) {
    return NextResponse.json(
      { error: 'تم تجاوز عدد محاولات تعديل المخزون. حاول مرة أخرى لاحقًا.' },
      { status: 429, headers: { ...PRIVATE_HEADERS, 'Retry-After': String(Math.max(1, Math.ceil((limitResult.reset - Date.now()) / 1000))) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('صيغة الطلب غير صالحة.', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError('بيانات الطلب غير صالحة.', 400);
  }

  const input = body as Record<string, unknown>;
  const productId = typeof input.productId === 'string' ? input.productId.trim() : '';
  const variantId = typeof input.variantId === 'string' && input.variantId.trim() ? input.variantId.trim() : null;
  const delta = typeof input.delta === 'number' ? input.delta : Number.NaN;
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';

  if (!productId || productId.length > 191 || (variantId && variantId.length > 191)) {
    return jsonError('معرّف المنتج أو الخيار غير صالح.', 400);
  }
  if (!Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > MAX_DELTA) {
    return jsonError(`قيمة حركة المخزون يجب أن تكون عددًا صحيحًا بين -${MAX_DELTA} و${MAX_DELTA} باستثناء الصفر.`, 400);
  }
  if (!reason || reason.length > 500) {
    return jsonError('سبب الحركة مطلوب ويجب ألا يتجاوز 500 حرف.', 400);
  }

  try {
    const entry = await prisma.$transaction(async (tx) => {
      const inventoryEntry = await applyInventoryDelta(tx, {
        productId,
        variantId,
        userId: auth.user!.id,
        type: delta > 0 ? 'RESTOCK' : 'ADJUSTMENT',
        delta,
        reason,
        reference: 'ADMIN_MANUAL_ADJUSTMENT',
      });

      // Keep the audit event atomic with the stock mutation.
      await tx.activityLog.create({
        data: {
          userId: auth.user!.id,
          action: 'INVENTORY_ADJUSTMENT',
          entity: 'InventoryLedger',
          entityId: inventoryEntry.id,
          metadata: JSON.stringify({ productId, variantId, delta, reason }),
        },
      });
      return inventoryEntry;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 15000,
    });

    revalidateShopProducts();
    return NextResponse.json(entry, { status: 201, headers: PRIVATE_HEADERS });
  } catch (error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
    const message = error instanceof Error ? error.message : '';

    if (code === 'P2034') return jsonError('حدث تعارض بسبب تعديل متزامن للمخزون. أعد المحاولة.', 409);
    if (code === 'P2025') return jsonError('المنتج أو الخيار المحدد غير موجود.', 404);
    if (message === 'المنتج غير موجود' || message === 'الخيار المحدد غير موجود') return jsonError(message, 404);
    if (message.includes('لا يمكن أن يصبح مخزون')) return jsonError(message, 409);
    if (message.includes('غير صالح') || message.includes('عددًا صحيحًا')) return jsonError(message, 400);

    console.error('ADMIN_INVENTORY_WRITE_ERROR:', error instanceof Error ? error.message : 'unknown');
    return jsonError('تعذر تسجيل حركة المخزون حاليًا.', 500);
  }
}
