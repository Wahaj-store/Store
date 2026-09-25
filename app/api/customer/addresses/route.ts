import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // تأكد من مسار الـ prisma client الصحيح في مشروعك
import { cookies } from 'headers'; // أو طريقة التحقق من الجلسة المتبعة لديك في المشروع

export async function GET(req: Request) {
  try {
    // استخراج معرف العميل من الكوكيز أو الجلسة (يتم تعديلها حسب نظام المصادقة المتبع لديك)
    const customerId = cookies().get('customer_id')?.value; // أو استخدام الـ session token

    if (!customerId) {
      return NextResponse.json({ error: 'غير مخول، يرجى تسجيل الدخول' }, { status: 401 });
    }

    const addresses = await prisma.address.findMany({
      where: { customerId },
      orderBy: { isDefault: 'desc' }, // جلب العنوان الأساسي أولاً
    });

    return NextResponse.json(addresses, { status: 200 });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب العناوين' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const customerId = cookies().get('customer_id')?.value;

    if (!customerId) {
      return NextResponse.json({ error: 'غير مخول، يرجى تسجيل الدخول' }, { status: 401 });
    }

    const body = await req.json();
    const { label, name, phone, secondaryPhone, governorate, city, address, notes, isDefault } = body;

    // التحقق من البيانات الأساسية المطلوبة
    if (!governorate || !city || !address) {
      return NextResponse.json({ error: 'جميع حقول العنوان الأساسية مطلوبة' }, { status: 400 });
    }

    // التحقق من شرط الحد الأقصى (3 عناوين كحد أقصى لكل عميل)
    const currentAddressesCount = await prisma.address.count({
      where: { customerId },
    });

    if (currentAddressesCount >= 3) {
      return NextResponse.json({ error: 'عذراً، لا يمكنك إضافة أكثر من 3 عناوين كحد أقصى.' }, { status: 400 });
    }

    // إذا كان هذا العنوان هو الأول للعميل، نجبره تلقائياً ليكون أساسياً
    const shouldBeDefault = currentAddressesCount === 0 ? true : Boolean(isDefault);

    // إذا تم تحديد العنوان الجديد كأسياسي، نقوم بإلغاء صفة الأساسي عن باقي عناوين العميل
    if (shouldBeDefault) {
      await prisma.address.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // إنشاء العنوان الجديد
    const newAddress = await prisma.address.create({
      data: {
        customerId,
        label: label || 'المنزل',
        name,
        phone,
        secondaryPhone,
        governorate,
        city,
        address,
        notes,
        isDefault: shouldBeDefault,
      },
    });

    return NextResponse.json(newAddress, { status: 201 });
  } catch (error) {
    console.error('Error creating address:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حفظ العنوان' }, { status: 500 });
  }
}
