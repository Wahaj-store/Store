import { OrderStatus, Prisma } from '@prisma/client';
import { refundGiftCardForOrder } from '@/lib/gift-card';
import { recordInventoryEntry } from '@/lib/inventory';

type Transaction = Prisma.TransactionClient;

const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: ['NEW', 'PROCESSING', 'CANCELLED'],
  PROCESSING: ['PROCESSING', 'SHIPPED', 'CANCELLED'],
  SHIPPED: ['SHIPPED', 'DELIVERED', 'CANCELLED'],
  DELIVERED: ['DELIVERED'],
  CANCELLED: ['CANCELLED'],
};

export class OrderStateTransitionError extends Error {
  readonly code = 'INVALID_ORDER_TRANSITION';

  constructor(from: OrderStatus, to: OrderStatus) {
    super(`لا يمكن نقل الطلب من ${from} إلى ${to}`);
    this.name = 'OrderStateTransitionError';
  }
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) throw new OrderStateTransitionError(from, to);
}

export type UpdateOrderStatusInput = {
  orderId: string;
  status: OrderStatus;
  actorName?: string | null;
  note?: string | null;
  shippingProvider?: string | null;
  trackingNumber?: string | null;
};

/**
 * Updates only the order domain. Call this from an existing transaction.
 * Inventory and gift-card rollback are idempotent through stockReleasedAt.
 */
export async function updateOrderStatus(tx: Transaction, input: UpdateOrderStatusInput) {
  const old = await tx.order.findUnique({
    where: { id: input.orderId },
    include: { items: true },
  });
  if (!old) throw new Error('الطلب غير موجود');

  assertOrderTransition(old.status, input.status);

  const updated = await tx.order.update({
    where: { id: old.id },
    data: {
      status: input.status,
      ...(input.shippingProvider !== undefined ? { shippingProvider: input.shippingProvider } : {}),
      ...(input.trackingNumber !== undefined ? { trackingNumber: input.trackingNumber } : {}),
    },
  });

  if (input.status === 'CANCELLED' && old.status !== 'CANCELLED' && !old.stockReleasedAt) {
    for (const item of old.items) {
      if (item.variantId) {
        const variant = await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
          select: { id: true, stock: true, name: true, value: true, sku: true },
        });
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, sku: true },
        });
        await recordInventoryEntry(tx, {
          productId: item.productId,
          variantId: variant.id,
          orderId: old.id,
          type: 'ORDER_RELEASE',
          quantity: item.quantity,
          balanceAfter: variant.stock,
          productNameSnapshot: product?.name || item.name,
          variantNameSnapshot: variant.name,
          variantValueSnapshot: variant.value,
          skuSnapshot: variant.sku || item.skuSnapshot || product?.sku,
          reason: 'إعادة المخزون عند إلغاء الطلب',
          reference: old.number,
        });
      } else {
        const product = await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
          select: { id: true, stock: true, name: true, sku: true },
        });
        await recordInventoryEntry(tx, {
          productId: product.id,
          orderId: old.id,
          type: 'ORDER_RELEASE',
          quantity: item.quantity,
          balanceAfter: product.stock,
          productNameSnapshot: product.name,
          skuSnapshot: product.sku || item.skuSnapshot,
          reason: 'إعادة المخزون عند إلغاء الطلب',
          reference: old.number,
        });
      }
    }

    await tx.order.update({
      where: { id: old.id },
      data: { stockReleasedAt: new Date() },
    });
    await refundGiftCardForOrder(tx, old);
  }

  if (input.status !== old.status) {
    await tx.orderTimeline.create({
      data: {
        orderId: old.id,
        status: input.status,
        note: input.note?.trim() || `تم تحديث حالة الطلب إلى ${input.status} بواسطة ${input.actorName || 'المسؤول'}`,
      },
    });
  }

  return tx.order.findUnique({ where: { id: old.id } });
}
