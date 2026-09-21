import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { orderNumber, phone } = await req.json();

    if (!orderNumber || !phone) {
      return NextResponse.json({ error: 'يرجى إدخال رقم الطلب ورقم الهاتف' }, { status: 400 });
    }

    // تنظيف رقم الهاتف ورقم الطلب من المسافات الزائدة
    const cleanPhone = phone.trim();
    const cleanNumber = orderNumber.trim().replace('#', '');

    // البحث عن الطلب إما عبر رقم الهاتف المرتبط بحساب العميل أو عبر بيانات الـ Snapshot، ورقم الطلب
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { number: { contains: cleanNumber, mode: 'insensitive' } },
          { id: cleanNumber }
        ],
        AND: [
          {
            OR: [
              { customer: { phone: { contains: cleanPhone } } },
              { customerPhoneSnapshot: { contains: cleanPhone } }
            ]
          }
        ]
      },
      include: {
        customer: { select: { name: true, phone: true } },
        items: { include: { product: true } },
        timeline: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'عذراً، لم يتم العثور على طلب بهذا الرقم مع رقم الهاتف المدخل. تأكد من البيانات واطلب المساعدة.' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Track Order Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء البحث عن الطلب' }, { status: 500 });
  }
}
