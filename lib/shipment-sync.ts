import { OrderStatus, Prisma, ShipmentStatus } from '@prisma/client';

const activeShipmentStatuses: ShipmentStatus[] = ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export async function syncShipmentFromOrderStatus(
  tx: Prisma.TransactionClient,
  orderId: string,
  status: OrderStatus,
  options?: { provider?: string | null; trackingNumber?: string | null; note?: string | null }
) {
  const existing = await tx.shipment.findFirst({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  });

  const provider = options?.provider !== undefined ? options.provider : existing?.provider ?? null;
  const trackingNumber = options?.trackingNumber !== undefined ? options.trackingNumber : existing?.trackingNumber ?? null;

  let requestedStatus: ShipmentStatus | null = null;
  if (status === 'NEW') requestedStatus = 'PENDING';
  if (status === 'PROCESSING') requestedStatus = 'PROCESSING';
  if (status === 'SHIPPED') requestedStatus = 'SHIPPED';
  if (status === 'DELIVERED') requestedStatus = 'DELIVERED';
  if (status === 'CANCELLED') requestedStatus = 'CANCELLED';
  if (!requestedStatus) return existing;

  const rank: Record<ShipmentStatus, number> = {
    PENDING: 0, PROCESSING: 1, SHIPPED: 2, IN_TRANSIT: 3, OUT_FOR_DELIVERY: 4, DELIVERED: 5,
    FAILED: 0, RETURNED: 0, CANCELLED: 0,
  };
  const terminal = new Set<ShipmentStatus>(['DELIVERED', 'RETURNED', 'CANCELLED']);
  const targetStatus: ShipmentStatus = existing
    ? (terminal.has(existing.status) && requestedStatus !== 'DELIVERED' && requestedStatus !== 'CANCELLED'
        ? existing.status
        : rank[requestedStatus] < rank[existing.status] ? existing.status : requestedStatus)
    : requestedStatus;

  const shippedAt = activeShipmentStatuses.includes(targetStatus)
    ? (existing?.shippedAt || new Date())
    : null;
  const deliveredAt = targetStatus === 'DELIVERED'
    ? (existing?.deliveredAt || new Date())
    : null;

  if (!existing) {
    // لا ننشئ شحنة لمجرد أن الطلب أصبح NEW/PROCESSING؛ إنشاء الشحنة يظل من مركز الشحن.
    if (targetStatus === 'PENDING' || targetStatus === 'PROCESSING') return null;

    const created = await tx.shipment.create({
      data: {
        orderId,
        provider,
        trackingNumber,
        status: targetStatus,
        shippedAt,
        deliveredAt,
      },
    });
    await tx.shipmentEvent.create({
      data: {
        shipmentId: created.id,
        status: targetStatus,
        note: options?.note || `تمت مزامنة الشحنة مع حالة الطلب: ${status}`,
      },
    });
    return created;
  }

  const changed = existing.status !== targetStatus || existing.provider !== provider || existing.trackingNumber !== trackingNumber;
  if (!changed) return existing;

  const updated = await tx.shipment.update({
    where: { id: existing.id },
    data: {
      status: targetStatus,
      provider,
      trackingNumber,
      shippedAt,
      deliveredAt,
    },
  });

  await tx.shipmentEvent.create({
    data: {
      shipmentId: updated.id,
      status: targetStatus,
      note: options?.note || `تمت مزامنة الشحنة مع حالة الطلب: ${status}`,
    },
  });

  return updated;
}
