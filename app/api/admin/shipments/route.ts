import { NextResponse } from 'next/server';
import { Prisma, ShipmentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { rolesFor } from '@/lib/rbac';
import { notifyShipment } from '@/lib/whatsapp';
import { notifyShipmentByEmail } from '@/lib/email';
import { createShipment, updateShipmentStatus } from '@/lib/shipment-service';

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

    const shipment = await prisma.$transaction(async (tx) => createShipment(tx, {
      orderId: order.id,
      status,
      provider: body.provider,
      trackingNumber: body.trackingNumber,
      estimatedMinDays: Number.isInteger(body.estimatedMinDays) ? body.estimatedMinDays : null,
      estimatedMaxDays: Number.isInteger(body.estimatedMaxDays) ? body.estimatedMaxDays : null,
      notes: body.note || body.notes,
    }), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });

    await prisma.activityLog.create({ data: { userId: user.id, action: 'CREATE_SHIPMENT', entity: 'Shipment', entityId: shipment.id, metadata: JSON.stringify({ orderId: order.id, status }) } });
    const notificationOrder = await prisma.order.findUnique({ where: { id: shipment.orderId }, select: { id: true, number: true, customerId: true, customerPhoneSnapshot: true, customerNameSnapshot: true, customer: { select: { email: true, name: true } } } });
    if (notificationOrder) await notifyShipment({ id: shipment.id, orderId: shipment.orderId, orderNumber: notificationOrder.number, customerId: notificationOrder.customerId, phone: notificationOrder.customerPhoneSnapshot, status: shipment.status, provider: shipment.provider, trackingNumber: shipment.trackingNumber });
    if (notificationOrder) await notifyShipmentByEmail({ email: notificationOrder.customer?.email, name: notificationOrder.customer?.name || notificationOrder.customerNameSnapshot, orderNumber: notificationOrder.number, status: shipment.status, provider: shipment.provider, trackingNumber: shipment.trackingNumber });
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
    const shipment = await prisma.$transaction(async (tx) => updateShipmentStatus(tx, {
      shipmentId: body.id,
      status: body.status as ShipmentStatus,
      actorName: user.name || user.email,
      note: typeof body.note === 'string' ? body.note : undefined,
      provider: typeof body.provider === 'string' ? body.provider : undefined,
      trackingNumber: typeof body.trackingNumber === 'string' ? body.trackingNumber : undefined,
    }), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });

    await prisma.activityLog.create({ data: { userId: user.id, action: 'UPDATE_SHIPMENT', entity: 'Shipment', entityId: shipment.id, metadata: JSON.stringify({ status: body.status }) } });
    const notificationOrder = await prisma.order.findUnique({ where: { id: shipment.orderId }, select: { id: true, number: true, customerId: true, customerPhoneSnapshot: true, customerNameSnapshot: true, customer: { select: { email: true, name: true } } } });
    if (notificationOrder) await notifyShipment({ id: shipment.id, orderId: shipment.orderId, orderNumber: notificationOrder.number, customerId: notificationOrder.customerId, phone: notificationOrder.customerPhoneSnapshot, status: shipment.status, provider: shipment.provider, trackingNumber: shipment.trackingNumber });
    if (notificationOrder) await notifyShipmentByEmail({ email: notificationOrder.customer?.email, name: notificationOrder.customer?.name || notificationOrder.customerNameSnapshot, orderNumber: notificationOrder.number, status: shipment.status, provider: shipment.provider, trackingNumber: shipment.trackingNumber });
    return NextResponse.json(shipment);
  } catch (e: any) { return NextResponse.json({ error: e?.message || 'تعذر تحديث الشحنة' }, { status: e?.code === 'P2034' ? 409 : 400 }); }
}
