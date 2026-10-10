import { OrderStatus, Prisma, ShipmentStatus } from '@prisma/client';
import { assertOrderTransition } from '@/lib/order-service';

type Transaction = Prisma.TransactionClient;

const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
  PENDING: ['PENDING', 'PROCESSING', 'SHIPPED', 'FAILED', 'CANCELLED'],
  PROCESSING: ['PROCESSING', 'SHIPPED', 'FAILED', 'CANCELLED'],
  SHIPPED: ['SHIPPED', 'IN_TRANSIT', 'FAILED', 'RETURNED', 'CANCELLED'],
  IN_TRANSIT: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'FAILED', 'RETURNED'],
  OUT_FOR_DELIVERY: ['OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED'],
  DELIVERED: ['DELIVERED'],
  FAILED: ['FAILED', 'PROCESSING', 'CANCELLED'],
  RETURNED: ['RETURNED'],
  CANCELLED: ['CANCELLED'],
};

export class ShipmentStateTransitionError extends Error {
  readonly code = 'INVALID_SHIPMENT_TRANSITION';

  constructor(from: ShipmentStatus, to: ShipmentStatus) {
    super(`لا يمكن نقل الشحنة من ${from} إلى ${to}`);
    this.name = 'ShipmentStateTransitionError';
  }
}

export function canTransitionShipment(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return SHIPMENT_TRANSITIONS[from].includes(to);
}

export function assertShipmentTransition(from: ShipmentStatus, to: ShipmentStatus): void {
  if (!canTransitionShipment(from, to)) throw new ShipmentStateTransitionError(from, to);
}

export type CreateShipmentInput = {
  orderId: string;
  provider?: string | null;
  trackingNumber?: string | null;
  estimatedMinDays?: number | null;
  estimatedMaxDays?: number | null;
  notes?: string | null;
};

export async function createShipment(tx: Transaction, input: CreateShipmentInput) {
  const order = await tx.order.findUnique({ where: { id: input.orderId }, select: { id: true } });
  if (!order) throw new Error('الطلب غير موجود');

  const existing = await tx.shipment.findFirst({
    where: { orderId: input.orderId },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) return existing;

  const shipment = await tx.shipment.create({
    data: {
      orderId: input.orderId,
      provider: input.provider?.trim() || null,
      trackingNumber: input.trackingNumber?.trim() || null,
      estimatedMinDays: input.estimatedMinDays ?? null,
      estimatedMaxDays: input.estimatedMaxDays ?? null,
      notes: input.notes?.trim() || null,
      status: 'PENDING',
    },
  });

  await tx.shipmentEvent.create({
    data: {
      shipmentId: shipment.id,
      status: 'PENDING',
      note: input.notes?.trim() || 'تم إنشاء الشحنة',
    },
  });

  return shipment;
}

export type UpdateShipmentStatusInput = {
  shipmentId: string;
  status: ShipmentStatus;
  actorName?: string | null;
  note?: string | null;
  provider?: string | null;
  trackingNumber?: string | null;
};

/** Updates a shipment and synchronizes only the safe parent Order milestones. */
export async function updateShipmentStatus(tx: Transaction, input: UpdateShipmentStatusInput) {
  const current = await tx.shipment.findUnique({ where: { id: input.shipmentId } });
  if (!current) throw new Error('الشحنة غير موجودة');
  assertShipmentTransition(current.status, input.status);

  const provider = input.provider !== undefined ? input.provider?.trim() || null : current.provider;
  const trackingNumber = input.trackingNumber !== undefined ? input.trackingNumber?.trim() || null : current.trackingNumber;
  const now = new Date();
  const updated = await tx.shipment.update({
    where: { id: current.id },
    data: {
      status: input.status,
      provider,
      trackingNumber,
      shippedAt: ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(input.status)
        ? current.shippedAt || now
        : current.shippedAt,
      deliveredAt: input.status === 'DELIVERED' ? current.deliveredAt || now : current.deliveredAt,
    },
  });

  if (current.status !== input.status || current.provider !== provider || current.trackingNumber !== trackingNumber) {
    await tx.shipmentEvent.create({
      data: {
        shipmentId: updated.id,
        status: input.status,
        note: input.note?.trim() || `تم تحديث حالة الشحنة إلى ${input.status} بواسطة ${input.actorName || 'المسؤول'}`,
      },
    });
  }

  const order = await tx.order.findUnique({ where: { id: current.orderId }, select: { id: true, status: true } });
  if (order && input.status === 'DELIVERED' && order.status !== 'DELIVERED') {
    assertOrderTransition(order.status, OrderStatus.DELIVERED);
    await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.DELIVERED } });
    await tx.orderTimeline.create({
      data: {
        orderId: order.id,
        status: OrderStatus.DELIVERED,
        note: input.note?.trim() || 'تم التسليم تلقائيًا بعد اكتمال حالة الشحنة',
      },
    });
  } else if (order && ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(input.status) && order.status !== 'SHIPPED') {
    assertOrderTransition(order.status, OrderStatus.SHIPPED);
    await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.SHIPPED, shippingProvider: provider, trackingNumber } });
    await tx.orderTimeline.create({
      data: {
        orderId: order.id,
        status: OrderStatus.SHIPPED,
        note: input.note?.trim() || 'تم شحن الطلب تلقائيًا بعد تحديث حالة الشحنة',
      },
    });
  }

  return updated;
}
