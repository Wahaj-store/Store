import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomer } from '@/lib/customer-auth';

// تحديث عنوان أو تعيينه كعنوان أساسي
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const c = await getCustomer();
    if (!c) {
      return NextResponse.json({ error: 'غير مخول، يرجى تسجيل الدخول' }, { status: 401 });
    }

    const addressId = params.id;

    // التأكد من أن العنوان يتبع للعميل الحالي
    const existingAddress = await prisma.address.findFirst({
      where: { id: addressId, customerId: c.id },
    });

    if (!existingAddress) {
      return NextResponse.json({ error: 'العنوان غير موجود' }, { status: 404 });
    }

    const body = await req.json();
    const { label, name, phone, secondaryPhone, governorate, city, address, notes, isDefault } = body;

    // إذا طلب تعيينه كعنوان أساسي، نقوم بإلغاء الأساسي عن باقي عناوين العميل
    if (isDefault) {
      await prisma.address.updateMany({
        where: { customerId: c.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: {
        ...(label !== undefined && { label }),
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(secondaryPhone !== undefined && { secondaryPhone }),
        ...(governorate !== undefined && { governorate }),
        ...(city !== undefined && { city }),
        ...(address !== undefined && { address }),
        ...(notes !== undefined && { notes }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json(updatedAddress, { status: 200 });
  } catch (error) {
    console.error('Error updating address:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تحديث العنوان' }, { status: 500 });
  }
}

// حذف عنوان
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const c = await getCustomer();
    if (!c) {
      return NextResponse.json({ error: 'غير مخول، يرجى تسجيل الدخول' }, { status: 401 });
    }

    const addressId = params.id;

    const existingAddress = await prisma.address.findFirst({
      where: { id: addressId, customerId: c.id },
    });

    if (!existingAddress) {
      return NextResponse.json({ error: 'العنوان غير موجود' }, { status: 404 });
    }

    await prisma.address.delete({
      where: { id: addressId },
    });

    // إذا كان العنوان المحذوف هو الأساسي، يمكننا اختيار أول عنوان متبقي وجعله أساسياً تلقائياً
    if (existingAddress.isDefault) {
      const remainingAddress = await prisma.address.findFirst({
        where: { customerId: c.id },
        orderBy: { createdAt: 'asc' },
      });

      if (remainingAddress) {
        await prisma.address.update({
          where: { id: remainingAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ message: 'تم حذف العنوان بنجاح' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting address:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف العنوان' }, { status: 500 });
  }
}
