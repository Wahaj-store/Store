import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const cookieStore = cookies();
    const customerId = cookieStore.get('customer_id')?.value;

    if (!customerId) {
      return NextResponse.json({ error: 'غير مخول، يرجى تسجيل الدخول' }, { status: 401 });
    }

    const addresses = await prisma.address.findMany({
      where: { customerId },
      orderBy: { isDefault: 'desc' },
    });

    return NextResponse.json(addresses, { status: 200 });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب العناوين' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const customerId = cookieStore.get('customer_id')?.value;

    if (!customerId) {
      return NextResponse.json({ error: 'غير مخول، يرجى تسجيل الدخول' }, { status: 401 });
    }

    const body = await req.json();
    const { label, name, phone, secondaryPhone, governorate, city, address, notes, isDefault } = body;

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

    const shouldBeDefault = currentAddressesCount === 0 ? true : Boolean(isDefault);

    if (shouldBeDefault) {
      await prisma.address.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }

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
