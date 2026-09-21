import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

const WRITE = ['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER'];

// جلب تفاصيل طلب واحد
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser([...WRITE, 'VIEWER']);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true, addresses: true } },
      items: { include: { product: true } },
      payments: true,
      timeline: { orderBy: { createdAt: 'asc' } }
    }
  });

  if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
  return NextResponse.json(order);
}

// تحديث حالة الطلب (PATCH)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser(WRITE);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  try {
    const b = await req.json();
    const orderId = params.id;

    // التحقق من صحة الحالة
    if (b.status && !Object.values(OrderStatus).includes(b.status)) {
      return NextResponse.json({ error: 'حالة الطلب غير صحيحة' }, { status: 400 });
    }
    if (b.paymentStatus && !Object.values(PaymentStatus).includes(b.paymentStatus)) {
      return NextResponse.json({ error: 'حالة الدفع غير صحيحة' }, { status: 400 });
    }

    const nextStatus = b.status as OrderStatus | undefined;
    const nextPayment = b.paymentStatus as PaymentStatus | undefined;

    const order = await prisma.$transaction(async (tx) => {
      const old = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!old) throw new Error('الطلب غير موجود');

      const status = nextStatus || old.status;
      const paymentStatus = nextPayment || old.paymentStatus;

      if (old.status === 'DELIVERED' && status === 'CANCELLED') {
        throw new Error('لا يمكن إلغاء طلب تم تسليمه');
      }

      // تجهيز البيانات المحدثة
      const data: Prisma.OrderUpdateInput = { status, paymentStatus };
      
      // حفظ بيانات الشحن إذا تم إرسالها
      if (b.shippingProvider) data.shippingProvider = b.shippingProvider;
      if (b.trackingNumber) data.trackingNumber = b.trackingNumber;

      let o = await tx.order.update({ where: { id: orderId }, data });

      // استرجاع المخزون في حالة الإلغاء
      if (status === 'CANCELLED' && old.status !== 'CANCELLED' && !old.stockReleasedAt) {
        for (const item of old.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } }
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } }
            });
          }
        }
        o = await tx.order.update({ where: { id: o.id }, data: { stockReleasedAt: new Date() } });
      }

      // تحديث حالة الدفع
      if (paymentStatus !== old.paymentStatus) {
        await tx.payment.updateMany({
          where: { orderId: o.id },
          data: { status: paymentStatus, confirmedAt: paymentStatus === 'CONFIRMED' ? new Date() : null }
        });
      }

      // 🔴 الجزء الأهم: إضافة السجل في خط سير الطلب (Timeline)
      if (status !== old.status) {
        await tx.orderTimeline.create({
          data: {
            orderId: o.id,
            status,
            note: b.note || `تم تغيير الحالة إلى ${status}` // استخدام الملاحظة المرسلة من لوحة التحكم
          }
        });
      }

      if (paymentStatus !== old.paymentStatus) {
        await tx.orderTimeline.create({
          data: { orderId: o.id, status: `PAYMENT_${paymentStatus}`, note: 'تم تحديث حالة الدفع' }
        });
      }

      return o;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });

    // تسجيل النشاط
    await prisma.activityLog.create({
      data: {
        userId: u.id,
        action: 'UPDATE_ORDER',
        entity: 'Order',
        entityId: order.id,
        metadata: JSON.stringify({ status: b.status, paymentStatus: b.paymentStatus })
      }
    });

    return NextResponse.json(order);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'تعذر تحديث الطلب' },
      { status: e?.code === 'P2034' ? 409 : 400 }
    );
  }
}
