import { NextResponse } from 'next/server';
import { ReturnReason } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/security';
import { getCustomer } from '@/lib/customer-auth';
import { notifyReturn } from '@/lib/whatsapp';
import { notifyReturnByEmail } from '@/lib/email';
import { readJsonBodyLimited, RequestBodyTooLargeError } from '@/lib/limited-json-body';

const MAX_RETURN_BODY_BYTES = 16 * 1024;
const ReturnRequestBodySchema = z.object({
  orderNumber: z.string().trim().min(1).max(64),
  phone: z.string().trim().min(8).max(32),
  reason: z.nativeEnum(ReturnReason),
  items: z.array(z.object({
    orderItemId: z.string().trim().min(1).max(128),
    quantity: z.number().int().positive().max(100),
  }).strict()).min(1).max(100),
  note: z.string().trim().max(1000).optional(),
}).strict();

export async function GET(req: Request) {
  try {
    const customer = await getCustomer();
    if (!customer) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const number = String(searchParams.get('orderNumber') || '').trim();
    if (!number) return NextResponse.json({ error: 'رقم الطلب مطلوب' }, { status: 400 });

    const order = await prisma.order.findFirst({
      where: { number, customerId: customer.id },
      select: {
        returnRequests: {
          orderBy: { requestedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            number: true,
            status: true,
            reason: true,
            note: true,
            adminNote: true,
            requestedAt: true,
            approvedAt: true,
            receivedAt: true,
            refundedAt: true,
            updatedAt: true,
            items: {
              select: {
                id: true,
                orderItemId: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    return NextResponse.json({ returnRequest: order.returnRequests[0] || null });
  } catch {
    return NextResponse.json({ error: 'تعذر تحميل حالة طلب الإرجاع' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let rawBody: unknown;
  try {
    rawBody = await readJsonBodyLimited(req, MAX_RETURN_BODY_BYTES);
  } catch (error) {
    const oversized = error instanceof RequestBodyTooLargeError;
    return NextResponse.json(
      { error: oversized ? 'حجم الطلب أكبر من المسموح.' : 'بيانات طلب الإرجاع غير صالحة.' },
      { status: oversized ? 413 : 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const parsed = ReturnRequestBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'بيانات طلب الإرجاع غير مكتملة أو غير صالحة.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const body = parsed.data;
  const number = body.orderNumber;
  const phone = normalizePhone(body.phone);
  if (phone.length < 8) {
    return NextResponse.json({ error: 'بيانات طلب الإرجاع غير مكتملة' }, { status: 400 });
  }

  const requested = new Map<string, number>();
  for (const item of body.items) {
    if (requested.has(item.orderItemId)) {
      return NextResponse.json({ error: 'لا يمكن تكرار المنتج في طلب الإرجاع.' }, { status: 400 });
    }
    requested.set(item.orderItemId, item.quantity);
  }

  try {
    const order = await prisma.order.findFirst({
      where: { number, OR: [{ customerPhoneSnapshot: phone }, { customer: { phone } }] },
      include: {
        items: true,
        customer: { select: { email: true, name: true } },
        returnRequests: { where: { status: { in: ['REQUESTED', 'APPROVED', 'RECEIVED'] } } },
      },
    });
    if (!order) return NextResponse.json({ error: 'تعذر العثور على الطلب بهذه البيانات' }, { status: 404 });
    if (order.status !== 'DELIVERED') return NextResponse.json({ error: 'يمكن طلب الإرجاع بعد تسليم الطلب فقط' }, { status: 400 });
    if (order.returnRequests.length) return NextResponse.json({ error: 'يوجد طلب إرجاع مفتوح لهذا الطلب' }, { status: 409 });

    for (const [id, quantity] of requested) {
      const item = order.items.find((orderItem) => orderItem.id === id);
      if (!item || quantity > item.quantity) {
        return NextResponse.json({ error: 'كمية الإرجاع غير صحيحة' }, { status: 400 });
      }
    }

    const requestNumber = `RET-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const created = await prisma.returnRequest.create({
      data: {
        number: requestNumber,
        orderId: order.id,
        reason: body.reason,
        note: body.note || null,
        items: { create: [...requested].map(([orderItemId, quantity]) => ({ orderItemId, quantity })) },
      },
      include: { items: true },
    });
    await prisma.orderTimeline.create({
      data: { orderId: order.id, status: 'RETURN_REQUESTED', note: `تم إنشاء طلب إرجاع ${created.number}` },
    });
    await notifyReturn({
      id: created.id,
      orderId: created.orderId,
      orderNumber: order.number,
      customerId: order.customerId,
      phone: order.customerPhoneSnapshot,
      status: created.status,
    });
    await notifyReturnByEmail({
      email: order.customer?.email,
      name: order.customer?.name || order.customerNameSnapshot,
      orderNumber: order.number,
      returnNumber: created.number,
      status: created.status,
    });
    return NextResponse.json({ ok: true, number: created.number, status: created.status }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'تعذر إنشاء طلب الإرجاع حاليًا.' }, { status: 500 });
  }
}
