import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 1. جلب تفاصيل الطلب (GET - الموجودة لديك بالفعل)
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const u = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER', 'VIEWER']);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  
  const o = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true, addresses: true } },
      items: { include: { product: true } },
      payments: true,
    },
  });
  
  return o ? NextResponse.json(o) : NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
}

// 2. تحديث حالة الطلب من لوحة التحكم (PATCH - الجديدة)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER']);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  try {
    const body = await req.json();
    const { status } = body; // الحالة الجديدة (مثل: PROCESSING, SHIPPED, DELIVERED)

    if (!status) {
      return NextResponse.json({ error: 'الحالة المطلوبة غير موجودة' }, { status: 400 });
    }

    // تحديث الحالة في قاعدة البيانات
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: { status },
    });

    return NextResponse.json({ success: true, updatedOrder });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء التحديث' }, { status: 500 });
  }
}
