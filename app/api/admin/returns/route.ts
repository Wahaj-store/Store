import { NextResponse } from 'next/server';
import { Prisma, ReturnStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { rolesFor } from '@/lib/rbac';
import { updateReturnStatus } from '@/lib/return-service';
import { notifyReturn } from '@/lib/whatsapp';
import { notifyReturnByEmail } from '@/lib/email';

export async function GET() {
  const user = await requireUser(rolesFor('returnsRead'));
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  return NextResponse.json(await prisma.returnRequest.findMany({ include: { order: { select: { id: true, number: true, customerNameSnapshot: true, customerPhoneSnapshot: true } }, items: { include: { orderItem: true } } }, orderBy: { requestedAt: 'desc' }, take: 100 }));
}

export async function PUT(req: Request) {
  const user = await requireUser(rolesFor('returnsWrite'));
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  try {
    const body = await req.json();
    if (!body.id || !body.status || !Object.values(ReturnStatus).includes(body.status)) return NextResponse.json({ error: 'بيانات الإرجاع غير صحيحة' }, { status: 400 });
    const updated = await prisma.$transaction(async (tx) => updateReturnStatus(tx, {
      returnId: body.id,
      status: body.status as ReturnStatus,
      actorName: user.name || user.email,
      adminNote: typeof body.adminNote === 'string' ? body.adminNote : undefined,
    }), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
    await prisma.activityLog.create({ data: { userId: user.id, action: 'UPDATE_RETURN', entity: 'ReturnRequest', entityId: updated.id, metadata: JSON.stringify({ status: updated.status }) } });
    const notificationOrder = await prisma.order.findUnique({ where: { id: updated.orderId }, select: { id: true, number: true, customerId: true, customerPhoneSnapshot: true, customerNameSnapshot: true, customer: { select: { email: true, name: true } } } });
    if (notificationOrder) {
      await notifyReturn({ id: updated.id, orderId: updated.orderId, orderNumber: notificationOrder.number, customerId: notificationOrder.customerId, phone: notificationOrder.customerPhoneSnapshot, status: updated.status });
      await notifyReturnByEmail({ email: notificationOrder.customer?.email, name: notificationOrder.customer?.name || notificationOrder.customerNameSnapshot, orderNumber: notificationOrder.number, returnNumber: updated.number, status: updated.status });
    }
    return NextResponse.json(updated);
  } catch (e: any) { return NextResponse.json({ error: e?.message || 'تعذر تحديث طلب الإرجاع' }, { status: e?.code === 'P2034' ? 409 : 400 }); }
}
