import { Prisma, ReturnStatus } from '@prisma/client';
import { recordInventoryEntry } from '@/lib/inventory';

type Transaction = Prisma.TransactionClient;

const RETURN_TRANSITIONS: Record<ReturnStatus, readonly ReturnStatus[]> = {
  REQUESTED: ['REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['APPROVED', 'RECEIVED', 'REJECTED', 'CANCELLED'],
  REJECTED: ['REJECTED'],
  RECEIVED: ['RECEIVED', 'REFUNDED'],
  REFUNDED: ['REFUNDED'],
  CANCELLED: ['CANCELLED'],
};

export class ReturnStateTransitionError extends Error {
  readonly code = 'INVALID_RETURN_TRANSITION';

  constructor(from: ReturnStatus, to: ReturnStatus) {
    super(`لا يمكن نقل طلب الإرجاع من ${from} إلى ${to}`);
    this.name = 'ReturnStateTransitionError';
  }
}

export function canTransitionReturn(from: ReturnStatus, to: ReturnStatus): boolean {
  return RETURN_TRANSITIONS[from].includes(to);
}

export function assertReturnTransition(from: ReturnStatus, to: ReturnStatus): void {
  if (!canTransitionReturn(from, to)) throw new ReturnStateTransitionError(from, to);
}

export type UpdateReturnStatusInput = {
  returnId: string;
  status: ReturnStatus;
  actorName?: string | null;
  adminNote?: string | null;
};

/** Updates a return request and restocks received items exactly once. */
export async function updateReturnStatus(tx: Transaction, input: UpdateReturnStatusInput) {
  const old = await tx.returnRequest.findUnique({
    where: { id: input.returnId },
    include: {
      order: true,
      items: { include: { orderItem: true } },
    },
  });
  if (!old) throw new Error('طلب الإرجاع غير موجود');
  assertReturnTransition(old.status, input.status);

  const now = new Date();
  const result = await tx.returnRequest.update({
    where: { id: old.id },
    data: {
      status: input.status,
      adminNote: input.adminNote !== undefined ? input.adminNote?.trim() || null : undefined,
      approvedAt: input.status === 'APPROVED' ? old.approvedAt || now : undefined,
      receivedAt: input.status === 'RECEIVED' ? old.receivedAt || now : undefined,
      refundedAt: input.status === 'REFUNDED' ? old.refundedAt || now : undefined,
    },
  });

  if (input.status === 'RECEIVED') {
    for (const item of old.items) {
      if (item.restocked) continue;

      if (item.orderItem.variantId) {
        const variant = await tx.productVariant.update({
          where: { id: item.orderItem.variantId },
          data: { stock: { increment: item.quantity } },
          select: { id: true, stock: true, name: true, value: true, sku: true, productId: true },
        });
        const product = await tx.product.findUnique({
          where: { id: item.orderItem.productId },
          select: { id: true, name: true, sku: true },
        });
        await recordInventoryEntry(tx, {
          productId: item.orderItem.productId,
          variantId: variant.id,
          orderId: old.orderId,
          type: 'RESTOCK',
          quantity: item.quantity,
          balanceAfter: variant.stock,
          productNameSnapshot: product?.name || item.orderItem.name,
          variantNameSnapshot: variant.name,
          variantValueSnapshot: variant.value,
          skuSnapshot: variant.sku || item.orderItem.skuSnapshot || product?.sku,
          reason: `إعادة مخزون مرتجع ${old.number}`,
          reference: old.number,
        });
      } else {
        const product = await tx.product.update({
          where: { id: item.orderItem.productId },
          data: { stock: { increment: item.quantity } },
          select: { id: true, stock: true, name: true, sku: true },
        });
        await recordInventoryEntry(tx, {
          productId: product.id,
          orderId: old.orderId,
          type: 'RESTOCK',
          quantity: item.quantity,
          balanceAfter: product.stock,
          productNameSnapshot: product.name,
          skuSnapshot: product.sku || item.orderItem.skuSnapshot,
          reason: `إعادة مخزون مرتجع ${old.number}`,
          reference: old.number,
        });
      }

      await tx.returnItem.update({
        where: { id: item.id },
        data: { restocked: true, restockedAt: now },
      });
    }
  }

  if (old.status !== input.status) {
    await tx.orderTimeline.create({
      data: {
        orderId: old.orderId,
        status: `RETURN_${input.status}`,
        note: input.adminNote?.trim() || `تم تحديث طلب الإرجاع إلى ${input.status} بواسطة ${input.actorName || 'المسؤول'}`,
      },
    });
  }

  return result;
}
