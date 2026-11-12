import { NextResponse } from 'next/server';
import { Prisma, ShipmentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { rolesFor } from '@/lib/rbac';
import { notifyShipment } from '@/lib/whatsapp';
import { notifyShipmentByEmail } from '@/lib/email';
import { createShipment, updateShipmentStatus } from '@/lib/shipment-service';
import { getClientKey, rateLimit } from '@/lib/rate-limit';
import { createShipmentSchema, updateShipmentSchema } from '@/lib/admin-shipping-schemas';
import {
  InvalidJsonBodyError,
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from '@/lib/limited-json-body';

const MAX_SHIPMENT_BODY_BYTES = 16 * 1024;
const SHIPMENT_ADMIN_RATE_LIMIT = 60;
const SHIPMENT_ADMIN_RATE_WINDOW_MS = 10 * 60 * 1000;

const orderSelect = {
  id: true,
  number: true,
  customerNameSnapshot: true,
  customerPhoneSnapshot: true,
  shippingGovernorate: true,
  shippingCity: true,
  shippingAddress: true,
} as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function checkMutationLimit(req: Request, userId: string) {
  const limit = await rateLimit(
    `admin-shipment-mutation:${userId}:${getClientKey(req)}`,
    SHIPMENT_ADMIN_RATE_LIMIT,
    SHIPMENT_ADMIN_RATE_WINDOW_MS,
  );
  return limit.ok ? null : NextResponse.json(
    { error: 'تم تجاوز عدد محاولات إدارة الشحن. حاول مرة أخرى لاحقًا.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))),
        'Cache-Control': 'no-store',
      },
    },
  );
}

async function logMutation(userId: string, action: string, entityId: string, metadata: object) {
  try {
    await prisma.activityLog.create({
      data: { userId, action, entity: 'Shipment', entityId, metadata: JSON.stringify(metadata) },
    });
  } catch (error) {
    console.error('SHIPMENT_ACTIVITY_LOG_ERROR:', error instanceof Error ? error.message : 'unknown');
  }
}

async function sendShipmentNotifications(shipment: {
  id: string; orderId: string; status: ShipmentStatus; provider: string | null; trackingNumber: string | null;
}) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: shipment.orderId },
      select: {
        id: true, number: true, customerId: true, customerPhoneSnapshot: true,
        customerNameSnapshot: true, customer: { select: { email: true, name: true } },
      },
    });
    if (!order) return;
    const input = {
      id: shipment.id,
      orderId: shipment.orderId,
      orderNumber: order.number,
      customerId: order.customerId,
      phone: order.customerPhoneSnapshot,
      status: shipment.status,
      provider: shipment.provider,
      trackingNumber: shipment.trackingNumber,
    };
    try {
      await notifyShipment(input);
    } catch (error) {
      console.error('SHIPMENT_WHATSAPP_NOTIFICATION_ERROR:', error instanceof Error ? error.message : 'unknown');
    }
    try {
      await notifyShipmentByEmail({
        email: order.customer?.email,
        name: order.customer?.name || order.customerNameSnapshot,
        orderNumber: order.number,
        status: shipment.status,
        provider: shipment.provider,
        trackingNumber: shipment.trackingNumber,
      });
    } catch (error) {
      console.error('SHIPMENT_EMAIL_NOTIFICATION_ERROR:', error instanceof Error ? error.message : 'unknown');
    }
  } catch (error) {
    console.error('SHIPMENT_NOTIFICATION_LOOKUP_ERROR:', error instanceof Error ? error.message : 'unknown');
  }
}

async function readRequestBody(req: Request) {
  try {
    return { body: await readJsonBodyLimited(req, MAX_SHIPMENT_BODY_BYTES) } as const;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return { response: jsonError('حجم الطلب أكبر من المسموح.', 413) } as const;
    if (error instanceof InvalidJsonBodyError) return { response: jsonError('بيانات الطلب غير صالحة.', 400) } as const;
    return { response: jsonError('تعذر قراءة بيانات الطلب.', 400) } as const;
  }
}

export async function GET(req: Request) {
  const user = await requireUser(rolesFor('shippingRead'));
  if (!user) return jsonError('غير مصرح', 403);

  try {
    const url = new URL(req.url);
    const includeOrders = url.searchParams.get('includeOrders') === '1';
    const shipments = await prisma.shipment.findMany({
      include: { order: { select: orderSelect }, events: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    const visibleShipments = user.role === 'VIEWER'
      ? shipments.map(shipment => ({
          ...shipment,
          order: shipment.order ? {
            id: shipment.order.id,
            number: shipment.order.number,
            shippingGovernorate: shipment.order.shippingGovernorate,
            shippingCity: shipment.order.shippingCity,
          } : null,
        }))
      : shipments;

    if (!includeOrders) return NextResponse.json(visibleShipments, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });

    const pendingOrders = await prisma.order.findMany({
      where: { status: { not: 'CANCELLED' }, shipments: { none: {} } },
      select: orderSelect,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const visiblePendingOrders = user.role === 'VIEWER'
      ? pendingOrders.map(order => ({
          id: order.id,
          number: order.number,
          shippingGovernorate: order.shippingGovernorate,
          shippingCity: order.shippingCity,
        }))
      : pendingOrders;
    return NextResponse.json({ shipments: visibleShipments, pendingOrders: visiblePendingOrders }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  } catch (error) {
    console.error('ADMIN_SHIPMENTS_READ_ERROR:', error instanceof Error ? error.message : 'unknown');
    return jsonError('تعذر جلب بيانات الشحن حاليًا.', 500);
  }
}

export async function POST(req: Request) {
  const user = await requireUser(rolesFor('shippingWrite'));
  if (!user) return jsonError('غير مصرح', 403);
  const limited = await checkMutationLimit(req, user.id);
  if (limited) return limited;
  const parsedBody = await readRequestBody(req);
  if ('response' in parsedBody) return parsedBody.response;
  const parsed = createShipmentSchema.safeParse(parsedBody.body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || 'بيانات الشحنة غير صالحة.', 400);
  const body = parsed.data;

  try {
    const order = await prisma.order.findUnique({ where: { id: body.orderId }, select: { id: true, number: true, status: true } });
    if (!order) return jsonError('الطلب غير موجود', 404);
    if (order.status === 'CANCELLED') return jsonError('لا يمكن إنشاء شحنة لطلب ملغى', 400);

    const shipment = await prisma.$transaction(async tx => createShipment(tx, {
      orderId: order.id,
      status: body.status,
      provider: body.provider,
      trackingNumber: body.trackingNumber,
      estimatedMinDays: body.estimatedMinDays,
      estimatedMaxDays: body.estimatedMaxDays,
      notes: body.note || body.notes,
    }), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });

    await logMutation(user.id, 'CREATE_SHIPMENT', shipment.id, { orderId: order.id, status: shipment.status });
    await sendShipmentNotifications(shipment);
    return NextResponse.json(shipment, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
    if (code === 'P2034') return jsonError('حدث تعارض بسبب تحديث متزامن. أعد المحاولة.', 409);
    if (error instanceof Error && error.name === 'ShipmentStateTransitionError') return jsonError(error.message, 409);
    if (error instanceof Error && error.message === 'الطلب غير موجود') return jsonError(error.message, 404);
    console.error('ADMIN_SHIPMENT_CREATE_ERROR:', error instanceof Error ? error.message : 'unknown');
    return jsonError('تعذر إنشاء الشحنة حاليًا.', 500);
  }
}

export async function PUT(req: Request) {
  const user = await requireUser(rolesFor('shippingWrite'));
  if (!user) return jsonError('غير مصرح', 403);
  const limited = await checkMutationLimit(req, user.id);
  if (limited) return limited;
  const parsedBody = await readRequestBody(req);
  if ('response' in parsedBody) return parsedBody.response;
  const parsed = updateShipmentSchema.safeParse(parsedBody.body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || 'بيانات الشحنة غير صالحة.', 400);
  const body = parsed.data;

  try {
    const shipment = await prisma.$transaction(async tx => updateShipmentStatus(tx, {
      shipmentId: body.id,
      status: body.status,
      actorName: user.name || user.email,
      note: body.note,
      provider: body.provider,
      trackingNumber: body.trackingNumber,
    }), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });

    await logMutation(user.id, 'UPDATE_SHIPMENT', shipment.id, { status: shipment.status });
    await sendShipmentNotifications(shipment);
    return NextResponse.json(shipment, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
    if (code === 'P2034') return jsonError('حدث تعارض بسبب تحديث متزامن. أعد المحاولة.', 409);
    if (error instanceof Error && error.name === 'ShipmentStateTransitionError') return jsonError(error.message, 409);
    if (error instanceof Error && error.message === 'الشحنة غير موجودة') return jsonError(error.message, 404);
    console.error('ADMIN_SHIPMENT_UPDATE_ERROR:', error instanceof Error ? error.message : 'unknown');
    return jsonError('تعذر تحديث الشحنة حاليًا.', 500);
  }
}
