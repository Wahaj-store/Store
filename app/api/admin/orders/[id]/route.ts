import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

// 1. جلب تفاصيل الطلب مع خط السير
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const u = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER', 'VIEWER']);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  
  try {
    const o = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        // ⚠️ ملاحظة: إذا لم يكن لديك حقل addresses في موديل Customer، احذف السطر التالي
        customer: { select: { id: true, name: true, phone: true, email: true } }, 
        items: { include: { product: true } },
        payments: true,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });
    
    if (!o) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    return NextResponse.json(o);
  } catch (error: any) {
    console.error('GET Order Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب الطلب: ' + error.message }, { status: 500 });
  }
}

// 2. تحديث حالة الطلب وتسجيلها في OrderTimeline
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER']);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  try {
    const body = await req.json();
    const { status, shippingProvider, trackingNumber, note } = body; 

    if (!status) {
      return NextResponse.json({ error: 'الحالة المطلوبة غير موجودة' }, { status: 400 });
    }

    // التحقق من صحة الحالة باستخدام الـ Enum الخاص بـ Prisma
    const validStatuses = Object.values(OrderStatus);
    if (!validStatuses.includes(status as OrderStatus)) {
      return NextResponse.json({ error: 'حالة الطلب غير صالحة' }, { status: 400 });
    }

    // استخدام Interactive Transaction لضمان الترابط
    const result = await prisma.$transaction(async (tx) => {
      // أولاً: تحديث الطلب
      const updatedOrder = await tx.order.update({
        where: { id: params.id },
        data: {
          status: status as OrderStatus,
          ...(shippingProvider !== undefined ? { shippingProvider } : {}),
          ...(trackingNumber !== undefined ? { trackingNumber } : {}),
        },
      });

      // ثانياً: إضافة السجل في خط سير الطلب (Timeline)
      await tx.orderTimeline.create({
        data: {
          orderId: params.id,
          status,
          note: note || `تم تحديث حالة الطلب إلى ${status} بواسطة ${u.name || u.email || 'المسؤول'}`,
        },
      });

      return updatedOrder;
    });

    return NextResponse.json({ success: true, updatedOrder: result });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء التحديث' }, { status: 500 });
  }
}
