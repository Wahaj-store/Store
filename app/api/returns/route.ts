import { NextResponse } from 'next/server';
import { ReturnReason } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/security';
import { getCustomer } from '@/lib/customer-auth';
import { notifyReturn } from '@/lib/whatsapp';
import { notifyReturnByEmail } from '@/lib/email';


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
  try {
    const body = await req.json();
    const number = String(body.orderNumber || '').trim();
    const phone = normalizePhone(String(body.phone || '').trim());
    const reason = String(body.reason || '').trim() as ReturnReason;
    if (!number || phone.length < 8 || !Object.values(ReturnReason).includes(reason)) return NextResponse.json({ error: 'بيانات طلب الإرجاع غير مكتملة' }, { status: 400 });
    const order = await prisma.order.findFirst({ where: { number, OR: [{ customerPhoneSnapshot: phone }, { customer: { phone } }] }, include: { items: true, customer: { select: { email: true, name: true } }, returnRequests: { where: { status: { in: ['REQUESTED','APPROVED','RECEIVED'] } } } } });
    if (!order) return NextResponse.json({ error: 'تعذر العثور على الطلب بهذه البيانات' }, { status: 404 });
    if (order.status !== 'DELIVERED') return NextResponse.json({ error: 'يمكن طلب الإرجاع بعد تسليم الطلب فقط' }, { status: 400 });
    if (order.returnRequests.length) return NextResponse.json({ error: 'يوجد طلب إرجاع مفتوح لهذا الطلب' }, { status: 409 });
    const items = Array.isArray(body.items) ? body.items : [];
    const requested = new Map<string, number>();
    for (const x of items) { const id = String(x?.orderItemId || ''); const q = Number(x?.quantity); if (id && Number.isInteger(q) && q > 0) requested.set(id, q); }
    if (!requested.size) return NextResponse.json({ error: 'اختر منتجًا واحدًا على الأقل للإرجاع' }, { status: 400 });
    for (const [id, qty] of requested) { const item = order.items.find(x => x.id === id); if (!item || qty > item.quantity) return NextResponse.json({ error: 'كمية الإرجاع غير صحيحة' }, { status: 400 }); }
    const requestNumber = `RET-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const created = await prisma.returnRequest.create({ data: { number: requestNumber, orderId: order.id, reason, note: typeof body.note === 'string' ? body.note.trim().slice(0, 1000) || null : null, items: { create: [...requested].map(([orderItemId, quantity]) => ({ orderItemId, quantity })) } }, include: { items: true } });
    await prisma.orderTimeline.create({ data: { orderId: order.id, status: 'RETURN_REQUESTED', note: `تم إنشاء طلب إرجاع ${created.number}` } });
    await notifyReturn({ id: created.id, orderId: created.orderId, orderNumber: order.number, customerId: order.customerId, phone: order.customerPhoneSnapshot, status: created.status });
    await notifyReturnByEmail({ email: order.customer?.email, name: order.customer?.name || order.customerNameSnapshot, orderNumber: order.number, returnNumber: created.number, status: created.status });
    return NextResponse.json({ ok: true, number: created.number, status: created.status }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e?.message || 'تعذر إنشاء طلب الإرجاع' }, { status: 400 }); }
}
