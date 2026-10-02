import { NextResponse } from 'next/server';
import { Prisma, ShipmentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { rolesFor } from '@/lib/rbac';
import { notifyShipment } from '@/lib/whatsapp';

const orderSelect = {
  id: true,
  number: true,
  customerNameSnapshot: true,
  customerPhoneSnapshot: true,
  shippingGovernorate: true,
  shippingCity: true,
  shippingAddress: true,
} as const;

export async function GET(req: Request) {
  const user = await requireUser(rolesFor('shippingRead'));
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const url = new URL(req.url);
  const includeOrders = url.searchParams.get('includeOrders') === '1';

  const shipments = await prisma.shipment.findMany({
    include: { order: { select: orderSelect }, events: { orderBy: { createdAt: 'asc' } } },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  if (!includeOrders) return NextResponse.json(shipments);

  const pendingOrders = await prisma.order.findMany({
    where: {
      status: { not: 'CANCELLED' },
      shipments: { none: {} },
    },
    select: orderSelect,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ shipments, pendingOrders });
}

export async function POST(req: Request) {
  const user = await requireUser(rolesFor('shippingWrite'));
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  try {
    const body = await req.json();
    if (!body.orderId) return NextResponse.json({ error: 'معرّف الطلب مطلوب' }, { status: 400 });
    const order = await prisma.order.findUnique({ where: { id: body.orderId }, select: { id: true, number: true, status: true } });
    if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    if (order.status === 'CANCELLED') return NextResponse.json({ error: 'لا يمكن إنشاء شحنة لطلب ملغى' }, { status: 400 });
    const status = body.status || 'PENDING';
    if (!Object.values(ShipmentStatus).includes(status)) return NextResponse.json({ error: 'حالة الشحنة غير صحيحة' }, { status: 400 });

    const shipment = await prisma.$transaction(async (tx) => {
      const existing = await tx.shipment.findFirst({ where: { orderId: order.id }, select: { id: true } });
      if (existing) throw new Error('يوجد شحنة بالفعل لهذا الطلب');

      const created = await tx.shipment.create({ data: { orderId: order.id, provider: body.provider?.trim() || null, trackingNumber: body.trackingNumber?.trim() || null, status, estimatedMinDays: Number.isInteger(body.estimatedMinDays) ? body.estimatedMinDays : null, estimatedMaxDays: Number.isInteger(body.estimatedMaxDays) ? body.estimatedMaxDays : null, notes: body.notes?.trim() || null, shippedAt: ['SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED'].includes(status) ? new Date() : null, deliveredAt: status === 'DELIVERED' ? new Date() : null } });
      await tx.shipmentEvent.create({ data: { shipmentId: created.id, status, note: body.note?.trim() || 'تم إنشاء الشحنة' } });
      if (['SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY'].includes(status) && order.status !== 'DELIVERED') {
        await tx.order.update({ where: { id: order.id }, data: { status: 'SHIPPED', shippingProvider: created.provider, trackingNumber: created.trackingNumber } });
        await tx.orderTimeline.create({ data: { orderId: order.id, status: 'SHIPPED', note: 'تم إنشاء الشحنة وإسنادها لشركة الشحن' } });
      } else if (status === 'DELIVERED' && order.status !== 'DELIVERED') {
        await tx.order.update({ where: { id: order.id }, data: { status: 'DELIVERED', shippingProvider: created.provider, trackingNumber: created.trackingNumber } });
        await tx.orderTimeline.create({ data: { orderId: order.id, status: 'DELIVERED', note: 'تم إنشاء الشحنة بحالة تم التسليم' } });
      }
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });

    await prisma.activityLog.create({ data: { userId: user.id, action: 'CREATE_SHIPMENT', entity: 'Shipment', entityId: shipment.id, metadata: JSON.stringify({ orderId: order.id, status }) } });
    const notificationOrder = await prisma.order.findUnique({ where: { id: shipment.orderId }, select: { id: true, number: true, customerId: true, customerPhoneSnapshot: true } });
    if (notificationOrder) await notifyShipment({ id: shipment.id, orderId: shipment.orderId, orderNumber: notificationOrder.number, customerId: notificationOrder.customerId, phone: notificationOrder.customerPhoneSnapshot, status: shipment.status, provider: shipment.provider, trackingNumber: shipment.trackingNumber });
    return NextResponse.json(shipment, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e?.message || 'تعذر إنشاء الشحنة' }, { status: 400 }); }
}

export async function PUT(req: Request) {
  const user = await requireUser(rolesFor('shippingWrite'));
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'معرّف الشحنة مطلوب' }, { status: 400 });
    if (!body.status || !Object.values(ShipmentStatus).includes(body.status)) return NextResponse.json({ error: 'حالة الشحنة غير صحيحة' }, { status: 400 });
    const shipment = await prisma.$transaction(async (tx) => {
      const old = await tx.shipment.findUnique({ where: { id: body.id }, include: { order: true } });
      if (!old) throw new Error('الشحنة غير موجودة');
      const status = body.status as ShipmentStatus;
      const updated = await tx.shipment.update({ where: { id: old.id }, data: { status, provider: typeof body.provider === 'string' ? body.provider.trim() || null : undefined, trackingNumber: typeof body.trackingNumber === 'string' ? body.trackingNumber.trim() || null : undefined, notes: typeof body.notes === 'string' ? body.notes.trim() || null : undefined, shippedAt: ['SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED'].includes(status) && !old.shippedAt ? new Date() : undefined, deliveredAt: status === 'DELIVERED' ? (old.deliveredAt || new Date()) : undefined } });
      await tx.shipmentEvent.create({ data: { shipmentId: old.id, status, note: body.note?.trim() || null } });
      const orderStatus = status === 'DELIVERED' ? 'DELIVERED' : ['SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY'].includes(status) ? 'SHIPPED' : status === 'CANCELLED' ? 'CANCELLED' : undefined;
      if (orderStatus && old.order.status !== orderStatus) await tx.order.update({ where: { id: old.orderId }, data: { status: orderStatus as any, shippingProvider: updated.provider, trackingNumber: updated.trackingNumber } });
      await tx.orderTimeline.create({ data: { orderId: old.orderId, status: `SHIPMENT_${status}`, note: body.note?.trim() || `تم تحديث حالة الشحنة إلى ${status}` } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
    await prisma.activityLog.create({ data: { userId: user.id, action: 'UPDATE_SHIPMENT', entity: 'Shipment', entityId: shipment.id, metadata: JSON.stringify({ status: body.status }) } });
    const notificationOrder = await prisma.order.findUnique({ where: { id: shipment.orderId }, select: { id: true, number: true, customerId: true, customerPhoneSnapshot: true } });
    if (notificationOrder) await notifyShipment({ id: shipment.id, orderId: shipment.orderId, orderNumber: notificationOrder.number, customerId: notificationOrder.customerId, phone: notificationOrder.customerPhoneSnapshot, status: shipment.status, provider: shipment.provider, trackingNumber: shipment.trackingNumber });
    return NextResponse.json(shipment);
  } catch (e: any) { return NextResponse.json({ error: e?.message || 'تعذر تحديث الشحنة' }, { status: e?.code === 'P2034' ? 409 : 400 }); }
}
