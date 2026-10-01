import { Prisma } from '@prisma/client';

export type InventoryTx = Prisma.TransactionClient;

export type InventoryEntryType =
  | 'OPENING'
  | 'SALE'
  | 'RESTOCK'
  | 'ADJUSTMENT'
  | 'ORDER_RELEASE';

export async function recordInventoryEntry(
  tx: InventoryTx,
  input: {
    productId?: string | null;
    variantId?: string | null;
    orderId?: string | null;
    userId?: string | null;
    type: InventoryEntryType;
    quantity: number;
    balanceAfter: number;
    productNameSnapshot?: string | null;
    variantNameSnapshot?: string | null;
    variantValueSnapshot?: string | null;
    skuSnapshot?: string | null;
    reason?: string | null;
    reference?: string | null;
  },
) {
  if (!Number.isInteger(input.quantity) || !Number.isInteger(input.balanceAfter) || input.balanceAfter < 0) {
    throw new Error('بيانات حركة المخزون غير صالحة');
  }

  return tx.inventoryLedger.create({
    data: {
      productId: input.productId || null,
      variantId: input.variantId || null,
      orderId: input.orderId || null,
      userId: input.userId || null,
      type: input.type,
      quantity: input.quantity,
      balanceAfter: input.balanceAfter,
      productNameSnapshot: input.productNameSnapshot || null,
      variantNameSnapshot: input.variantNameSnapshot || null,
      variantValueSnapshot: input.variantValueSnapshot || null,
      skuSnapshot: input.skuSnapshot || null,
      reason: input.reason || null,
      reference: input.reference || null,
    },
  });
}

export async function applyInventoryDelta(
  tx: InventoryTx,
  input: {
    productId: string;
    variantId?: string | null;
    orderId?: string | null;
    userId?: string | null;
    type: InventoryEntryType;
    delta: number;
    reason?: string | null;
    reference?: string | null;
  },
) {
  if (!Number.isInteger(input.delta) || input.delta === 0) {
    throw new Error('قيمة حركة المخزون يجب أن تكون عددًا صحيحًا وغير صفري');
  }

  const product = await tx.product.findUnique({
    where: { id: input.productId },
    select: { id: true, name: true, sku: true },
  });
  if (!product) throw new Error('المنتج غير موجود');

  if (input.variantId) {
    const variant = await tx.productVariant.findUnique({
      where: { id: input.variantId },
      select: { id: true, stock: true, name: true, value: true, sku: true, productId: true },
    });
    if (!variant || variant.productId !== input.productId) throw new Error('الخيار المحدد غير موجود');
    const balanceAfter = variant.stock + input.delta;
    if (balanceAfter < 0) throw new Error('لا يمكن أن يصبح مخزون الخيار سالبًا');

    await tx.productVariant.update({ where: { id: variant.id }, data: { stock: balanceAfter } });
    return recordInventoryEntry(tx, {
      ...input,
      quantity: input.delta,
      balanceAfter,
      productNameSnapshot: product.name,
      variantNameSnapshot: variant.name,
      variantValueSnapshot: variant.value,
      skuSnapshot: variant.sku || product.sku,
    });
  }

  const current = await tx.product.findUnique({
    where: { id: input.productId },
    select: { stock: true },
  });
  if (!current) throw new Error('المنتج غير موجود');
  const balanceAfter = current.stock + input.delta;
  if (balanceAfter < 0) throw new Error('لا يمكن أن يصبح مخزون المنتج سالبًا');

  await tx.product.update({ where: { id: input.productId }, data: { stock: balanceAfter } });
  return recordInventoryEntry(tx, {
    ...input,
    quantity: input.delta,
    balanceAfter,
    productNameSnapshot: product.name,
    skuSnapshot: product.sku,
  });
}
