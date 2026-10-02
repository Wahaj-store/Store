import { NextResponse } from 'next/server';
import { Prisma, ReturnReason, ReturnStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { rolesFor } from '@/lib/rbac';
import { recordInventoryEntry } from '@/lib/inventory';
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
    const updated = await prisma.$transaction(async (tx) => {
      const old = await tx.returnRequest.findUnique({ where: { id: body.id }, include: { order: true, items: { include: { orderItem: true } } } });
      if (!old) throw new Error('طلب الإرجاع غير موجود');
      const status = body.status as ReturnStatus;
      if (old.status === 'RECEIVED' && status !== 'REFUNDED') throw new Error('لا يمكن تغيير طلب مستلم إلا إلى مسترد');
      if (old.status === 'REFUNDED' || old.status === 'CANCELLED') throw new Error('لا يمكن تعديل طلب الإرجاع بعد إغلاقه');
      const data: Prisma.ReturnRequestUpdateInput = { status, adminNote: typeof body.adminNote === 'string' ? body.adminNote.trim() || null : undefined, approvedAt: status === 'APPROVED' ? (old.approvedAt || new Date()) : undefined, receivedAt: status === 'RECEIVED' ? (old.receivedAt || new Date()) : undefined, refundedAt: status === 'REFUNDED' ? (old.refundedAt || new Date()) : undefined };
      const result = await tx.returnRequest.update({ where: { id: old.id }, data });
      if (status === 'RECEIVED') {
        for (const item of old.items) {
          if (item.restocked) continue;
          if (item.orderItem.variantId) {
            const variant = await tx.productVariant.update({ where: { id: item.orderItem.variantId }, data: { stock: { increment: item.quantity } }, select: { id: true, stock: true, name: true, value: true, sku: true, productId: true } });
            const product = await tx.product.findUnique({ where: { id: item.orderItem.productId }, select: { id: true, name: true, sku: true } });
            await recordInventoryEntry(tx, { productId: item.orderItem.productId, variantId: variant.id, orderId: old.orderId, type: 'RESTOCK', quantity: item.quantity, balanceAfter: variant.stock, productNameSnapshot: product?.name || item.orderItem.name, variantNameSnapshot: variant.name, variantValueSnapshot: variant.value, skuSnapshot: variant.sku || item.orderItem.skuSnapshot || product?.sku, reason: `إعادة مخزون مرتجع ${old.number}`, reference: old.number });
          } else {
            const product = await tx.product.update({ where: { id: item.orderItem.productId }, data: { stock: { increment: item.quantity } }, select: { id: true, stock: true, name: true, sku: true } });
            await recordInventoryEntry(tx, { productId: product.id, orderId: old.orderId, type: 'RESTOCK', quantity: item.quantity, balanceAfter: product.stock, productNameSnapshot: product.name, skuSnapshot: product.sku || item.orderItem.skuSnapshot, reason: `إعادة مخزون مرتجع ${old.number}`, reference: old.number });
          }
          await tx.returnItem.update({ where: { id: item.id }, data: { restocked: true, restockedAt: new Date() } });
        }
      }
      await tx.orderTimeline.create({ data: { orderId: old.orderId, status: `RETURN_${status}`, note: body.adminNote?.trim() || `تم تحديث طلب الإرجاع إلى ${status}` } });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
    await prisma.activityLog.create({ data: { userId: user.id, action: 'UPDATE_RETURN', entity: 'ReturnRequest', entityId: updated.id, metadata: JSON.stringify({ status: updated.status }) } });
    const notificationOrder = await prisma.order.findUnique({ where: { id: updated.orderId }, select: { id: true, number: true, customerId: true, customerPhoneSnapshot: true, customerNameSnapshot: true, customer: { select: { email: true, name: true } } } });
    if (notificationOrder) {
      await notifyReturn({ id: updated.id, orderId: updated.orderId, orderNumber: notificationOrder.number, customerId: notificationOrder.customerId, phone: notificationOrder.customerPhoneSnapshot, status: updated.status });
      await notifyReturnByEmail({ email: notificationOrder.customer?.email, name: notificationOrder.customer?.name || notificationOrder.customerNameSnapshot, orderNumber: notificationOrder.number, returnNumber: updated.number, status: updated.status });
    }
    return NextResponse.json(updated);
  } catch (e: any) { return NextResponse.json({ error: e?.message || 'تعذر تحديث طلب الإرجاع' }, { status: e?.code === 'P2034' ? 409 : 400 }); }
}
