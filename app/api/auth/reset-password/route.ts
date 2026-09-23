import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'جميع البيانات مطلوبة' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer || customer.resetToken !== otp || !customer.resetTokenExpiry || customer.resetTokenExpiry < new Date()) {
      return NextResponse.json({ error: 'رمز التحقق غير صحيح أو انتهت صلاحيته' }, { status: 400 });
    }

    // تشفير كلمة المرور الجديدة
    const hashedPassword = await hashPassword(newPassword);

    // تحديث كلمة المرور ومسح الرمز المستعمل
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إعادة تعيين كلمة المرور' }, { status: 500 });
  }
}
